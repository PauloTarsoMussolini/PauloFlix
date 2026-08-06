import { useEffect, useState } from 'react'
import { moviesApi } from '../api/movies'
import { ApiError } from '../api/client'
import { watchlistApi } from '../api/watchlist'
import { useAuth } from '../context/AuthContext'
import type { MovieDetail } from '../types/movie'

export default function MovieModal({ tmdbId, onClose }: { tmdbId: number; onClose: () => void }) {
  const { token } = useAuth()
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [watchlistStatus, setWatchlistStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')
  const [watchlistError, setWatchlistError] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    setWatchlistStatus('idle')
    setWatchlistError(null)
    moviesApi.getDetails(tmdbId)
      .then(result => { setMovie(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [tmdbId])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function addToWatchlist() {
    if (!movie || !token) return
    setWatchlistStatus('adding')
    setWatchlistError(null)
    try {
      await watchlistApi.add(movie.tmdbId)
      setWatchlistStatus('added')
    } catch (err) {
      setWatchlistStatus('error')
      if (err instanceof ApiError && err.status === 401) {
        setWatchlistError('Sua sessão expirou. Faça login novamente para adicionar à lista.')
      } else {
        setWatchlistError('Não foi possível adicionar à lista agora. Tente novamente.')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        {status === 'loading' && <p className="state-message">Carregando...</p>}
        {status === 'error' && <p className="state-message">Não foi possível carregar este filme agora.</p>}
        {status === 'ready' && movie && (
          <>
            {movie.backdropUrl && <img src={movie.backdropUrl} alt={movie.title} className="modal-backdrop" />}
            <div className="modal-body">
              <h2>{movie.title}</h2>
              <div className="modal-meta">
                <span>{movie.releaseDate ? movie.releaseDate.slice(0, 4) : '----'}</span>
                {movie.runtimeMinutes && <span>&middot; {movie.runtimeMinutes} min</span>}
                <span className="rating-badge">{movie.voteAverage.toFixed(1)}</span>
              </div>
              {movie.genres.length > 0 && (
                <div className="badge-row">
                  {movie.genres.map(g => <span key={g.id} className="badge">{g.name}</span>)}
                </div>
              )}
              <p className="modal-overview">{movie.overview}</p>
              {movie.watchProviders.length > 0 && (
                movie.watchLink ? (
                  <a
                    href={movie.watchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-providers modal-providers-link"
                    title="Ver onde assistir"
                  >
                    {movie.watchProviders.map(p => <span key={p.key} className="provider-badge">{p.displayName}</span>)}
                  </a>
                ) : (
                  <div className="modal-providers">
                    {movie.watchProviders.map(p => <span key={p.key} className="provider-badge">{p.displayName}</span>)}
                  </div>
                )
              )}
              {token && (
                <div className="watchlist-action">
                  <button onClick={addToWatchlist} disabled={watchlistStatus === 'adding' || watchlistStatus === 'added'}>
                    {watchlistStatus === 'added' ? 'Adicionado' : watchlistStatus === 'adding' ? 'Adicionando...' : '+ Minha Lista'}
                  </button>
                  {watchlistStatus === 'error' && watchlistError && <p className="form-error">{watchlistError}</p>}
                </div>
              )}
              {movie.cast.length > 0 && (
                <>
                  <h3>Elenco</h3>
                  <div className="cast-row">
                    {movie.cast.map(c => (
                      <div key={c.name} className="cast-chip">{c.name} <span>como {c.character}</span></div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
