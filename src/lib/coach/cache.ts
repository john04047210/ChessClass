type Entry<T> = { value: T; expires: number };
export class TtlCache<T> {
  private readonly map = new Map<string, Entry<T>>();
  constructor(private readonly ttlMs = 5 * 60_000, private readonly maxSize = 200) {}
  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry || entry.expires < Date.now()) { this.map.delete(key); return undefined; }
    return entry.value;
  }
  set(key: string, value: T): void {
    if (this.map.size >= this.maxSize) this.map.delete(this.map.keys().next().value as string);
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
