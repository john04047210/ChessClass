import type { CoachRequest, CoachResponse } from "@/lib/types";
import type { CoachService } from "./coach-service";
import { isOpenAIEnabled } from "./config";
import { LocalCoachService } from "./local-coach-service";
import { OpenAICoachService } from "./openai-coach-service";

export class FallbackCoachService implements CoachService {
  constructor(private readonly local: CoachService = new LocalCoachService(), private readonly remoteFactory: () => CoachService = () => new OpenAICoachService()) {}
  async explainTurn(input: CoachRequest): Promise<CoachResponse> {
    if (!isOpenAIEnabled()) return this.local.explainTurn(input);
    try { return await this.remoteFactory().explainTurn(input); }
    catch { const result = await this.local.explainTurn(input); return { ...result, warning:"fallback" }; }
  }
}
