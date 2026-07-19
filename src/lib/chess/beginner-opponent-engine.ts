import { Chess } from "chess.js";
import type { LegalMove } from "@/lib/types";
import type { OpponentEngine } from "./opponent-engine";

const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class BeginnerOpponentEngine implements OpponentEngine {
  constructor(private readonly seed = Date.now()) {}

  async chooseMove({ fen, legalMoves }: { fen: string; legalMoves: LegalMove[]; level: "beginner" }) {
    if (!legalMoves.length) return null;
    const random = seededRandom(this.seed);
    const chess = new Chess(fen);
    const scored = legalMoves.map((move) => {
      const clone = new Chess(fen);
      const result = clone.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (!result) return { move, score: -999 };
      let score = random() * 1.8;
      if (clone.isCheckmate()) score += 1000;
      if (result.captured) score += values[result.captured] * 4;
      if (["d4", "e4", "d5", "e5"].includes(move.to)) score += 2;
      if (["n", "b"].includes(result.piece) && ["1", "8"].includes(move.from[1])) score += 2.5;
      if (result.piece === "q" && chess.moveNumber() < 5) score -= 3;
      if (result.isKingsideCastle() || result.isQueensideCastle()) score += 5;
      return { move, score };
    }).sort((a, b) => b.score - a.score);
    const pool = scored.slice(0, Math.min(3, scored.length));
    const selected = pool[Math.floor(random() * pool.length)].move;
    const verified = new Chess(fen).move({ from: selected.from, to: selected.to, promotion: selected.promotion });
    return verified ? { from: selected.from, to: selected.to, promotion: selected.promotion } : null;
  }
}
