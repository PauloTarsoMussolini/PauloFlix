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
      setRemoveError('Nao foi possivel remover o filme agora. Tente novamente.')
    }
  }

  if (status === 'loading') return <p>Carregando...</p>
  if (status === 'error') return <p>Nao foi possivel carregar sua lista agora.</p>

  return (
    <div className="watchlist-page">
      <h1>Minha Lista</h1>
      {removeError && <p className="form-error">{removeError}</p>}
      <div className="movie-grid">
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
