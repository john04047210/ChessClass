export interface CoachTelemetry { provider: string; locale: string; gameId: string; turnId: string; cacheHit: boolean; success: boolean; fallback: boolean; latencyMs: number; errorCategory?: string; }
export interface TelemetrySink { record(event: CoachTelemetry): void; }
export const telemetry: TelemetrySink = { record(event) { if (process.env.NODE_ENV === "development") console.info("coach_telemetry", JSON.stringify(event)); } };
