import type { CoachRequest, CoachResponse } from "@/lib/types";
export interface CoachService { explainTurn(input: CoachRequest): Promise<CoachResponse>; }
