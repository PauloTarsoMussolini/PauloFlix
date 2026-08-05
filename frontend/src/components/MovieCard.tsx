import { Link } from 'react-router-dom'
import type { MovieSummary } from '../types/movie'

export default function MovieCard({ movie, basePath }: { movie: MovieSummary; basePath: string }) {
  return (
    <Link to={basePath + '/filme/' + movie.tmdbId} className="movie-card">
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
      ) : (
        <div className="movie-card-placeholder">{movie.title}</div>
      )}
    </Link>
  )
}
