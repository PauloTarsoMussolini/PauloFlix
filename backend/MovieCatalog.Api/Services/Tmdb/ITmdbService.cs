using MovieCatalog.Api.Models.Movies;

namespace MovieCatalog.Api.Services.Tmdb;

public interface ITmdbService
{
    Task<PagedResultDto<MovieSummaryDto>> GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct);
    Task<MovieDetailDto> GetMovieDetailsAsync(int tmdbId, CancellationToken ct);
    Task<PagedResultDto<MovieSummaryDto>> SearchMoviesAsync(string query, int page, CancellationToken ct);
    Task<List<GenreDto>> GetGenresAsync(CancellationToken ct);
    List<ProviderDto> GetProviders();
}
