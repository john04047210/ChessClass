import { Chess, type Move, type Square } from "chess.js";
import type { LegalMove, MoveRecord, PieceType, PromotionPiece } from "@/lib/types";

const pieceMap: Record<string, PieceType> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

export function legalMoves(chess: Chess, square?: string): LegalMove[] {
  const moves = chess.moves({ square: square as Square | undefined, verbose: true });
  return moves.map((move) => ({
    from: move.from, to: move.to, san: move.san,
    promotion: move.promotion as PromotionPiece | undefined,
  }));
}

export function toMoveRecord(move: Move): MoveRecord {
  return {
    san: move.san, from: move.from, to: move.to,
    piece: pieceMap[move.piece], captured: move.captured ? pieceMap[move.captured] : undefined,
    promotion: move.promotion as PromotionPiece | undefined,
  };
}

export function statusOf(chess: Chess): "playing" | "check" | "checkmate" | "draw" {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isDraw()) return "draw";
  if (chess.inCheck()) return "check";
  return "playing";
}
