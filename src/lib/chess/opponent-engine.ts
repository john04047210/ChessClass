import type { EngineAnalysisSnapshot, EngineSearchResult, LegalMove } from "@/lib/types";

export interface OpponentEngine {
  chooseMove(input: { fen: string; legalMoves: LegalMove[]; level: "beginner" }): Promise<Pick<LegalMove, "from" | "to" | "promotion"> | null>;
  searchMove?(input:{fen:string;legalMoves:LegalMove[];level:"beginner";multiPv?:number;moveTimeMs?:number;signal?:AbortSignal;onAnalysis?:(snapshot:EngineAnalysisSnapshot)=>void}):Promise<EngineSearchResult|null>;
  cancelSearch?(reason?:string):void;
}
