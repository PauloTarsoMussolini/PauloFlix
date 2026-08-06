import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { moviesApi } from '../api/movies'
import { useDebounce } from '../hooks/useDebounce'
import type { MovieSummary } from '../types/movie'

export default function HeaderSearch({ onSelect }: { onSelect: (tmdbId: number) => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 350)
  const [results, setResults] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    requestRef.current?.abort()
    if (!debouncedQuery.trim()) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    moviesApi.search(debouncedQuery, 1, controller.signal)
      .then(result => {
        setResults(result.results.slice(0, 8))
        setStatus('ready')
        setActiveIndex(-1)
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectMovie(movie: MovieSummary) {
    onSelect(movie.tmdbId)
    setOpen(false)
    inputRef.current?.blur()
  }

  function clear() {
    setQuery('')
    setResults([])
    setStatus('idle')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectMovie(results[activeIndex] ?? results[0])
    }
  }

  const showDropdown = open && query.trim().length > 0
  const activeId = activeIndex >= 0 && results[activeIndex] ? 'nav-search-option-' + results[activeIndex].tmdbId : undefined

  return (
    <div className="nav-search" ref={wrapRef}>
      <div className="nav-search-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="nav-search-input"
          placeholder="Buscar filme..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="nav-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="Buscar filme"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="nav-search-clear" onClick={clear} aria-label="Limpar busca">
            &times;
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="nav-search-dropdown" id="nav-search-listbox" role="listbox">
          {status === 'loading' && <p className="nav-search-status">Buscando...</p>}
          {status === 'error' && <p className="nav-search-status">Não foi possível buscar agora.</p>}
          {status === 'ready' && results.length === 0 && <p className="nav-search-status">Nenhum filme encontrado.</p>}
          {results.length > 0 && (
            <>
              <ul className="nav-search-results">
                {results.map((movie, i) => (
                  <li key={movie.tmdbId}>
                    <button
                      type="button"
                      id={'nav-search-option-' + movie.tmdbId}
                      role="option"
                      aria-selected={i === activeIndex}
                      className={'nav-search-item' + (i === activeIndex ? ' active' : '')}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => selectMovie(movie)}
                    >
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt="" />
                      ) : (
                        <span className="nav-search-item-placeholder" aria-hidden="true" />
                      )}
                      <span className="nav-search-item-info">
                        <span className="nav-search-item-title">{movie.title}</span>
                        <span className="nav-search-item-sub">
                          <span>{movie.releaseDate ? movie.releaseDate.slice(0, 4) : '----'}</span>
                          <span className="rating-badge">{movie.voteAverage.toFixed(1)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="nav-search-hint">&uarr;&darr; navegar &middot; &crarr; abrir &middot; esc fechar</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
