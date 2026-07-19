import type { LegalMove } from "@/lib/types";

export interface OpponentEngine {
  chooseMove(input: { fen: string; legalMoves: LegalMove[]; level: "beginner" }): Promise<Pick<LegalMove, "from" | "to" | "promotion"> | null>;
}
