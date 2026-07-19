import type { ErrorEnvelope } from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let envelope: ErrorEnvelope | null = null
    try {
      envelope = await res.json()
    } catch {
      // response body wasn't JSON — fall through to generic error below
    }
    throw new ApiError(
      envelope?.error?.code ?? 'unknown_error',
      envelope?.error?.message ?? res.statusText,
      res.status,
    )
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string): Promise<T> {
    return fetch(`${API_BASE}${path}`).then((res) => handle<T>(res))
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((res) => handle<T>(res))
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => handle<T>(res))
  },

  delete<T>(path: string): Promise<T> {
    return fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then((res) => handle<T>(res))
  },

  upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${API_BASE}${path}`, { method: 'POST', body: form }).then((res) => handle<T>(res))
  },
}

export { API_BASE }
