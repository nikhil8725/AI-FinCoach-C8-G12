import { useCallback, useRef, useState } from 'react'
import { streamSSE } from '../lib/sse'

interface SSEHandlers<T> {
  onEvent: (event: T) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/** Drives a POST-based SSE stream (analysis run, chat completion) from a user action. */
export function useSSE<T = unknown>() {
  const [isStreaming, setIsStreaming] = useState(false)
  const cancelledRef = useRef(false)

  const start = useCallback(async (path: string, body: unknown, handlers: SSEHandlers<T>) => {
    cancelledRef.current = false
    setIsStreaming(true)
    try {
      for await (const event of streamSSE(path, body)) {
        if (cancelledRef.current) break
        handlers.onEvent(event as T)
      }
      if (!cancelledRef.current) handlers.onDone?.()
    } catch (err) {
      if (!cancelledRef.current) {
        handlers.onError?.(err instanceof Error ? err.message : 'Stream failed')
      }
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setIsStreaming(false)
  }, [])

  return { start, cancel, isStreaming }
}
