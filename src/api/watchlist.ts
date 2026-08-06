import { apiClient } from './client'
import type { MovieSummary } from '../types/movie'

export const watchlistApi = {
  get: () => apiClient.get<MovieSummary[]>('/watchlist'),
  add: (tmdbId: number) => apiClient.post<void>('/watchlist/' + tmdbId),
  remove: (tmdbId: number) => apiClient.delete<void>('/watchlist/' + tmdbId)
}
