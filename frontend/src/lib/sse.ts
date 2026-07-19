import { API_BASE } from './api'

/**
 * POST-based SSE reader. The browser's EventSource only supports GET, but
 * /api/analyze and /api/chat are POST endpoints, so we parse the
 * `text/event-stream` body ourselves via fetch + ReadableStream.
 */
export async function* streamSSE(path: string, body?: unknown): AsyncGenerator<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok || !res.body) {
    throw new Error(`SSE request to ${path} failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const chunk of events) {
      const dataLines = chunk
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
      if (dataLines.length === 0) continue
      yield JSON.parse(dataLines.join('\n'))
    }
  }
}
