import { Chess, type Color, type PieceSymbol } from "chess.js";
import type { LegalMove } from "@/lib/types";
import type { OpponentEngine } from "./opponent-engine";

const pieceValues: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const centralSquares = new Set(["d4", "e4", "d5", "e5"]);
const developedHomePieces = new Set(["b1", "c1", "f1", "g1", "b8", "c8", "f8", "g8"]);

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function positionScore(chess: Chess, computerColor: Color): number {
  if (chess.isCheckmate()) return chess.turn() === computerColor ? -100_000 : 100_000;
  if (chess.isDraw()) return 0;

  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const direction = piece.color === computerColor ? 1 : -1;
      score += direction * pieceValues[piece.type];
      if (centralSquares.has(piece.square)) score += direction * (piece.type === "p" ? 22 : 12);
      if ((piece.type === "n" || piece.type === "b") && !developedHomePieces.has(piece.square)) score += direction * 12;
      if (piece.type === "k" && ["c1", "g1", "c8", "g8"].includes(piece.square)) score += direction * 28;
    }
  }

  if (chess.inCheck()) score += chess.turn() === computerColor ? -35 : 35;
  return score;
}

function weightedCandidateIndex(length: number, random: () => number): number {
  const weights = [0.62, 0.25, 0.1, 0.03].slice(0, length);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return index;
  }
  return 0;
}

export class GrowingOpponentEngine implements OpponentEngine {
  constructor(private readonly seed = Date.now()) {}

  async chooseMove({ fen, legalMoves }: { fen: string; legalMoves: LegalMove[]; level: "beginner" }) {
    if (!legalMoves.length) return null;
    const computerColor = new Chess(fen).turn();
    const scored = legalMoves.map((move) => {
      const afterComputer = new Chess(fen);
      const played = afterComputer.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (!played) return { move, score: -100_000 };
      if (afterComputer.isCheckmate()) return { move, score: 100_000 };

      const replies = afterComputer.moves({ verbose: true });
      let worstReplyScore = Number.POSITIVE_INFINITY;
      for (const reply of replies) {
        afterComputer.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
        worstReplyScore = Math.min(worstReplyScore, positionScore(afterComputer, computerColor));
        afterComputer.undo();
      }
      return {
        move,
        score: Number.isFinite(worstReplyScore) ? worstReplyScore : positionScore(afterComputer, computerColor),
      };
    }).sort((left, right) => right.score - left.score);

    const bestScore = scored[0].score;
    const candidates = scored.filter((candidate) => candidate.score >= bestScore - 140).slice(0, 4);
    const selected = candidates[weightedCandidateIndex(candidates.length, seededRandom(this.seed))].move;
    const verified = new Chess(fen).move({ from: selected.from, to: selected.to, promotion: selected.promotion });
    return verified ? { from: selected.from, to: selected.to, promotion: selected.promotion } : null;
  }
}
