import OpenAI from "openai";
import { coachConfig } from "./config";
import { BASE_COACH_RULES, LOCALE_INSTRUCTIONS } from "./prompts";
import { coachResponseSchema } from "./schemas";
import type { CoachRequest, CoachResponse } from "@/lib/types";
import type { CoachService } from "./coach-service";

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: { const: "openai" }, locale: { enum: ["zh-CN", "en", "ja"] }, gameId: { type:"string" }, turnId: { type:"string" },
    userMoveSummary: { type:"string" },
    inferredIntent: { type:"object", additionalProperties:false, properties:{ text:{type:"string"}, confidence:{enum:["low","medium","high"]} }, required:["text","confidence"] },
    opponentMoveExplanation: { type:"string" }, nextObservation: { type:"string" }, warning: { type:"string" },
  },
  required: ["provider","locale","gameId","turnId","userMoveSummary","inferredIntent","opponentMoveExplanation","nextObservation"],
};

export class OpenAICoachService implements CoachService {
  private readonly client: OpenAI;
  constructor(client?: OpenAI) { this.client = client || new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: coachConfig.timeoutMs, maxRetries: 1 }); }
  async explainTurn(input: CoachRequest): Promise<CoachResponse> {
    const response = await this.client.responses.create({
      model: coachConfig.model, max_output_tokens: coachConfig.maxOutputTokens, store: false,
      instructions: `${BASE_COACH_RULES}\n${LOCALE_INSTRUCTIONS[input.locale]}`,
      input: JSON.stringify(input),
      text: { verbosity:"low", format:{ type:"json_schema", name:"beginner_coach_response", schema:responseJsonSchema, strict:false } },
    });
    return coachResponseSchema.parse(JSON.parse(response.output_text));
  }
}
