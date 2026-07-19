const buckets = new Map<string, number[]>();
export function withinRateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((time) => time > now - windowMs);
  if (recent.length >= limit) return false;
  recent.push(now); buckets.set(key, recent); return true;
}
