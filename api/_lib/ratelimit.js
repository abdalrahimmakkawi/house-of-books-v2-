// api/_lib/ratelimit.js — shared per-IP rate limiter for all API functions.
//
// In-memory sliding window, per serverless instance. Under heavy traffic
// Vercel runs many instances, so treat these numbers as per-instance
// budgets — they still stop any single client from hammering one instance
// and cap the blast radius of abuse. (For a global limit, back this with
// Upstash/Redis later — the call sites won't need to change.)

const buckets = new Map()
const MAX_BUCKETS = 10000 // hard cap so memory can't grow unbounded

export function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

/**
 * Returns { ok, retryAfterSec }. Call once per request.
 * key    — namespace per endpoint, e.g. 'chat'
 * limit  — max requests per window
 * windowMs — window length in ms
 */
export function rateLimit(req, key, limit, windowMs) {
  const now = Date.now()
  const id = `${key}:${getClientIP(req)}`
  let b = buckets.get(id)

  if (!b || now - b.start > windowMs) {
    // Evict oldest entries if map is getting large
    if (buckets.size >= MAX_BUCKETS) {
      const cutoff = now - windowMs
      for (const [k, v] of buckets) {
        if (v.start < cutoff) buckets.delete(k)
        if (buckets.size < MAX_BUCKETS * 0.9) break
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear()
    }
    b = { start: now, count: 0 }
    buckets.set(id, b)
  }

  b.count++
  if (b.count > limit) {
    const retryAfterSec = Math.ceil((b.start + windowMs - now) / 1000)
    return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) }
  }
  return { ok: true, retryAfterSec: 0 }
}

/** Convenience: applies limit and writes the 429 response. True = blocked. */
export function enforceRateLimit(req, res, key, limit, windowMs) {
  const { ok, retryAfterSec } = rateLimit(req, key, limit, windowMs)
  if (!ok) {
    res.setHeader('Retry-After', String(retryAfterSec))
    res.status(429).json({ error: 'Too many requests. Please slow down.', retryAfterSec })
    return true
  }
  return false
}
