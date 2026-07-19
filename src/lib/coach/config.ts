export const coachConfig = {
  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  maxOutputTokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 500),
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 8000),
  promptVersion: "beginner-v1",
};

export function isOpenAIEnabled(): boolean {
  return process.env.OPENAI_COACH_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY);
}
