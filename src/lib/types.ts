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
}

export interface GameTimeline {
  nodes: GameHistoryNode[];
  cursor: number;
}

export interface PlayerProfile {
  playerId: string;
  nickname: string;
  preferredLocale: SupportedLocale;
  opponentEngine?: "stockfish" | "starter";
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
  };
  coachMessages?: Array<{
    id: string; gameId: string; turnId: string; locale: SupportedLocale;
    provider: CoachProvider; createdAt: string;
  }>;
}
