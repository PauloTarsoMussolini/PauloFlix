import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await authApi.register(email, password)
      login(result.token, result.email)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError && isStringArray(err.body)) {
        setError(err.body.join(' '))
      } else {
        setError('Nao foi possivel criar a conta. Verifique os dados e tente novamente.')
      }
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Criar conta</h1>
      <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      <p className="form-hint">
        A senha deve ter no minimo 6 caracteres e incluir ao menos um numero, uma letra minuscula,
        uma letra maiuscula e um caractere nao alfanumerico (ex: !, @, #).
      </p>
      {error && <p className="form-error">{error}</p>}
      <button type="submit">Criar conta</button>
    </form>
  )
}
