import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import type { MovieSummary, Provider, Genre } from '../types/movie'
import MovieCard from '../components/MovieCard'
import ProviderFilter from '../components/ProviderFilter'

export default function BrowsePage() {
  const { providerKey } = useParams<{ providerKey: string }>()
  const [providers, setProviders] = useState<Provider[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [genreId, setGenreId] = useState<number | undefined>(undefined)
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading')
  // Shared across the provider/genre effect and loadMore so either one can
  // cancel whichever request (of either kind) is currently in flight - a
  // provider/genre change must not let a stale loadMore page land after it.
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    moviesApi.getProviders().then(setProviders).catch(() => setProviders([]))
    moviesApi.getGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    requestRef.current?.abort()
    if (!providerKey) return
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    setMovies([])
    setPage(1)
    moviesApi.getPopular(providerKey, 1, genreId, controller.signal)
      .then(result => { setMovies(result.results); setTotalPages(result.totalPages); setStatus('idle') })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [providerKey, genreId])

  const loadMore = useCallback(() => {
    if (!providerKey || status === 'loading' || page >= totalPages) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    moviesApi.getPopular(providerKey, page + 1, genreId, controller.signal)
      .then(result => {
        setMovies(prev => [...prev, ...result.results])
        setPage(result.page)
        setStatus('idle')
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
  }, [providerKey, genreId, page, totalPages, status])

  const sentinelRef = useInfiniteScroll(loadMore, page < totalPages)

  return (
    <div className="browse-page">
      <ProviderFilter providers={providers} activeKey={providerKey} />
      <select value={genreId ?? ''} onChange={e => setGenreId(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Todos os generos</option>
        {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {status === 'idle' && movies.length === 0 && (
        <div className="empty-state">
          <h2>Nenhum filme por aqui</h2>
          <p>Tente outro genero ou streaming.</p>
        </div>
      )}
      <div className="movie-grid">
        {movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath={'/streaming/' + providerKey} />)}
        {status === 'loading' && movies.length === 0 && Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-poster" />
            <div className="skeleton-lines">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
      {status === 'error' && <p className="state-message">Nao foi possivel carregar agora. Tente novamente.</p>}
      <div ref={sentinelRef} />
      <Outlet />
    </div>
  )
}
