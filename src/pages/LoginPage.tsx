import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

type ResendState = 'idle' | 'sending' | 'sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsActivation, setNeedsActivation] = useState(false)
  const [resend, setResend] = useState<ResendState>('idle')
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNeedsActivation(false)
    setResend('idle')
    setSubmitting(true)
    try {
      const result = await authApi.login(email, password)
      login(result.token, result.email, result.nome)
      navigate('/')
    } catch (err) {
      // A senha estava certa, mas a conta nunca foi ativada. A API so responde
      // 403 depois de conferir a senha, entao chegar aqui ja prova a credencial.
      if (err instanceof ApiError && err.code === 'email_not_confirmed') {
        setNeedsActivation(true)
        setError('Sua conta ainda nao foi ativada. Confirme seu e-mail para entrar.')
      } else {
        setError('E-mail ou senha invalidos.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResend('sending')
    try {
      await authApi.resendActivation(email)
    } catch {
      // O reenvio responde igual em qualquer caso; um erro de rede nao deve
      // sugerir ao usuario que o e-mail dele nao existe.
    }
    setResend('sent')
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Entrar</h1>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {error && <p className="form-error">{error}</p>}
      {needsActivation && (
        resend === 'sent' ? (
          <p className="form-hint">
            Enviamos um novo link de ativacao para {email}. Ele vale por 1 hora.
          </p>
        ) : (
          <button type="button" className="link-button" onClick={handleResend} disabled={resend === 'sending'}>
            {resend === 'sending' ? 'Enviando...' : 'Reenviar link de ativacao'}
          </button>
        )
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
      <Link to="/esqueci-senha" className="form-link">Esqueci a senha</Link>
    </form>
  )
}
