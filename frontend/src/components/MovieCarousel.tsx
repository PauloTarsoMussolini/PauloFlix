import { useEffect, useState } from 'react'
import { moviesApi } from '../api/movies'
import type { MovieSummary } from '../types/movie'
import MovieCard from './MovieCard'

export default function MovieCarousel({ title, providerKey, basePath }: { title: string; providerKey: string; basePath: string }) {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    moviesApi.getPopular(providerKey, 1)
      .then(result => { if (!cancelled) { setMovies(result.results); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [providerKey])

  if (status === 'error') {
    return <p className="carousel-error">Nao foi possivel carregar "{title}" agora.</p>
  }

  return (
    <section className="carousel">
      <h2>{title}</h2>
      <div className="carousel-row">
        {status === 'loading'
          ? <p>Carregando...</p>
          : movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath={basePath} />)}
      </div>
    </section>
  )
}
