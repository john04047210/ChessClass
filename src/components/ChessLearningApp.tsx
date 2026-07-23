"use client";

import { Chess, type Move, type Square } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BeginnerOpponentEngine } from "@/lib/chess/beginner-opponent-engine";
import { GrowingOpponentEngine } from "@/lib/chess/growing-opponent-engine";
import { legalMoves, statusOf, toMoveRecord } from "@/lib/chess/game-controller";
import { StockfishOpponentEngine } from "@/lib/chess/stockfish-opponent-engine";
import { LocalCoachService, ruleForMove } from "@/lib/coach/local-coach-service";
import { analysisText, moveSentence, newMessage, thinkingText } from "@/lib/conversation/message-builders";
import type { Messages } from "@/lib/i18n/messages";
import { createUuid } from "@/lib/id";
import { clearProfile, createProfile, loadProfile, saveProfile } from "@/lib/player/storage";
import type { CoachMode, CoachRequest, CoachResponse, ConversationMessage, EngineAnalysisSnapshot, GameHistoryNode, OpponentEngineId, PlayerGender, PlayerProfile, PromotionPiece, RequestedDetail, SupportedLocale } from "@/lib/types";
import { ChessBoard } from "./ChessBoard";
import { Avatar } from "./Avatar";
import { LearningReferenceDialog } from "./LearningReferenceDialog";
import { referenceContent } from "@/lib/learning/reference-content";
import { ConversationPanel } from "./conversation/ConversationPanel";
import { WelcomeDialog } from "./WelcomeDialog";

const TIMELINE_LIMIT = 101;

function newGame(profile: PlayerProfile): PlayerProfile {
  const gameId = createUuid();
  const chess = new Chess(); const turnId = createUuid();
  const firstNode: GameHistoryNode = { fen:chess.fen(), pgn:"", turnId, conversationMessageCount:0 };
  return { ...profile, currentGame: { gameId, fen:chess.fen(), pgn:"", startedAt:new Date().toISOString(), turnId, conversationMessages:[], timeline:{nodes:[firstNode],cursor:0} } };
}

function gameFrom(profile: PlayerProfile): Chess {
  const chess = new Chess();
  const pgn = profile.currentGame?.pgn;
  if (pgn) { try { chess.loadPgn(pgn); return chess; } catch { /* use FEN */ } }
  try { return new Chess(profile.currentGame?.fen); } catch { return new Chess(); }
}
function visibleConversation(profile:PlayerProfile){const game=profile.currentGame,all=game?.conversationMessages||[];const timeline=game?.timeline;if(!timeline)return all;return all.slice(0,timeline.nodes[timeline.cursor]?.conversationMessageCount??all.length);}
function latestAnalysis(items:ConversationMessage[]){return [...items].reverse().find(item=>item.engineAnalysis)?.engineAnalysis||null;}
function refreshMoveMessages(profile:PlayerProfile,locale:SupportedLocale):PlayerProfile{const game=profile.currentGame;if(!game?.conversationMessages)return profile;return{...profile,currentGame:{...game,conversationMessages:game.conversationMessages.map(item=>item.move&&(item.role==="player"||item.role==="opponent")?{...item,locale,text:moveSentence(locale,item.role,item.move)}:item)}};}

function withTimeline(profile: PlayerProfile): PlayerProfile {
  const currentGame = profile.currentGame;
  if (!currentGame || currentGame.timeline?.nodes.length) return profile;
  const source = gameFrom(profile); const moves = source.history({ verbose:true }); const replay = new Chess();
  const messageCount=currentGame.conversationMessages?.length??0;
  const nodes: GameHistoryNode[] = [{ fen:replay.fen(), pgn:"", turnId:createUuid(), conversationMessageCount:0 }];
  for (const move of moves) {
    const applied = replay.move({from:move.from,to:move.to,promotion:move.promotion});
    if (replay.turn() === "w" || replay.isGameOver()) nodes.push({fen:replay.fen(),pgn:replay.pgn(),turnId:createUuid(),lastMove:{from:applied.from,to:applied.to},conversationMessageCount:messageCount});
  }
  if (nodes.at(-1)?.fen !== currentGame.fen) nodes.push({fen:currentGame.fen,pgn:currentGame.pgn,turnId:currentGame.turnId,lastMove:moves.length?{from:moves.at(-1)!.from,to:moves.at(-1)!.to}:undefined});
  const retained = nodes.slice(-TIMELINE_LIMIT); retained[retained.length-1] = {...retained[retained.length-1],turnId:currentGame.turnId,lastCoach:currentGame.lastCoach,conversationMessageCount:messageCount};
  return {...profile,currentGame:{...currentGame,timeline:{nodes:retained,cursor:retained.length-1}}};
}

export function ChessLearningApp({ locale, messages }: { locale: SupportedLocale; messages: Messages }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{from:string;to:string} | undefined>();
  const [flipped, setFlipped] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [opponentEngine, setOpponentEngine] = useState<OpponentEngineId>("stockfish");
  const [coachLoading, setCoachLoading] = useState(false);
  const [canAskCoach, setCanAskCoach] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [transientMessage, setTransientMessage] = useState<ConversationMessage | null>(null);
  const [engineAnalysis, setEngineAnalysis] = useState<EngineAnalysisSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [guide, setGuide] = useState(0);
  const [referenceTab, setReferenceTab] = useState<"rules"|"tips"|null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [promotion, setPromotion] = useState<{from:string;to:string} | null>(null);
  const [opponentPreview, setOpponentPreview] = useState<{from:string;to:string;phase:"preparing"|"landed"} | null>(null);
  const profileRef = useRef<PlayerProfile | null>(null);
  const requestRef = useRef<CoachRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [stockfish] = useState(() => new StockfishOpponentEngine());

  const commitProfile = useCallback((next: PlayerProfile) => { profileRef.current = next; setProfile(next); saveProfile(next); }, []);

  useEffect(() => {
    let loaded = loadProfile();
    if (loaded) {
      loaded = { ...loaded, preferredLocale: locale };
      if (!loaded.currentGame) loaded = newGame(loaded);
      loaded = withTimeline(loaded);
      loaded = refreshMoveMessages(loaded,locale);
      const restoredCoach = loaded.currentGame?.lastCoach;
      profileRef.current = loaded;
      // Hydration must wait for the browser-only localStorage source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      const visible=visibleConversation(loaded);setProfile(loaded); setFen(gameFrom(loaded).fen()); setConversation(visible); setEngineAnalysis(latestAnalysis(visible)); setOpponentEngine(loaded.opponentEngine ?? "stockfish"); requestRef.current = restoredCoach?.request || null; setCanAskCoach(Boolean(restoredCoach?.request)); saveProfile(loaded);
    }
    setReady(true);
    return () => { abortRef.current?.abort(); stockfish.dispose(); };
  }, [locale, stockfish]);

  function start(nickname: string,gender:PlayerGender) {
    const next = newGame(createProfile(nickname, locale,gender)); commitProfile(next); setFen(next.currentGame!.fen); setConversation([]); setOpponentEngine(next.opponentEngine ?? "stockfish"); setGuide(0);
  }

  function appendConversation(message: ConversationMessage) {
    const current=profileRef.current;if(!current?.currentGame)return;
    const items=[...(current.currentGame.conversationMessages||[]),message].slice(-300);
    commitProfile({...current,currentGame:{...current.currentGame,conversationMessages:items}});setConversation(items);
  }

  function updateGame(chess: Chess, turnId: string, extra?: Partial<PlayerProfile["lessonProgress"]>) {
    const current = profileRef.current; if (!current?.currentGame) return;
    const next: PlayerProfile = { ...current, currentGame: { ...current.currentGame, fen: chess.fen(), pgn: chess.pgn(), turnId }, lessonProgress: { ...current.lessonProgress, ...extra } };
    commitProfile(next); setFen(chess.fen());
  }

  function beginNewTimelineBranch() {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline) return;
    const nodes = timeline.nodes.slice(0, timeline.cursor + 1); const count=nodes.at(-1)?.conversationMessageCount??0;
    const stored=(currentGame.conversationMessages||[]).slice(0,count);
    commitProfile({...current,currentGame:{...currentGame,lastCoach:undefined,conversationMessages:stored,timeline:{nodes,cursor:nodes.length-1}}}); setConversation(stored);
    requestRef.current = null; setCanAskCoach(false);
  }

  function appendTimelineNode(chess: Chess, turnId: string, move?: Move) {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline) return;
    const node: GameHistoryNode = {fen:chess.fen(),pgn:chess.pgn(),turnId,lastMove:move?{from:move.from,to:move.to}:undefined,conversationMessageCount:currentGame.conversationMessages?.length??0};
    const appended = [...timeline.nodes.slice(0,timeline.cursor+1),node].slice(-TIMELINE_LIMIT);
    commitProfile({...current,currentGame:{...currentGame,fen:node.fen,pgn:node.pgn,turnId,timeline:{nodes:appended,cursor:appended.length-1}}});
  }

  function navigateTimeline(direction: -1 | 1) {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline || thinking) return;
    const cursor = timeline.cursor + direction; const node = timeline.nodes[cursor]; if (!node) return;
    abortRef.current?.abort(); stockfish.cancelSearch(); setTransientMessage(null); setEngineAnalysis(null);
    const nextGame = {...currentGame,fen:node.fen,pgn:node.pgn,turnId:node.turnId,lastCoach:node.lastCoach,timeline:{...timeline,cursor}};
    const visible=(currentGame.conversationMessages||[]).slice(0,node.conversationMessageCount??0);commitProfile({...current,currentGame:nextGame}); setFen(node.fen); setLastMove(node.lastMove); setConversation(visible);setEngineAnalysis(latestAnalysis(visible)); requestRef.current=node.lastCoach?.request || null; setCanAskCoach(Boolean(node.lastCoach?.request));
    setSelected(null); setTargets([]); setOpponentPreview(null); setNotice(null); setCoachLoading(false);
  }

  function markIllegal(piece?: string) {
    const current = profileRef.current; if (!current) return;
    const next = { ...current, lessonProgress: { ...current.lessonProgress, illegalMoveAttempts: current.lessonProgress.illegalMoveAttempts + 1 }, recurringMistakes: [...current.recurringMistakes] };
    const key = `illegal_${piece || "move"}`; const found = next.recurringMistakes.find((m) => m.key === key);
    if (found) { found.count += 1; found.lastSeenAt = new Date().toISOString(); } else next.recurringMistakes.push({ key, count: 1, lastSeenAt: new Date().toISOString() });
    commitProfile(next); setNotice(messages.game.illegal); window.setTimeout(() => setNotice(null), 2600);
  }

  function onSquare(square: string) {
    if (thinking) { setNotice(messages.game.notYourTurn); return; }
    const current = profileRef.current; if (!current) return;
    const chess = gameFrom(current);
    if (chess.isGameOver()) { setNotice(messages.game.gameOver); return; }
    if (selected && targets.includes(square)) { attemptMove(selected, square); return; }
    const piece = chess.get(square as Square);
    if (piece?.color === "w" && chess.turn() === "w") {
      setSelected(square); setTargets([...new Set(legalMoves(chess, square).map((m) => m.to))]); setNotice(null);
    } else if (piece) { setNotice(messages.game.notYourPiece); setSelected(null); setTargets([]); }
    else if (selected) { markIllegal(chess.get(selected as Square)?.type); setSelected(null); setTargets([]); }
  }

  function attemptMove(from: string, to: string) {
    const current = profileRef.current; if (!current) return;
    const chess = gameFrom(current); const candidates = legalMoves(chess, from).filter((m) => m.to === to);
    if (!candidates.length) { markIllegal(chess.get(from as Square)?.type); setSelected(null); setTargets([]); return; }
    if (candidates.some((m) => m.promotion)) { setPromotion({ from, to }); return; }
    executeUserMove(chess, from, to);
  }

  async function executeUserMove(chess: Chess, from: string, to: string, promotionPiece?: PromotionPiece) {
    const current = profileRef.current; if (!current?.currentGame || thinking) return;
    const activeGameId = current.currentGame.gameId;
    const fenBefore = chess.fen(); const legalBefore = chess.moves(); let userMove: Move;
    try { userMove = chess.move({ from, to, promotion: promotionPiece }); } catch { markIllegal(chess.get(from as Square)?.type); return; }
    if (!userMove) { markIllegal(); return; }
    beginNewTimelineBranch();
    setPromotion(null); setSelected(null); setTargets([]); setLastMove({from,to}); setNotice(null); setThinking(true);
    const fenAfterUser = chess.fen(); const turnId = createUuid();
    const rule = ruleForMove(toMoveRecord(userMove));
    const learned = current.lessonProgress.learnedRules.includes(rule) ? current.lessonProgress.learnedRules : [...current.lessonProgress.learnedRules, rule];
    const seen = current.lessonProgress.seenRules.includes(rule) ? current.lessonProgress.seenRules : [...current.lessonProgress.seenRules, rule];
    updateGame(chess, turnId, { legalMovesMade: current.lessonProgress.legalMovesMade + 1, learnedRules: learned, seenRules: seen });
    appendConversation(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:activeGameId,turnId,role:"player",type:"player_move",locale,status:"complete",text:moveSentence(locale,"player",toMoveRecord(userMove)),move:{...toMoveRecord(userMove),color:"white"}}));
    setTransientMessage(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:activeGameId,turnId,role:"opponent",type:"opponent_thinking",locale,status:"streaming",text:thinkingText(locale)}));

    await new Promise((resolve) => window.setTimeout(resolve, 420));
    if (profileRef.current?.currentGame?.gameId !== activeGameId) return;
    let opponentMove: Move | undefined;
    let moveAnalysis: EngineAnalysisSnapshot | undefined;
    if (!chess.isGameOver()) {
      const choices = legalMoves(chess);
      let choice;
      const selectedEngine = current.opponentEngine ?? "stockfish";
      if (selectedEngine === "starter") {
        choice = await new BeginnerOpponentEngine(chess.moveNumber() * 7919 + current.lessonProgress.legalMovesMade).chooseMove({ fen: chess.fen(), legalMoves: choices, level: "beginner" });
        setEngineAnalysis(null); setOpponentEngine("starter");
      } else if (selectedEngine === "growing") {
        choice = await new GrowingOpponentEngine(chess.moveNumber() * 6151 + current.lessonProgress.legalMovesMade).chooseMove({ fen: chess.fen(), legalMoves: choices, level: "beginner" });
        setEngineAnalysis(null); setOpponentEngine("growing");
      } else {
        try {
          const result = await stockfish.searchMove({ fen: chess.fen(), legalMoves: choices, level: "beginner", multiPv:3, onAnalysis:snapshot=>{setEngineAnalysis(snapshot);setTransientMessage(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:activeGameId,turnId,role:"opponent",type:"opponent_analysis",locale,status:"streaming",text:analysisText(locale,snapshot),engineAnalysis:snapshot}));} });
          choice = result?.bestMove; if(result?.finalAnalysis){moveAnalysis=result.finalAnalysis;setEngineAnalysis(result.finalAnalysis);}
          setOpponentEngine("stockfish");
        } catch {
          choice = await new BeginnerOpponentEngine(chess.moveNumber() * 7919 + current.lessonProgress.legalMovesMade).chooseMove({ fen: chess.fen(), legalMoves: choices, level: "beginner" });
          setEngineAnalysis(null); setOpponentEngine("starter"); setNotice(messages.game.engineFallback);
        }
      }
      if (choice) {
        setOpponentPreview({from:choice.from,to:choice.to,phase:"preparing"});
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        if (profileRef.current?.currentGame?.gameId !== activeGameId) return;
        opponentMove = chess.move(choice); setLastMove({from:opponentMove.from,to:opponentMove.to});
        setOpponentPreview({from:opponentMove.from,to:opponentMove.to,phase:"landed"});
        setTransientMessage(null); appendConversation(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:activeGameId,turnId,role:"opponent",type:"opponent_decision",locale,status:"complete",text:moveSentence(locale,"opponent",toMoveRecord(opponentMove)),move:{...toMoveRecord(opponentMove),color:"black"},engineAnalysis:moveAnalysis}));
      }
    }
    const latest = profileRef.current!;
    let gamesPlayed = latest.lessonProgress.gamesPlayed;
    if (chess.isGameOver()) gamesPlayed += 1;
    const opponentRule = opponentMove ? ruleForMove(toMoveRecord(opponentMove)) : undefined;
    const learnedAfterOpponent = opponentRule === "castling" && !latest.lessonProgress.learnedRules.includes(opponentRule) ? [...latest.lessonProgress.learnedRules, opponentRule] : latest.lessonProgress.learnedRules;
    const seenAfterOpponent = opponentRule === "castling" && !latest.lessonProgress.seenRules.includes(opponentRule) ? [...latest.lessonProgress.seenRules, opponentRule] : latest.lessonProgress.seenRules;
    updateGame(chess, turnId, { gamesPlayed, learnedRules:learnedAfterOpponent, seenRules:seenAfterOpponent });
    appendTimelineNode(chess,turnId,opponentMove || userMove);
    if (opponentMove) await new Promise((resolve) => window.setTimeout(resolve, 650));
    if (profileRef.current?.currentGame?.gameId !== activeGameId) return;
    setOpponentPreview(null); setTransientMessage(null); setThinking(false);
    const coachedProfile = profileRef.current!;
    const request: CoachRequest = {
      locale, gameId: coachedProfile.currentGame!.gameId, turnId,
      player: { nickname: coachedProfile.nickname, level: "absolute_beginner", learnedRules: coachedProfile.lessonProgress.learnedRules, recurringMistakes: coachedProfile.recurringMistakes.map((m) => m.key) },
      game: { fenBeforeUserMove: fenBefore, fenAfterUserMove: fenAfterUser, fenAfterOpponentMove: chess.fen(), pgn: chess.pgn(), turnNumber: chess.moveNumber(), status: statusOf(chess) },
      userMove: toMoveRecord(userMove), opponentMove: opponentMove ? toMoveRecord(opponentMove) : undefined,
      legalMovesBeforeUserMove: legalBefore, legalMovesAfterOpponentMove: chess.isGameOver() ? [] : chess.moves(), requestedDetail: "default",
    };
    requestRef.current = request; setCanAskCoach(true); await fetchCoach(request);
  }

  function acceptCoachResult(request: CoachRequest, result: CoachResponse) {
    const latest = profileRef.current;
    if (latest?.currentGame?.gameId !== result.gameId || latest.currentGame.turnId !== result.turnId) return;
    if ((latest.coachMode??"local")!=="disabled") appendConversation(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:result.gameId,turnId:result.turnId,role:"coach",type:request.requestedDetail==="default"?"coach_comment":"coach_advice",locale,status:"complete",text:request.requestedDetail==="default"?`${result.opponentMoveExplanation} ${result.nextObservation}`:result.nextObservation,metadata:{provider:result.provider==="openai"?"remote_gateway":"local"}}));
    const refreshed=profileRef.current;if(!refreshed?.currentGame)return;
    const timeline = refreshed.currentGame.timeline;
    const nodes = timeline ? timeline.nodes.map((node,index) => index === timeline.cursor ? {...node,lastCoach:{request,response:result}} : node) : undefined;
    const counted=nodes?.map((node,index)=>index===timeline!.cursor?{...node,conversationMessageCount:refreshed.currentGame!.conversationMessages?.length??0}:node);
    commitProfile({ ...refreshed, currentGame:{ ...refreshed.currentGame, lastCoach:{ request, response:result }, timeline:timeline && counted ? {...timeline,nodes:counted} : timeline } });
  }

  async function fetchCoach(request: CoachRequest) {
    if ((profileRef.current?.coachMode??"local")==="disabled") return;
    abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller; setCoachLoading(true);
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_COACH_API_URL?.trim(); let result: CoachResponse;
      if (gatewayUrl) {
        const response = await fetch(gatewayUrl, { method:"POST", headers:{"content-type":"application/json","x-player-id":profileRef.current?.playerId || "anonymous"}, body:JSON.stringify(request), signal:controller.signal });
        if (!response.ok) throw new Error("coach failed"); result = await response.json() as CoachResponse;
      } else result = await new LocalCoachService().explainTurn(request);
      acceptCoachResult(request,result);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        acceptCoachResult(request,await new LocalCoachService().explainTurn(request)); setNotice(messages.coach.fallback);
      }
    }
    finally { if (abortRef.current === controller) setCoachLoading(false); }
  }

  async function detail(requestedDetail: RequestedDetail) {
    if (!requestRef.current || coachLoading) return;
    const question=requestedDetail==="hint_2"?messages.coach.hint2:requestedDetail==="hint_3"?messages.coach.hint3:messages.conversation.whatShouldIDo;
    appendConversation(newMessage({sequence:(profileRef.current?.currentGame?.conversationMessages?.length||0)+1,gameId:requestRef.current.gameId,turnId:requestRef.current.turnId,role:"player",type:"player_question",locale,status:"complete",text:question}));
    let request:CoachRequest={...requestRef.current,locale,requestedDetail};
    if(requestedDetail==="hint_3"){
      const current=profileRef.current;
      if(current?.currentGame){
        const chess=gameFrom(current),choices=legalMoves(chess);
        if(choices.length){
          setCoachLoading(true);
          try{
            const result=await stockfish.searchMove({fen:chess.fen(),legalMoves:choices,level:"beginner",multiPv:3,moveTimeMs:500,onAnalysis:setEngineAnalysis});
            const suggested=result&&choices.find(move=>move.from===result.bestMove.from&&move.to===result.bestMove.to&&move.promotion===result.bestMove.promotion);
            if(result?.finalAnalysis)setEngineAnalysis(result.finalAnalysis);
            if(suggested){const explained=new Chess(chess.fen()).move({from:suggested.from,to:suggested.to,promotion:suggested.promotion});request={...request,recommendedMove:toMoveRecord(explained),legalMovesAfterOpponentMove:[suggested.san,...choices.filter(move=>move!==suggested).map(move=>move.san)]};}
          }catch{
            const fallback=await new BeginnerOpponentEngine(chess.moveNumber()*3571).chooseMove({fen:chess.fen(),legalMoves:choices,level:"beginner"});
            const suggested=fallback&&choices.find(move=>move.from===fallback.from&&move.to===fallback.to&&move.promotion===fallback.promotion);
            if(suggested){const explained=new Chess(chess.fen()).move({from:suggested.from,to:suggested.to,promotion:suggested.promotion});request={...request,recommendedMove:toMoveRecord(explained),legalMovesAfterOpponentMove:[suggested.san,...choices.filter(move=>move!==suggested).map(move=>move.san)]};}
          }finally{setCoachLoading(false);}
        }
      }
    }
    requestRef.current=request;await fetchCoach(request);
  }

  function restart() {
    const current = profileRef.current; if (!current) return; abortRef.current?.abort(); stockfish.cancelSearch(); const next = newGame(current); commitProfile(next); setFen(next.currentGame!.fen); setConversation([]); setTransientMessage(null); setEngineAnalysis(null); requestRef.current = null; setCanAskCoach(false); setLastMove(undefined); setSelected(null); setTargets([]); setOpponentPreview(null); setThinking(false);
  }
  function undo() { navigateTimeline(-1); }
  function redo() { navigateTimeline(1); }
  function changeLocale(value: SupportedLocale) {
    const current = profileRef.current; if (current) commitProfile({ ...current, preferredLocale:value }); document.cookie = `chess-locale=${value};path=/;max-age=31536000;samesite=lax`; router.push(`/${value}`);
  }
  function changeOpponentEngine(value: OpponentEngineId) {
    const current = profileRef.current; if (!current || thinking) return;
    commitProfile({ ...current, opponentEngine:value }); setOpponentEngine(value); setNotice(null);
  }
  function changeCoachMode(value: CoachMode) { const current=profileRef.current;if(!current)return;commitProfile({...current,coachMode:value}); }
  function dismissGuide() { const current=profileRef.current;if(!current)return;commitProfile({...current,guideDismissed:true}); }
  function reset() { abortRef.current?.abort(); stockfish.cancelSearch(); clearProfile(); profileRef.current = null; requestRef.current = null; setCanAskCoach(false); setProfile(null); setResetConfirm(false); setConversation([]); setTransientMessage(null); setEngineAnalysis(null); setGuide(0); setFen(new Chess().fen()); }

  if (!ready) return <div className="app-shell">{messages.common.loading}</div>;
  if (!profile) return <WelcomeDialog messages={messages} locale={locale} onLocale={changeLocale} onStart={start} />;
  const game = gameFrom(profile); const status = game.isCheckmate() ? messages.game.checkmate : game.isDraw() ? messages.game.draw : game.inCheck() ? messages.game.check : thinking ? messages.game.computerThinking : messages.game.yourTurn;
  const guides = [messages.guide.one,messages.guide.two,messages.guide.three];
  const isLastGuide = guide === guides.length - 1;
  const timeline = profile.currentGame?.timeline; const canUndo = Boolean(timeline && timeline.cursor > 0); const canRedo = Boolean(timeline && timeline.cursor < timeline.nodes.length-1);
  const opponentSeat = <div className="player-seat opponent"><div className="seat-person"><Avatar kind="opponent" size="large"/><div><div className="seat-name">{messages.game.opponent}</div><div className="seat-role engine-role"><span>{messages.game.black}</span><select data-testid="engine-select" aria-label={messages.game.chooseEngine} value={profile.opponentEngine ?? "stockfish"} disabled={thinking} onChange={(event)=>changeOpponentEngine(event.target.value as OpponentEngineId)}><option value="starter">{messages.game.engineStarter}</option><option value="growing">{messages.game.engineGrowing}</option><option value="stockfish">{messages.game.engineStockfish}</option></select></div></div></div><div className="seat-state">{thinking && <span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span>}{thinking ? messages.game.computerThinking : messages.game.computerTurn}</div></div>;
  const userSeat = <div className="player-seat user"><div className="seat-person"><Avatar kind="player" profile={profile} size="large"/><div><div className="seat-name">{profile.nickname} · {messages.game.you}</div><div className="seat-role">{messages.game.playingWhite}</div></div></div><div className="seat-state">{!thinking && !game.isGameOver() ? messages.game.yourTurn : ""}</div></div>;
  return <div className="app-shell" data-opponent-engine={opponentEngine}>
    <header className="topbar"><div className="brand"><div className="brand-mark">♞</div><div><div className="brand-name">{messages.header.product}</div><div className="brand-sub">{messages.header.stage}</div></div></div>
      <div className="top-actions"><div className="pill player-pill"><Avatar kind="player" profile={profile} size="small"/><span>{profile.nickname}</span></div><label className="sr-only" htmlFor="locale">{messages.header.language}</label><select id="locale" className="pill" value={locale} onChange={(e) => changeLocale(e.target.value as SupportedLocale)}><option value="zh-CN">简体中文</option><option value="en">English</option><option value="ja">日本語</option></select><button className="icon-button" onClick={() => setReferenceTab("rules")} aria-label={messages.header.help}>?</button><button className="icon-button" onClick={() => setResetConfirm(true)} aria-label={messages.header.switchPlayer}>↪</button></div>
    </header>
    <main className="main-grid"><section className="board-column">
      <div className="game-status"><div className="status-main"><span className={`status-dot ${thinking ? "thinking":""}`} />{status}</div>{lastMove && <small>{messages.game.lastMove}: {lastMove.from}–{lastMove.to}</small>}</div>
      {!profile.guideDismissed && guide < guides.length && <div className="guide-card"><span>✦</span><p><strong>{messages.guide.title}</strong><br/>{guides[guide]}</p><div className="guide-actions"><button onClick={() => setGuide((v) => v+1)}>{messages.guide.next}{!isLastGuide && " →"}</button>{isLastGuide && <button className="guide-dismiss" data-testid="guide-dismiss" onClick={dismissGuide}>{messages.guide.dismiss}</button>}</div></div>}
      {flipped ? userSeat : opponentSeat}
      <ChessBoard fen={fen} selected={selected} legalTargets={targets} lastMove={lastMove} flipped={flipped} locked={thinking || game.isGameOver()} onSquare={onSquare} onDrop={attemptMove} pieceLabels={messages.pieces} sideLabels={{white:messages.game.white,black:messages.game.black}} opponentPreview={opponentPreview} />
      {flipped ? opponentSeat : userSeat}
      {notice && <div className="rule-toast" role="status" style={{marginTop:12}}>{notice}</div>}
      <div className="board-toolbar"><button className="pill" onClick={restart}>↻ {messages.common.restart}</button><button className="pill" data-testid="undo" onClick={undo} disabled={thinking || !canUndo}>↶ {messages.common.undo}</button><button className="pill" data-testid="redo" onClick={redo} disabled={thinking || !canRedo}>↷ {messages.common.redo}</button><button className="pill" onClick={() => setFlipped((v) => !v)}>⇅ {messages.header.flip}</button><button className="pill" onClick={() => setReferenceTab("rules")}>♙ {referenceContent[locale].rulesButton}</button><button className="pill" onClick={() => setReferenceTab("tips")}>✦ {referenceContent[locale].tipsButton}</button></div>
    </section><ConversationPanel messages={messages} items={transientMessage?[...conversation,transientMessage]:conversation} thinking={thinking||coachLoading} canAsk={canAskCoach} analysis={engineAnalysis} coachMode={profile.coachMode??"local"} profile={profile} onCoachMode={changeCoachMode} onAsk={detail} /></main>
    {promotion && <div className="modal-backdrop"><div className="modal"><h2>{messages.game.promotion}</h2><div className="promotion-grid">{(["q","r","b","n"] as PromotionPiece[]).map((p) => <button key={p} aria-label={messages.pieces[{q:"queen",r:"rook",b:"bishop",n:"knight"}[p] as "queen"]} onClick={() => { const chess=gameFrom(profileRef.current!); void executeUserMove(chess,promotion.from,promotion.to,p); }}>{({q:"♕",r:"♖",b:"♗",n:"♘"})[p]}</button>)}</div><div className="modal-actions"><button className="secondary" onClick={() => setPromotion(null)}>{messages.common.cancel}</button></div></div></div>}
    {referenceTab&&<LearningReferenceDialog locale={locale} tab={referenceTab} onTab={setReferenceTab} onClose={()=>setReferenceTab(null)}/>}
    {resetConfirm && <div className="modal-backdrop"><div className="modal"><h2>{messages.reset.title}</h2><p>{messages.reset.description}</p><div className="modal-actions"><button className="secondary" onClick={() => setResetConfirm(false)}>{messages.common.cancel}</button><button className="primary" onClick={reset}>{messages.common.confirm}</button></div></div></div>}
  </div>;
}
