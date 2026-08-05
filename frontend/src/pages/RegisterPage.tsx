import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'

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
    } catch {
      setError('Nao foi possivel criar a conta. Verifique os dados e tente novamente.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Criar conta</h1>
      <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      {error && <p className="form-error">{error}</p>}
      <button type="submit">Criar conta</button>
    </form>
  )
}
