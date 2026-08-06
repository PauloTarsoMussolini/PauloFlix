import { Link } from 'react-router-dom'
import type { MovieSummary } from '../types/movie'

export default function HeroBanner({ movie }: { movie: MovieSummary | null }) {
  if (!movie) return null
  return (
    <div className="hero-banner" style={{ backgroundImage: movie.backdropUrl ? 'url(' + movie.backdropUrl + ')' : undefined }}>
      <div className="hero-banner-content">
        <span className="hero-eyebrow">Em alta agora</span>
        <h1>{movie.title}</h1>
        <p>{movie.overview}</p>
        <Link to={'/filme/' + movie.tmdbId} className="hero-cta">Ver detalhes</Link>
      </div>
    </div>
  )
}
