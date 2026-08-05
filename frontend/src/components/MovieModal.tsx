import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { ApiError } from '../api/client'
import { watchlistApi } from '../api/watchlist'
import { useAuth } from '../context/AuthContext'
import type { MovieDetail } from '../types/movie'

export default function MovieModal() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [watchlistStatus, setWatchlistStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle')
  const [watchlistError, setWatchlistError] = useState<string | null>(null)

  useEffect(() => {
    if (!tmdbId) return
    setStatus('loading')
    setWatchlistStatus('idle')
    setWatchlistError(null)
    moviesApi.getDetails(Number(tmdbId))
      .then(result => { setMovie(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [tmdbId])

  function close() {
    // location.key is 'default' when there is no prior in-app history entry
    // (a direct link, a new tab, or a refresh) - navigate(-1) in that case
    // would leave the app entirely instead of closing back to the parent page.
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

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
        setWatchlistError('Sua sessao expirou. Faca login novamente para adicionar a lista.')
      } else {
        setWatchlistError('Nao foi possivel adicionar a lista agora. Tente novamente.')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>&times;</button>
        {status === 'loading' && <p>Carregando...</p>}
        {status === 'error' && <p>Nao foi possivel carregar este filme agora.</p>}
        {status === 'ready' && movie && (
          <>
            {movie.backdropUrl && <img src={movie.backdropUrl} alt={movie.title} className="modal-backdrop" />}
            <h2>{movie.title}</h2>
            <p>{movie.releaseDate ? movie.releaseDate.slice(0, 4) : ''} - {movie.voteAverage.toFixed(1)}</p>
            <p>{movie.overview}</p>
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
            <h3>Elenco</h3>
            <div className="cast-row">
              {movie.cast.map(c => <div key={c.name}>{c.name} como {c.character}</div>)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
