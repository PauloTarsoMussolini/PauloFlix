import { useEffect, useRef, useState } from 'react'
import { moviesApi } from '../api/movies'
import type { MovieSummary } from '../types/movie'
import MovieCard from './MovieCard'

export default function MovieCarousel({ title, providerKey, basePath }: { title: string; providerKey: string; basePath: string }) {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    moviesApi.getPopular(providerKey, 1)
      .then(result => { if (!cancelled) { setMovies(result.results); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [providerKey])

  if (status === 'error') {
    return <p className="carousel-error">Não foi possível carregar "{title}" agora.</p>
  }

  function scrollBy(amount: number) {
    rowRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="carousel">
      <div className="carousel-header">
        <h2>{title}</h2>
      </div>
      <div className="carousel-row-wrap">
        <div className="carousel-row" ref={rowRef}>
          {status === 'loading'
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-poster" />
                <div className="skeleton-lines">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))
            : movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath={basePath} />)}
        </div>
        {status === 'ready' && movies.length > 0 && (
          <>
            <button type="button" className="carousel-arrow prev" onClick={() => scrollBy(-640)} aria-label={'Voltar em ' + title}>&#8249;</button>
            <button type="button" className="carousel-arrow next" onClick={() => scrollBy(640)} aria-label={'Avançar em ' + title}>&#8250;</button>
          </>
        )}
      </div>
    </section>
  )
}
