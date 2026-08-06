import { Link } from 'react-router-dom'
import type { MovieSummary } from '../types/movie'

export default function MovieCard({ movie, basePath }: { movie: MovieSummary; basePath: string }) {
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '----'
  return (
    <Link to={basePath + '/filme/' + movie.tmdbId} className="movie-card">
      <div className="movie-card-media">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        ) : (
          <div className="movie-card-placeholder">{movie.title}</div>
        )}
      </div>
      <div className="movie-card-seam" aria-hidden="true" />
      <div className="movie-card-meta">
        <p className="movie-card-title">{movie.title}</p>
        <div className="movie-card-sub">
          <span>{year}</span>
          <span className="rating-badge">{movie.voteAverage.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  )
}
