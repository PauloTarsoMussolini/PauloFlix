const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export interface ApiErrorDetail {
  code: string
  description: string
}

export class ApiError extends Error {
  status: number
  body: unknown
  /** Discriminador de negocio da API, vindo de ProblemDetails.extensions.code. */
  code: string | null
  /** Erros detalhados: codigos do Identity para senha, ou validacao de modelo. */
  details: ApiErrorDetail[]

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.code = extractCode(body)
    this.details = extractDetails(body)
  }

  /** Primeira descricao aproveitavel, ou null se a resposta nao trouxe nenhuma. */
  get firstDescription(): string | null {
    return this.details[0]?.description ?? null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractCode(body: unknown): string | null {
  if (!isRecord(body)) return null
  return typeof body.code === 'string' ? body.code : null
}

// A API responde erro em dois formatos, e os dois chegam aqui:
// ProblemDetails com "errors" sendo a lista { code, description } dos erros de
// negocio, e ValidationProblemDetails com "errors" sendo um mapa campo ->
// mensagens, gerado automaticamente pelo [ApiController] na validacao do body.
function extractDetails(body: unknown): ApiErrorDetail[] {
  if (!isRecord(body)) return []
  const errors = body.errors

  if (Array.isArray(errors)) {
    return errors
      .filter(isRecord)
      .map(item => ({
        code: typeof item.code === 'string' ? item.code : '',
        description: typeof item.description === 'string' ? item.description : ''
      }))
      .filter(detail => detail.description !== '')
  }

  if (isRecord(errors)) {
    return Object.entries(errors).flatMap(([field, messages]) =>
      Array.isArray(messages)
        ? messages
            .filter((message): message is string => typeof message === 'string')
            .map(description => ({ code: field, description }))
        : []
    )
  }

  return []
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
