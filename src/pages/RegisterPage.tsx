import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'

export default function RegisterPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authApi.register(nome, email)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError && err.firstDescription
          ? err.firstDescription
          : 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // A API responde igual para e-mail novo, pendente ou ja cadastrado, para nao
  // permitir descobrir quem tem conta. A mensagem aqui nao afirma que enviamos.
  if (sent) {
    return (
      <div className="auth-form">
        <h1>Verifique seu e-mail</h1>
        <p className="form-hint">
          Se o e-mail informado for válido, você receberá uma mensagem com o link para criar
          sua senha e ativar a conta. O link vale por 1 hora.
        </p>
        <Link to="/login" className="form-link">Ir para o login</Link>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Criar conta</h1>
      <p className="form-hint">
        Enviaremos um link por e-mail para você confirmar o endereço e escolher sua senha.
      </p>
      <input
        type="text"
        placeholder="Nome"
        value={nome}
        onChange={e => setNome(e.target.value)}
        required
        minLength={2}
        maxLength={100}
        autoComplete="name"
      />
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
        {submitting ? 'Enviando...' : 'Criar conta'}
      </button>
    </form>
  )
}
