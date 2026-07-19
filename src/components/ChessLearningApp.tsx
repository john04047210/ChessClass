"use client";

import { Chess, type Move, type Square } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BeginnerOpponentEngine } from "@/lib/chess/beginner-opponent-engine";
import { legalMoves, statusOf, toMoveRecord } from "@/lib/chess/game-controller";
import { StockfishOpponentEngine } from "@/lib/chess/stockfish-opponent-engine";
import { LocalCoachService, ruleForMove } from "@/lib/coach/local-coach-service";
import type { Messages } from "@/lib/i18n/messages";
import { createUuid } from "@/lib/id";
import { clearProfile, createProfile, loadProfile, saveProfile } from "@/lib/player/storage";
import type { CoachRequest, CoachResponse, GameHistoryNode, PlayerProfile, PromotionPiece, RequestedDetail, SupportedLocale } from "@/lib/types";
import { ChessBoard } from "./ChessBoard";
import { CoachPanel } from "./CoachPanel";
import { WelcomeDialog } from "./WelcomeDialog";

const TIMELINE_LIMIT = 101;

function newGame(profile: PlayerProfile): PlayerProfile {
  const gameId = createUuid();
  const chess = new Chess(); const turnId = createUuid();
  const firstNode: GameHistoryNode = { fen:chess.fen(), pgn:"", turnId };
  return { ...profile, currentGame: { gameId, fen:chess.fen(), pgn:"", startedAt:new Date().toISOString(), turnId, timeline:{nodes:[firstNode],cursor:0} } };
}

function gameFrom(profile: PlayerProfile): Chess {
  const chess = new Chess();
  const pgn = profile.currentGame?.pgn;
  if (pgn) { try { chess.loadPgn(pgn); return chess; } catch { /* use FEN */ } }
  try { return new Chess(profile.currentGame?.fen); } catch { return new Chess(); }
}

function withTimeline(profile: PlayerProfile): PlayerProfile {
  const currentGame = profile.currentGame;
  if (!currentGame || currentGame.timeline?.nodes.length) return profile;
  const source = gameFrom(profile); const moves = source.history({ verbose:true }); const replay = new Chess();
  const nodes: GameHistoryNode[] = [{ fen:replay.fen(), pgn:"", turnId:createUuid() }];
  for (const move of moves) {
    const applied = replay.move({from:move.from,to:move.to,promotion:move.promotion});
    if (replay.turn() === "w" || replay.isGameOver()) nodes.push({fen:replay.fen(),pgn:replay.pgn(),turnId:createUuid(),lastMove:{from:applied.from,to:applied.to}});
  }
  if (nodes.at(-1)?.fen !== currentGame.fen) nodes.push({fen:currentGame.fen,pgn:currentGame.pgn,turnId:currentGame.turnId,lastMove:moves.length?{from:moves.at(-1)!.from,to:moves.at(-1)!.to}:undefined});
  const retained = nodes.slice(-TIMELINE_LIMIT); retained[retained.length-1] = {...retained[retained.length-1],turnId:currentGame.turnId,lastCoach:currentGame.lastCoach};
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
  const [opponentEngine, setOpponentEngine] = useState<"stockfish" | "starter">("stockfish");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [guide, setGuide] = useState(0);
  const [help, setHelp] = useState(false);
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
      const restoredCoach = loaded.currentGame?.lastCoach;
      profileRef.current = loaded;
      // Hydration must wait for the browser-only localStorage source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(loaded); setFen(gameFrom(loaded).fen()); setCoach(restoredCoach?.response || null); requestRef.current = restoredCoach?.request || null; saveProfile(loaded);
    }
    setReady(true);
    return () => { abortRef.current?.abort(); stockfish.dispose(); };
  }, [locale, stockfish]);

  function start(nickname: string) {
    const next = newGame(createProfile(nickname, locale)); commitProfile(next); setFen(next.currentGame!.fen);
  }

  function updateGame(chess: Chess, turnId: string, extra?: Partial<PlayerProfile["lessonProgress"]>) {
    const current = profileRef.current; if (!current?.currentGame) return;
    const next: PlayerProfile = { ...current, currentGame: { ...current.currentGame, fen: chess.fen(), pgn: chess.pgn(), turnId }, lessonProgress: { ...current.lessonProgress, ...extra } };
    commitProfile(next); setFen(chess.fen());
  }

  function beginNewTimelineBranch() {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline) return;
    const nodes = timeline.nodes.slice(0, timeline.cursor + 1);
    commitProfile({...current,currentGame:{...currentGame,lastCoach:undefined,timeline:{nodes,cursor:nodes.length-1}}});
    requestRef.current = null; setCoach(null);
  }

  function appendTimelineNode(chess: Chess, turnId: string, move?: Move) {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline) return;
    const node: GameHistoryNode = {fen:chess.fen(),pgn:chess.pgn(),turnId,lastMove:move?{from:move.from,to:move.to}:undefined};
    const appended = [...timeline.nodes.slice(0,timeline.cursor+1),node].slice(-TIMELINE_LIMIT);
    commitProfile({...current,currentGame:{...currentGame,fen:node.fen,pgn:node.pgn,turnId,timeline:{nodes:appended,cursor:appended.length-1}}});
  }

  function navigateTimeline(direction: -1 | 1) {
    const current = profileRef.current; const currentGame = current?.currentGame; const timeline = currentGame?.timeline;
    if (!current || !currentGame || !timeline || thinking) return;
    const cursor = timeline.cursor + direction; const node = timeline.nodes[cursor]; if (!node) return;
    abortRef.current?.abort();
    const nextGame = {...currentGame,fen:node.fen,pgn:node.pgn,turnId:node.turnId,lastCoach:node.lastCoach,timeline:{...timeline,cursor}};
    commitProfile({...current,currentGame:nextGame}); setFen(node.fen); setLastMove(node.lastMove); setCoach(node.lastCoach?.response || null); requestRef.current=node.lastCoach?.request || null;
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

    await new Promise((resolve) => window.setTimeout(resolve, 420));
    if (profileRef.current?.currentGame?.gameId !== activeGameId) return;
    let opponentMove: Move | undefined;
    if (!chess.isGameOver()) {
      const choices = legalMoves(chess);
      let choice;
      try {
        if ((current.opponentEngine ?? "stockfish") === "starter") throw new Error("Starter engine selected");
        choice = await stockfish.chooseMove({ fen: chess.fen(), legalMoves: choices, level: "beginner" });
        setOpponentEngine("stockfish");
      } catch {
        const fallback = new BeginnerOpponentEngine(chess.moveNumber() * 7919 + current.lessonProgress.legalMovesMade);
        choice = await fallback.chooseMove({ fen: chess.fen(), legalMoves: choices, level: "beginner" });
        setOpponentEngine("starter");
        if ((current.opponentEngine ?? "stockfish") === "stockfish") setNotice(messages.game.engineFallback);
      }
      if (choice) {
        setOpponentPreview({from:choice.from,to:choice.to,phase:"preparing"});
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        if (profileRef.current?.currentGame?.gameId !== activeGameId) return;
        opponentMove = chess.move(choice); setLastMove({from:opponentMove.from,to:opponentMove.to});
        setOpponentPreview({from:opponentMove.from,to:opponentMove.to,phase:"landed"});
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
    setOpponentPreview(null); setThinking(false);
    const coachedProfile = profileRef.current!;
    const request: CoachRequest = {
      locale, gameId: coachedProfile.currentGame!.gameId, turnId,
      player: { nickname: coachedProfile.nickname, level: "absolute_beginner", learnedRules: coachedProfile.lessonProgress.learnedRules, recurringMistakes: coachedProfile.recurringMistakes.map((m) => m.key) },
      game: { fenBeforeUserMove: fenBefore, fenAfterUserMove: fenAfterUser, fenAfterOpponentMove: chess.fen(), pgn: chess.pgn(), turnNumber: chess.moveNumber(), status: statusOf(chess) },
      userMove: toMoveRecord(userMove), opponentMove: opponentMove ? toMoveRecord(opponentMove) : undefined,
      legalMovesBeforeUserMove: legalBefore, legalMovesAfterOpponentMove: chess.isGameOver() ? [] : chess.moves(), requestedDetail: "default",
    };
    requestRef.current = request; await fetchCoach(request);
  }

  function acceptCoachResult(request: CoachRequest, result: CoachResponse) {
    const latest = profileRef.current;
    if (latest?.currentGame?.gameId !== result.gameId || latest.currentGame.turnId !== result.turnId) return;
    setCoach(result);
    const timeline = latest.currentGame.timeline;
    const nodes = timeline ? timeline.nodes.map((node,index) => index === timeline.cursor ? {...node,lastCoach:{request,response:result}} : node) : undefined;
    commitProfile({ ...latest, currentGame:{ ...latest.currentGame, lastCoach:{ request, response:result }, timeline:timeline && nodes ? {...timeline,nodes} : timeline } });
  }

  async function fetchCoach(request: CoachRequest) {
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

  function detail(requestedDetail: RequestedDetail) { if (!requestRef.current || coachLoading) return; const request = { ...requestRef.current, locale, requestedDetail }; requestRef.current = request; void fetchCoach(request); }

  function restart() {
    const current = profileRef.current; if (!current) return; abortRef.current?.abort(); const next = newGame(current); commitProfile(next); setFen(next.currentGame!.fen); setCoach(null); requestRef.current = null; setLastMove(undefined); setSelected(null); setTargets([]); setOpponentPreview(null); setThinking(false);
  }
  function undo() { navigateTimeline(-1); }
  function redo() { navigateTimeline(1); }
  function changeLocale(value: SupportedLocale) {
    const current = profileRef.current; if (current) commitProfile({ ...current, preferredLocale:value }); document.cookie = `chess-locale=${value};path=/;max-age=31536000;samesite=lax`; router.push(`/${value}`);
  }
  function changeOpponentEngine(value: "stockfish" | "starter") {
    const current = profileRef.current; if (!current || thinking) return;
    commitProfile({ ...current, opponentEngine:value }); setOpponentEngine(value); setNotice(null);
  }
  function reset() { abortRef.current?.abort(); clearProfile(); profileRef.current = null; requestRef.current = null; setProfile(null); setResetConfirm(false); setCoach(null); setFen(new Chess().fen()); }

  if (!ready) return <div className="app-shell">{messages.common.loading}</div>;
  if (!profile) return <WelcomeDialog messages={messages} onStart={start} />;
  const game = gameFrom(profile); const status = game.isCheckmate() ? messages.game.checkmate : game.isDraw() ? messages.game.draw : game.inCheck() ? messages.game.check : thinking ? messages.game.computerThinking : messages.game.yourTurn;
  const guides = [messages.guide.one,messages.guide.two,messages.guide.three];
  const timeline = profile.currentGame?.timeline; const canUndo = Boolean(timeline && timeline.cursor > 0); const canRedo = Boolean(timeline && timeline.cursor < timeline.nodes.length-1);
  const opponentSeat = <div className="player-seat opponent"><div className="seat-person"><div className="seat-avatar">♞</div><div><div className="seat-name">{messages.game.opponent}</div><div className="seat-role engine-role"><span>{messages.game.black}</span><select data-testid="engine-select" aria-label={messages.game.chooseEngine} value={profile.opponentEngine ?? "stockfish"} disabled={thinking} onChange={(event)=>changeOpponentEngine(event.target.value as "stockfish" | "starter")}><option value="stockfish">{messages.game.engineStockfish}</option><option value="starter">{messages.game.engineStarter}</option></select></div></div></div><div className="seat-state">{thinking && <span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span>}{thinking ? messages.game.computerThinking : messages.game.computerTurn}</div></div>;
  const userSeat = <div className="player-seat user"><div className="seat-person"><div className="seat-avatar">♙</div><div><div className="seat-name">{profile.nickname} · {messages.game.you}</div><div className="seat-role">{messages.game.playingWhite}</div></div></div><div className="seat-state">{!thinking && !game.isGameOver() ? messages.game.yourTurn : ""}</div></div>;
  return <div className="app-shell" data-opponent-engine={opponentEngine}>
    <header className="topbar"><div className="brand"><div className="brand-mark">♞</div><div><div className="brand-name">{messages.header.product}</div><div className="brand-sub">{messages.header.stage}</div></div></div>
      <div className="top-actions"><div className="pill player-pill"><span className="avatar">{profile.nickname.slice(0,1).toUpperCase()}</span><span>{profile.nickname}</span></div><label className="sr-only" htmlFor="locale">{messages.header.language}</label><select id="locale" className="pill" value={locale} onChange={(e) => changeLocale(e.target.value as SupportedLocale)}><option value="zh-CN">简体中文</option><option value="en">English</option><option value="ja">日本語</option></select><button className="icon-button" onClick={() => setHelp(true)} aria-label={messages.header.help}>?</button><button className="icon-button" onClick={() => setResetConfirm(true)} aria-label={messages.header.switchPlayer}>↪</button></div>
    </header>
    <main className="main-grid"><section className="board-column">
      <div className="game-status"><div className="status-main"><span className={`status-dot ${thinking ? "thinking":""}`} />{status}</div>{lastMove && <small>{messages.game.lastMove}: {lastMove.from}–{lastMove.to}</small>}</div>
      {guide < guides.length && <div className="guide-card"><span>✦</span><p><strong>{messages.guide.title}</strong><br/>{guides[guide]}</p><button onClick={() => setGuide((v) => v+1)}>{messages.guide.next} →</button></div>}
      {flipped ? userSeat : opponentSeat}
      <ChessBoard fen={fen} selected={selected} legalTargets={targets} lastMove={lastMove} flipped={flipped} locked={thinking || game.isGameOver()} onSquare={onSquare} onDrop={attemptMove} pieceLabels={messages.pieces} sideLabels={{white:messages.game.white,black:messages.game.black}} opponentPreview={opponentPreview} />
      {flipped ? opponentSeat : userSeat}
      {notice && <div className="rule-toast" role="status" style={{marginTop:12}}>{notice}</div>}
      <div className="board-toolbar"><button className="pill" onClick={restart}>↻ {messages.common.restart}</button><button className="pill" data-testid="undo" onClick={undo} disabled={thinking || !canUndo}>↶ {messages.common.undo}</button><button className="pill" data-testid="redo" onClick={redo} disabled={thinking || !canRedo}>↷ {messages.common.redo}</button><button className="pill" onClick={() => setFlipped((v) => !v)}>⇅ {messages.header.flip}</button><button className="pill" onClick={() => setHelp(true)}>⌘ {messages.header.help}</button></div>
    </section><CoachPanel messages={messages} response={coach} loading={coachLoading} profile={profile} onDetail={detail} /></main>
    {promotion && <div className="modal-backdrop"><div className="modal"><h2>{messages.game.promotion}</h2><div className="promotion-grid">{(["q","r","b","n"] as PromotionPiece[]).map((p) => <button key={p} aria-label={messages.pieces[{q:"queen",r:"rook",b:"bishop",n:"knight"}[p] as "queen"]} onClick={() => { const chess=gameFrom(profileRef.current!); void executeUserMove(chess,promotion.from,promotion.to,p); }}>{({q:"♕",r:"♖",b:"♗",n:"♘"})[p]}</button>)}</div><div className="modal-actions"><button className="secondary" onClick={() => setPromotion(null)}>{messages.common.cancel}</button></div></div></div>}
    {help && <div className="modal-backdrop" onMouseDown={() => setHelp(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><h2>{messages.help.title}</h2><p>{messages.help.orientation}</p><p>{messages.help.pieces}</p><p>{messages.help.check}</p><p>{messages.help.special}</p><div className="modal-actions"><button className="primary" onClick={() => setHelp(false)}>{messages.common.close}</button></div></div></div>}
    {resetConfirm && <div className="modal-backdrop"><div className="modal"><h2>{messages.reset.title}</h2><p>{messages.reset.description}</p><div className="modal-actions"><button className="secondary" onClick={() => setResetConfirm(false)}>{messages.common.cancel}</button><button className="primary" onClick={reset}>{messages.common.confirm}</button></div></div></div>}
  </div>;
}
