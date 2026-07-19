import { z } from "zod";

const locale = z.enum(["zh-CN", "en", "ja"]);
const ruleKey = z.enum(["board_orientation", "board_coordinates", "white_moves_first", "pawn_forward", "pawn_double_step", "pawn_diagonal_capture", "knight_l_shape", "knight_can_jump", "bishop_diagonal", "rook_straight", "queen_combined_movement", "king_one_square", "blocked_piece", "check", "escape_check", "checkmate", "castling", "promotion"]);
const piece = z.enum(["king", "queen", "rook", "bishop", "knight", "pawn"]);
const promotion = z.enum(["q", "r", "b", "n"]);
const move = z.object({ san: z.string().max(20), from: z.string().regex(/^[a-h][1-8]$/), to: z.string().regex(/^[a-h][1-8]$/), piece, captured: piece.optional(), promotion: promotion.optional() });

export const coachRequestSchema = z.object({
  locale,
  gameId: z.string().min(1).max(80),
  turnId: z.string().min(1).max(80),
  player: z.object({ nickname: z.string().max(20), level: z.literal("absolute_beginner"), learnedRules: z.array(ruleKey).max(30), recurringMistakes: z.array(z.string().max(60)).max(20) }),
  game: z.object({ fenBeforeUserMove: z.string().max(120), fenAfterUserMove: z.string().max(120), fenAfterOpponentMove: z.string().max(120).optional(), pgn: z.string().max(8000), turnNumber: z.number().int().min(1).max(1000), status: z.enum(["playing", "check", "checkmate", "draw"]) }),
  userMove: move,
  opponentMove: move.optional(),
  legalMovesBeforeUserMove: z.array(z.string().max(20)).max(256),
  legalMovesAfterOpponentMove: z.array(z.string().max(20)).max(256).optional(),
  requestedDetail: z.enum(["default", "more", "hint_1", "hint_2", "hint_3"]),
});

export const coachResponseSchema = z.object({
  provider: z.enum(["openai", "local_fallback"]), locale, gameId: z.string(), turnId: z.string(),
  userMoveSummary: z.string().max(1000),
  inferredIntent: z.object({ text: z.string().max(1000), confidence: z.enum(["low", "medium", "high"]) }),
  opponentMoveExplanation: z.string().max(1000), nextObservation: z.string().max(1000),
  ruleTaught: z.object({ key: ruleKey, title: z.string().max(200), explanation: z.string().max(1000) }).optional(),
  warning: z.string().max(500).optional(),
});
