import { Injectable } from '@nestjs/common';

interface Bucket {
  tokens: number;
  lastRefill: number;
  violations: number; // consecutive rejected attempts, used for cooldown escalation
  cooldownUntil: number; // epoch ms; while in the future, all requests are rejected outright
}

// Simple in-memory token-bucket rate limiter, keyed by an arbitrary string
// (e.g. `dm:<userId>` or `game-chat:<userId>`) so different features get
// independent allowances even for the same user.
//
// NOTE: in-memory + per-process, same caveat as PresenceService — fine for
// a single backend replica. If you scale to multiple replicas, move this
// to Redis (INCR/EXPIRE or a sliding-window Lua script) so the limit is
// shared across instances instead of being reset per-replica.
@Injectable()
export class RateLimiterService {
  private buckets = new Map<string, Bucket>();

  private readonly maxTokens = 5; // burst allowance
  private readonly refillRatePerSec = 1; // tokens regained per second (≈ 1 msg/sec sustained)
  private readonly maxViolationsBeforeCooldown = 3;
  private readonly cooldownMs = 30_000;

  /** Returns true if the action is allowed, false if it should be rejected. */
  consume(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now, violations: 0, cooldownUntil: 0 };
      this.buckets.set(key, bucket);
    }

    if (bucket.cooldownUntil > now) {
      return false;
    }

    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsedSec * this.refillRatePerSec);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      bucket.violations += 1;
      if (bucket.violations >= this.maxViolationsBeforeCooldown) {
        bucket.cooldownUntil = now + this.cooldownMs;
        bucket.violations = 0;
      }
      return false;
    }

    bucket.tokens -= 1;
    bucket.violations = 0; // reset on any successful send
    return true;
  }

  /** Seconds remaining before this key can send again — handy for a UI countdown. */
  retryAfterSeconds(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    const now = Date.now();
    if (bucket.cooldownUntil > now) {
      return Math.ceil((bucket.cooldownUntil - now) / 1000);
    }
    if (bucket.tokens >= 1) return 0;
    return Math.ceil((1 - bucket.tokens) / this.refillRatePerSec);
  }
}
