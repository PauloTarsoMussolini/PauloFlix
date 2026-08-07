import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Nao foi possivel enviar agora. Tente novamente em alguns instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  // A API responde igual exista ou nao a conta, para nao revelar quais e-mails
  // estao cadastrados. A mensagem aqui acompanha isso e nao confirma nada.
  if (sent) {
    return (
      <div className="auth-form">
        <h1>Verifique seu e-mail</h1>
        <p className="form-hint">
          Se o e-mail informado tiver uma conta, voce recebera uma mensagem com o link para
          redefinir a senha. O link vale por 1 hora.
        </p>
        <Link to="/login" className="form-link">Voltar para o login</Link>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Esqueci a senha</h1>
      <p className="form-hint">
        Informe seu e-mail e enviaremos um link para voce criar uma senha nova.
      </p>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Enviar link'}
      </button>
      <Link to="/login" className="form-link">Voltar para o login</Link>
    </form>
  )
}
