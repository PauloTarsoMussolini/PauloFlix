import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { watchlistApi } from '../api/watchlist'
import type { MovieSummary } from '../types/movie'
import MovieCard from '../components/MovieCard'

export default function WatchlistPage() {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    watchlistApi.get()
      .then(result => { setMovies(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [])

  async function remove(tmdbId: number) {
    await watchlistApi.remove(tmdbId)
    setMovies(prev => prev.filter(m => m.tmdbId !== tmdbId))
  }

  if (status === 'loading') return <p>Carregando...</p>
  if (status === 'error') return <p>Nao foi possivel carregar sua lista agora.</p>

  return (
    <div className="watchlist-page">
      <h1>Minha Lista</h1>
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
