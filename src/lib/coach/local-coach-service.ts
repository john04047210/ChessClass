import { Chess } from "chess.js";
import { getMessages } from "@/lib/i18n/messages";
import type { CoachRequest, CoachResponse, PieceType, RuleKey, SupportedLocale } from "@/lib/types";
import type { CoachService } from "./coach-service";
import { explainOpponentMove } from "./position-explanation";

function expandedNotation(locale: SupportedLocale, move: CoachRequest["userMove"]): string {
  const messages = getMessages(locale);
  const piece = messages.pieces[move.piece];
  const coreSan = move.san.replace(/[+#]+$/, "");
  if (coreSan === "O-O" || coreSan === "O-O-O") {
    const rank = move.from[1];
    const rookFrom = `${coreSan === "O-O" ? "h" : "a"}${rank}`;
    const rookTo = `${coreSan === "O-O" ? "f" : "d"}${rank}`;
    const side = coreSan === "O-O" ? "king" : "queen";
    const suffix = move.san.endsWith("#") ? "checkmate" : move.san.endsWith("+") ? "check" : null;
    const explanation = {
      "zh-CN": `${side === "king" ? "王翼" : "后翼"}王车易位：这是一个特殊的一手。王从 ${move.from} 到 ${move.to}，车同时从 ${rookFrom} 到 ${rookTo}${suffix === "check" ? "；末尾的 + 表示这一步还形成了将军" : suffix === "checkmate" ? "；末尾的 # 表示这一步形成了将死" : ""}`,
      en: `${side === "king" ? "Kingside" : "Queenside"} castling: this is one special move. The king moves from ${move.from} to ${move.to}, while the rook moves from ${rookFrom} to ${rookTo}${suffix === "check" ? "; the + means this move also gives check" : suffix === "checkmate" ? "; the # means this move gives checkmate" : ""}`,
      ja: `${side === "king" ? "キング側" : "クイーン側"}へのキャスリング：これは特別な1手です。キングを ${move.from} から ${move.to} へ動かすと同時に、ルークを ${rookFrom} から ${rookTo} へ動かします${suffix === "check" ? "。末尾の + は、この手でチェックしたことを表します" : suffix === "checkmate" ? "。末尾の # は、この手でチェックメイトしたことを表します" : ""}`,
    }[locale];
    return `${move.san}（${explanation}）`;
  }
  const explanation = {
    "zh-CN": `${piece}从 ${move.from} ${move.captured ? "吃到" : "走到"} ${move.to}`,
    en: `${piece} ${move.captured ? "captures on" : `moves from ${move.from} to`} ${move.to}`,
    ja: `${piece}を ${move.from} から ${move.to} へ${move.captured ? "動かして駒を取る" : "動かす"}`,
  }[locale];
  return `${move.san}（${explanation}）`;
}

const copy = {
  "zh-CN": {
    moved: (p: string, a: string, b: string) => `你把${p}从 ${a} 走到 ${b}。`,
    captured: (p: string) => `同时吃掉了对方的${p}。`,
    intent: "我猜你可能是想让这个棋子更活跃，或争取更多空间；这只是我的推测。",
    opponent: (san: string) => `电脑走了 ${san}，它在发展棋子、争夺空间，或回应你刚才的威胁。`,
    observe: "先看看中央四格，再找一找还没有走出的马和象。",
    hint2: "看看你的马和象：哪两三个棋子能安全走出，同时照顾中央？",
    hint3: (m: string) => `推荐走法：${m}。这是本地棋力引擎分析当前局面后给出的首选合法走法；你可以先找出它对应的棋子和目标格，再决定是否采用。`,
    more: "走棋前可以问自己三件事：我的王安全吗？对方在攻击什么？这个棋子走后会不会失去保护？",
  },
  en: {
    moved: (p: string, a: string, b: string) => `You moved your ${p} from ${a} to ${b}. `,
    captured: (p: string) => `It also captured the opponent's ${p}. `,
    intent: "You may have wanted to activate this piece or gain space; that is only my guess.",
    opponent: (san: string) => `The computer played ${san} to develop, contest space, or answer your last move.`,
    observe: "Look at the four central squares, then find a knight or bishop that has not moved yet.",
    hint2: "Look at your knights and bishops: which two or three can develop safely while helping the center?",
    hint3: (m: string) => `Recommended move: ${m}. This is the local chess engine's top legal choice for the current position; first identify the piece and destination, then decide whether to play it.`,
    more: "Before moving, ask: Is my king safe? What is my opponent attacking? Will the piece still be protected?",
  },
  ja: {
    moved: (p: string, a: string, b: string) => `${p}を ${a} から ${b} へ動かしました。`,
    captured: (p: string) => `同時に相手の${p}を取りました。`,
    intent: "この駒を働かせる、またはスペースを取ろうとしたのかもしれません。これは推測です。",
    opponent: (san: string) => `コンピューターは ${san}。駒の展開、スペース争い、または直前の手への対応です。`,
    observe: "中央の4マスを見てから、まだ動いていないナイトやビショップを探しましょう。",
    hint2: "ナイトとビショップのうち、安全に展開して中央を助けられる2〜3個を探しましょう。",
    hint3: (m: string) => `おすすめの手：${m}。現在の局面をローカル棋力エンジンで解析した最上位の合法手です。駒と目的地を確認してから、指すかどうか決めましょう。`,
    more: "指す前に、キングは安全か、相手は何を攻撃しているか、動かす駒の守りが残るかを確認しましょう。",
  },
} as const;

export function ruleForMove(move: CoachRequest["userMove"]): RuleKey {
  if (move.promotion) return "promotion";
  const coreSan = move.san.replace(/[+#]+$/, "");
  if (coreSan === "O-O" || coreSan === "O-O-O") return "castling";
  if (move.piece === "pawn") {
    if (move.captured) return "pawn_diagonal_capture";
    return Math.abs(Number(move.to[1]) - Number(move.from[1])) === 2 ? "pawn_double_step" : "pawn_forward";
  }
  if (move.piece === "knight") return "knight_l_shape";
  if (move.piece === "bishop") return "bishop_diagonal";
  if (move.piece === "rook") return "rook_straight";
  if (move.piece === "queen") return "queen_combined_movement";
  return "king_one_square";
}

export function localIllegalMessage(locale: SupportedLocale, piece?: PieceType): string {
  const messages = getMessages(locale);
  const prefix = messages.game.illegal;
  const detail: Record<SupportedLocale, string> = {
    "zh-CN": piece === "pawn" ? "兵不能横走或后退；它向前走、斜着吃子。" : "检查棋子的走法，以及路线是否被挡住。",
    en: piece === "pawn" ? "A pawn cannot move sideways or backward; it moves forward and captures diagonally." : "Check how that piece moves and whether another piece blocks its path.",
    ja: piece === "pawn" ? "ポーンは横や後ろへ動けません。前進し、斜めに駒を取ります。" : "駒の動き方と、経路が他の駒で塞がれていないか確認しましょう。",
  };
  return `${prefix} ${detail[locale]}`;
}

export class LocalCoachService implements CoachService {
  async explainTurn(input: CoachRequest): Promise<CoachResponse> {
    const messages = getMessages(input.locale);
    const c = copy[input.locale];
    const opponentRule = input.opponentMove ? ruleForMove(input.opponentMove) : undefined;
    const rule = opponentRule === "castling" ? opponentRule : ruleForMove(input.userMove);
    const legal = input.legalMovesAfterOpponentMove?.[0];
    let nextObservation: string = c.observe;
    if (input.requestedDetail === "more") nextObservation = c.more;
    if (input.requestedDetail === "hint_2") nextObservation = c.hint2;
    if (input.requestedDetail === "hint_3" && legal) nextObservation = c.hint3(input.recommendedMove ? expandedNotation(input.locale,input.recommendedMove) : legal);
    const piece = messages.pieces[input.userMove.piece];
    const captured = input.userMove.captured ? c.captured(messages.pieces[input.userMove.captured]) : "";
    const positionExplanation = input.opponentMove && input.game.fenAfterOpponentMove ? explainOpponentMove(input.locale,input.game.fenAfterUserMove,input.game.fenAfterOpponentMove,input.opponentMove) : undefined;
    const opponent = input.opponentMove ? positionExplanation?.explanation || c.opponent(expandedNotation(input.locale, input.opponentMove)) : (input.game.status === "checkmate" ? messages.game.checkmate : "");
    if(input.requestedDetail==="default"&&positionExplanation)nextObservation=positionExplanation.observation;
    return {
      provider: "local_fallback", locale: input.locale, gameId: input.gameId, turnId: input.turnId,
      userMoveSummary: `${c.moved(piece, input.userMove.from, input.userMove.to)}${captured}`,
      inferredIntent: { text: c.intent, confidence: "low" },
      opponentMoveExplanation: opponent,
      nextObservation,
      ruleTaught: { key: rule, title: messages.rules[rule], explanation: opponentRule === "castling" && input.opponentMove ? expandedNotation(input.locale, input.opponentMove) : nextObservation },
    };
  }
}

export function verifyFenMove(fen: string, from: string, to: string, promotion?: string): boolean {
  try { return Boolean(new Chess(fen).move({ from, to, promotion })); } catch { return false; }
}
