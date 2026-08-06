import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HeaderSearch from './HeaderSearch'
import MovieModal from './MovieModal'

export default function NavBar() {
  const { token, email, logout } = useAuth()
  const navigate = useNavigate()
  const [openMovieId, setOpenMovieId] = useState<number | null>(null)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <>
      <nav className="nav-bar">
        <Link to="/" className="nav-brand">PauloFlix</Link>
        <HeaderSearch onSelect={setOpenMovieId} />
        <div className="nav-links">
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
      {openMovieId !== null && (
        <MovieModal tmdbId={openMovieId} onClose={() => setOpenMovieId(null)} />
      )}
    </>
  )
}
