import { apiClient } from './client'

export interface AuthResponse {
  token: string
  email: string
  nome: string
}

/**
 * Resposta generica de register, resend-activation e forgot-password. A API
 * responde a mesma mensagem em todos os casos, de proposito: qualquer diferenca
 * entre "e-mail existe" e "nao existe" permitiria mapear a base de usuarios.
 */
export interface MessageResponse {
  message: string
}

export const authApi = {
  register: (nome: string, email: string) =>
    apiClient.post<MessageResponse>('/auth/register', { nome, email }),

  resendActivation: (email: string) =>
    apiClient.post<MessageResponse>('/auth/resend-activation', { email }),

  activate: (userId: string, token: string, password: string, confirmPassword: string) =>
    apiClient.post<AuthResponse>('/auth/activate', { userId, token, password, confirmPassword }),

  forgotPassword: (email: string) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', { email }),

  resetPassword: (userId: string, token: string, password: string, confirmPassword: string) =>
    apiClient.post<AuthResponse>('/auth/reset-password', { userId, token, password, confirmPassword }),

  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password })
}
