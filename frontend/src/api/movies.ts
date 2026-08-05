import { apiClient } from './client'
import type { MovieDetail, MovieSummary, PagedResult, Genre, Provider } from '../types/movie'

export const moviesApi = {
  getPopular: (providerKey: string, page: number, genreId?: number, signal?: AbortSignal) =>
    apiClient.get<PagedResult<MovieSummary>>(
      '/movies/popular?provider=' + providerKey + '&page=' + page + (genreId ? '&genre=' + genreId : ''),
      signal
    ),
  search: (query: string, page: number, signal?: AbortSignal) =>
    apiClient.get<PagedResult<MovieSummary>>(
      '/movies/search?query=' + encodeURIComponent(query) + '&page=' + page, signal
    ),
  getDetails: (tmdbId: number) => apiClient.get<MovieDetail>('/movies/' + tmdbId),
  getProviders: () => apiClient.get<Provider[]>('/providers'),
  getGenres: () => apiClient.get<Genre[]>('/genres')
}
