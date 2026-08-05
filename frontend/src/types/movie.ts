export interface MovieSummary {
  tmdbId: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string | null
  voteAverage: number
}

export interface PagedResult<T> {
  page: number
  totalPages: number
  results: T[]
}

export interface Genre {
  id: number
  name: string
}

export interface Provider {
  key: string
  displayName: string
}

export interface CastMember {
  name: string
  character: string
  profileUrl: string | null
}

export interface MovieDetail {
  tmdbId: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string | null
  voteAverage: number
  runtimeMinutes: number | null
  genres: Genre[]
  cast: CastMember[]
  watchProviders: Provider[]
}
