// api/_lib/nvidia.js — shared NVIDIA NIM chat-completion caller with automatic
// key fallback. Two NVIDIA keys exist in this project: NVIDIA_API_KEY (used
// standalone by api/chat.js, confirmed healthy) and NVIDIA_SUMMARY_API_KEY
// (higher-quality 70B model, but prone to getting rate/quota-blocked by
// NVIDIA under heavy batch use — see scripts/backfill-*.mjs history). Rather
// than hard-failing the whole feature when one key is blocked, try the known-
// good key first and opportunistically retry the quality key as a fallback.

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

function candidates() {
  return [
    { key: process.env.NVIDIA_API_KEY, model: 'meta/llama-3.1-8b-instruct', label: 'chat-8b' },
    { key: process.env.NVIDIA_SUMMARY_API_KEY, model: 'meta/llama-3.3-70b-instruct', label: 'summary-70b' },
  ].filter(c => c.key)
}

export function hasNvidiaKey() {
  return candidates().length > 0
}

/**
 * Calls NVIDIA chat completions, trying each configured key in order until
 * one succeeds. Only retries the next key on auth/quota-shaped failures
 * (401/402/403/429) — a 400 (bad request/content) would fail identically on
 * every key, so it's thrown immediately instead of wasting a second call.
 */
export async function callNvidia({ messages, maxTokens = 600, temperature = 0.7, timeoutMs = 30000 }) {
  const list = candidates()
  if (!list.length) {
    const e = new Error('No NVIDIA API key configured')
    e.status = 503
    throw e
  }

  let lastError
  for (const candidate of list) {
    try {
      const response = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${candidate.key}` },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ model: candidate.model, max_tokens: maxTokens, temperature, messages }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        const err = new Error(`NVIDIA ${candidate.label} error ${response.status}: ${errText.slice(0, 200)}`)
        err.status = response.status
        if (![401, 402, 403, 429].includes(response.status)) throw err
        console.error(`[nvidia] ${candidate.label} failed (${response.status}), trying next key`)
        lastError = err
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      return { content, model: candidate.label }
    } catch (e) {
      if (e.name === 'TimeoutError') { e.status = 408; throw e }
      lastError = e
    }
  }
  throw lastError || new Error('All NVIDIA keys failed')
}
