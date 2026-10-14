// Per-process foundation guard. Distributed enforcement required before multi-instance release.
export class RateLimit {
  private readonly buckets = new Map<string, { count: number; until: number }>();
  constructor(private readonly maximum = 120, private readonly windowMs = 60000) {}
  allow(key: string, now = Date.now()): boolean {
    for (const [id, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(id);
    const previous = this.buckets.get(key);
    if (!previous) {
      if (this.buckets.size >= 10000) return false;
      this.buckets.set(key, { count: 1, until: now + this.windowMs });
      return true;
    }
    if (previous.count >= this.maximum) return false;
    previous.count++;
    return true;
  }
}
