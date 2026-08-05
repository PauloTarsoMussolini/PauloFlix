const BASE_URL = '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (authToken) headers.set('Authorization', 'Bearer ' + authToken)

  const response = await fetch(BASE_URL + path, { ...options, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => undefined)
    throw new ApiError(response.status, body, 'Erro na requisicao: ' + response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}
