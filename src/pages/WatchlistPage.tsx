import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { watchlistApi } from '../api/watchlist'
import type { MovieSummary } from '../types/movie'
import MovieCard from '../components/MovieCard'

export default function WatchlistPage() {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    watchlistApi.get()
      .then(result => { setMovies(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [])

  async function remove(tmdbId: number) {
    setRemoveError(null)
    try {
      await watchlistApi.remove(tmdbId)
      setMovies(prev => prev.filter(m => m.tmdbId !== tmdbId))
    } catch {
      // Removal failed - the item is still on the backend list, so leave it
      // in local state too and just surface the error instead of an
      // unhandled rejection.
      setRemoveError('Não foi possível remover o filme agora. Tente novamente.')
    }
  }

  if (status === 'error') return <p className="state-message">Não foi possível carregar sua lista agora.</p>

  return (
    <div className="watchlist-page">
      <div className="page-heading">
        <h1>Minha lista</h1>
      </div>
      {removeError && <p className="form-error">{removeError}</p>}
      {status === 'ready' && movies.length === 0 && (
        <div className="empty-state">
          <h2>Sua lista está vazia</h2>
          <p>Adicione filmes a partir da busca ou dos streamings para vê-los aqui.</p>
        </div>
      )}
      <div className="movie-grid">
        {status === 'loading' && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-poster" />
            <div className="skeleton-lines">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ))}
        {movies.map(movie => (
          <div key={movie.tmdbId} className="watchlist-item">
            <MovieCard movie={movie} basePath="/minha-lista" />
            <button onClick={() => remove(movie.tmdbId)}>Remover</button>
          </div>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
