import { AiError, type ChatMessage, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

/**
 * Gemini API endpoint — v1beta for latest model access. The model name
 * is interpolated at call time (same pattern as the other adapters using
 * the caller's `model` string directly). Uses the REST API with an API
 * key query param (Google AI Studio keys), NOT OAuth — consistent with
 * the BYO-key pattern where each account pastes a key from
 * https://aistudio.google.com/apikey.
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
  }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

/**
 * Map our provider-neutral chat transcript to Gemini's content format.
 * Gemini requires:
 *   - Roles are `user` | `model` (not `assistant`)
 *   - Strictly alternating roles
 *   - First message must be `user`
 *
 * Same pre-processing discipline as the Anthropic adapter.
 */
function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const merged = mergeConsecutive(messages)

  // Drop leading assistant turns so the transcript starts with `user`.
  while (merged.length > 0 && merged[0].role === 'assistant') {
    merged.shift()
  }
  if (merged.length === 0) {
    return [{ role: 'user', parts: [{ text: '(The customer has not sent a message yet.)' }] }]
  }

  return merged.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

/**
 * Call Google's Gemini generateContent endpoint with the caller's own
 * API key. Returns the raw assistant text + token usage (handoff parsing
 * happens in `generateReply`).
 *
 * Uses the REST API with `key=` query parameter — no SDK dependency,
 * consistent with the fetch-based approach of the OpenAI and Anthropic
 * adapters.
 */
export async function generateGoogle(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Google AI', res)
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null
  const text = data?.candidates?.[0]?.content?.parts
    ?.filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim()

  if (!text) {
    // Check for safety blocks — Gemini may refuse to generate and return
    // an empty candidate with a finishReason like SAFETY.
    const reason = data?.candidates?.[0]?.finishReason
    if (reason && reason !== 'STOP') {
      throw new AiError(`Google AI blocked the response (${reason}).`, {
        code: 'content_filtered',
        status: 502,
      })
    }
    throw new AiError('Google AI returned an empty response.', {
      code: 'empty_response',
    })
  }

  const usage = normalizeUsage({
    prompt: data?.usageMetadata?.promptTokenCount,
    completion: data?.usageMetadata?.candidatesTokenCount,
    total: data?.usageMetadata?.totalTokenCount,
  })

  return { text, usage }
}
