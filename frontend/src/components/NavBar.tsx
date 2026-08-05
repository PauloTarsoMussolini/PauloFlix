import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { token, email, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav-bar">
      <Link to="/" className="nav-brand">Catalogo</Link>
      <div className="nav-links">
        <Link to="/busca">Buscar</Link>
        {token && <Link to="/minha-lista">Minha Lista</Link>}
        {token ? (
          <>
            <span className="nav-user">{email}</span>
            <button onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login">Entrar</Link>
            <Link to="/cadastro">Criar conta</Link>
          </>
        )}
      </div>
    </nav>
  )
}
