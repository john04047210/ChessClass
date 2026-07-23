export const supportedLocales = ["zh-CN", "en", "ja"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type PromotionPiece = "q" | "r" | "b" | "n";
export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type RuleKey =
  | "board_orientation" | "board_coordinates" | "white_moves_first"
  | "pawn_forward" | "pawn_double_step" | "pawn_diagonal_capture"
  | "knight_l_shape" | "knight_can_jump" | "bishop_diagonal"
  | "rook_straight" | "queen_combined_movement" | "king_one_square"
  | "blocked_piece" | "check" | "escape_check" | "checkmate"
  | "castling" | "promotion";

export type RequestedDetail = "default" | "more" | "hint_1" | "hint_2" | "hint_3";
export type CoachProvider = "openai" | "local_fallback";
export type CoachMode = "disabled" | "local" | "remote_gateway";
export type PlayerGender = "male" | "female" | "undisclosed";
export type OpponentEngineId = "starter" | "growing" | "stockfish";
export type ConversationRole = "player" | "opponent" | "coach" | "system";
export type ConversationMessageType = "player_move" | "opponent_thinking" | "opponent_analysis" | "opponent_decision" | "coach_comment" | "coach_advice" | "player_question" | "rule_explanation" | "system_notice" | "error";
export type ConversationMessageStatus = "pending" | "streaming" | "complete" | "cancelled" | "error";

export type EngineScore = { type:"centipawn"; value:number; perspective:"white" } | { type:"mate"; value:number; perspective:"white" };
export interface EngineCandidate { rank:number; moveUci:string; moveSan?:string; score:EngineScore; principalVariationUci:string[]; principalVariationSan?:string[]; }
export interface EngineAnalysisSnapshot { searchId:string; depth:number; selDepth?:number; nodes?:number; nps?:number; elapsedMs?:number; candidates:EngineCandidate[]; }
export interface EngineSearchResult { bestMove:Pick<LegalMove,"from"|"to"|"promotion">; ponder?:string; finalAnalysis?:EngineAnalysisSnapshot; }

export interface ConversationMessage {
  id:string; sequence:number; gameId:string; turnId:string; role:ConversationRole; type:ConversationMessageType;
  locale:SupportedLocale; status:ConversationMessageStatus; createdAt:string; text:string;
  move?:MoveRecord & {color:"white"|"black"}; engineAnalysis?:EngineAnalysisSnapshot;
  metadata?:{provider?:"local"|"remote_gateway"; suggestionId?:string; withdrawn?:boolean};
}

export interface LegalMove {
  from: string;
  to: string;
  promotion?: PromotionPiece;
  san: string;
}

export interface CoachRequest {
  locale: SupportedLocale;
  gameId: string;
  turnId: string;
  player: {
    nickname: string;
    level: "absolute_beginner";
    learnedRules: RuleKey[];
    recurringMistakes: string[];
  };
  game: {
    fenBeforeUserMove: string;
    fenAfterUserMove: string;
    fenAfterOpponentMove?: string;
    pgn: string;
    turnNumber: number;
    status: "playing" | "check" | "checkmate" | "draw";
  };
  userMove: MoveRecord;
  opponentMove?: MoveRecord;
  legalMovesBeforeUserMove: string[];
  legalMovesAfterOpponentMove?: string[];
  recommendedMove?: MoveRecord;
  requestedDetail: RequestedDetail;
}

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PromotionPiece;
}

export interface CoachResponse {
  provider: CoachProvider;
  locale: SupportedLocale;
  gameId: string;
  turnId: string;
  userMoveSummary: string;
  inferredIntent: { text: string; confidence: "low" | "medium" | "high" };
  opponentMoveExplanation: string;
  nextObservation: string;
  ruleTaught?: { key: RuleKey; title: string; explanation: string };
  warning?: string;
}

export interface CoachSnapshot {
  request: CoachRequest;
  response: CoachResponse;
}

export interface GameHistoryNode {
  fen: string;
  pgn: string;
  turnId: string;
  lastMove?: { from: string; to: string };
  lastCoach?: CoachSnapshot;
  conversationMessageCount?: number;
}

export interface GameTimeline {
  nodes: GameHistoryNode[];
  cursor: number;
}

export interface PlayerProfile {
  playerId: string;
  nickname: string;
  preferredLocale: SupportedLocale;
  opponentEngine?: OpponentEngineId;
  coachMode?: CoachMode;
  guideDismissed?: boolean;
  gender?: PlayerGender;
  avatarId?: "male" | "female" | "neutral";
  createdAt: string;
  updatedAt: string;
  lessonProgress: {
    learnedRules: RuleKey[];
    seenRules: RuleKey[];
    gamesPlayed: number;
    legalMovesMade: number;
    illegalMoveAttempts: number;
  };
  recurringMistakes: Array<{ key: string; count: number; lastSeenAt: string }>;
  currentGame?: {
    gameId: string;
    fen: string;
    pgn: string;
    startedAt: string;
    turnId: string;
    lastCoach?: CoachSnapshot;
    timeline?: GameTimeline;
    conversationMessages?: ConversationMessage[];
  };
  coachMessages?: Array<{
    id: string; gameId: string; turnId: string; locale: SupportedLocale;
    provider: CoachProvider; createdAt: string;
  }>;
}
