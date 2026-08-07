import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { AuthResponse } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_RULES_TEXT, validatePassword } from '../validation/password'

interface Props {
  title: string
  intro: string
  submitLabel: string
  /** Consome o link e devolve a sessao ja autenticada. */
  onSubmit: (
    userId: string,
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<AuthResponse>
  /** Para onde mandar quem chegou com um link expirado ou invalido. */
  recoveryPath: string
}

/**
 * Base das telas de ativacao de conta e de redefinicao de senha. As duas leem
 * uid e token da query string do link enviado por e-mail, aplicam a mesma
 * politica de senha e terminam com o usuario autenticado — so mudam o texto e
 * qual endpoint chamam.
 */
export default function PasswordSetupForm({
  title,
  intro,
  submitLabel,
  onSubmit,
  recoveryPath
}: Props) {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('uid')
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [linkExpired, setLinkExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  if (!userId || !token) {
    return (
      <div className="auth-form">
        <h1>Link invalido</h1>
        <p className="form-hint">
          Este endereco esta incompleto. Abra o link exatamente como ele chegou no seu e-mail.
        </p>
        <Link to={recoveryPath} className="form-link">Solicitar um novo link</Link>
      </div>
    )
  }

  if (linkExpired) {
    return (
      <div className="auth-form">
        <h1>Link expirado</h1>
        <p className="form-hint">
          Este link nao vale mais — ele expira 1 hora depois de ser enviado, e so pode ser
          usado uma vez. Peca um novo para continuar.
        </p>
        <Link to={recoveryPath} className="form-link">Solicitar um novo link</Link>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const problems = validatePassword(password)
    if (password !== confirmPassword) problems.push('As senhas nao conferem.')
    if (problems.length > 0) {
      setErrors(problems)
      return
    }

    setErrors([])
    setSubmitting(true)
    try {
      const result = await onSubmit(userId!, token!, password, confirmPassword)
      login(result.token, result.email, result.nome)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_token') {
        setLinkExpired(true)
        return
      }
      setErrors(
        err instanceof ApiError && err.details.length > 0
          ? err.details.map(detail => detail.description)
          : ['Nao foi possivel concluir. Tente novamente.']
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>{title}</h1>
      <p className="form-hint">{intro}</p>
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Repita a senha"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <p className="form-hint">{PASSWORD_RULES_TEXT}</p>
      {errors.length > 0 && (
        <ul className="form-error">
          {errors.map(message => <li key={message}>{message}</li>)}
        </ul>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : submitLabel}
      </button>
    </form>
  )
}
