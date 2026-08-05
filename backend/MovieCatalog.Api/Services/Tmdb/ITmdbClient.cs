namespace MovieCatalog.Api.Services.Tmdb;

public interface ITmdbClient
{
    Task<TmdbPagedResponse<TmdbMovieSummary>> DiscoverByProviderAsync(int tmdbProviderId, int? genreId, int page, CancellationToken ct);
    Task<TmdbPagedResponse<TmdbMovieSummary>> SearchMoviesAsync(string query, int page, CancellationToken ct);
    Task<TmdbMovieDetail> GetMovieDetailsAsync(int tmdbId, CancellationToken ct);
    Task<TmdbGenresResponse> GetGenresAsync(CancellationToken ct);
}
