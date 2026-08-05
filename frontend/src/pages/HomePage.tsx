import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import type { MovieSummary, Provider } from '../types/movie'
import HeroBanner from '../components/HeroBanner'
import MovieCarousel from '../components/MovieCarousel'
import { ErrorBoundary } from '../components/ErrorBoundary'

export default function HomePage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [heroMovie, setHeroMovie] = useState<MovieSummary | null>(null)

  useEffect(() => {
    moviesApi.getProviders()
      .then(loadedProviders => {
        setProviders(loadedProviders)
        if (loadedProviders.length > 0) {
          moviesApi.getPopular(loadedProviders[0].key, 1)
            .then(firstPage => setHeroMovie(firstPage.results[0] ?? null))
            .catch(() => setHeroMovie(null))
        }
      })
      .catch(() => setProviders([]))
  }, [])

  return (
    <div className="home-page">
      <HeroBanner movie={heroMovie} />
      {providers.map(provider => (
        <ErrorBoundary key={provider.key} fallback={<p className="carousel-error">Nao foi possivel carregar esta secao.</p>}>
          <MovieCarousel title={'Em alta na ' + provider.displayName} providerKey={provider.key} basePath="" />
        </ErrorBoundary>
      ))}
      <Outlet />
    </div>
  )
}
