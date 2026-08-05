import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { useDebounce } from '../hooks/useDebounce'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import type { MovieSummary } from '../types/movie'
import MovieCard from '../components/MovieCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 400)
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    requestRef.current?.abort()
    if (!debouncedQuery) { setMovies([]); setPage(1); setTotalPages(1); return }

    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    moviesApi.search(debouncedQuery, 1, controller.signal)
      .then(result => {
        setMovies(result.results)
        setPage(1)
        setTotalPages(result.totalPages)
        setStatus('idle')
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })

    return () => controller.abort()
  }, [debouncedQuery])

  const loadMore = useCallback(() => {
    if (status === 'loading' || page >= totalPages) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    moviesApi.search(debouncedQuery, page + 1, controller.signal)
      .then(result => {
        setMovies(prev => [...prev, ...result.results])
        setPage(result.page)
        setStatus('idle')
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
  }, [debouncedQuery, page, totalPages, status])

  const sentinelRef = useInfiniteScroll(loadMore, page < totalPages)

  return (
    <div className="search-page">
      <input
        className="search-input"
        placeholder="Buscar filme..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="movie-grid">
        {movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath="/busca" />)}
      </div>
      {status === 'error' && <p>Nao foi possivel buscar agora. Tente novamente.</p>}
      <div ref={sentinelRef} />
      <Outlet />
    </div>
  )
}
