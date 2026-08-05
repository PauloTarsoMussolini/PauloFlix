using MovieCatalog.Api.Models.Movies;

namespace MovieCatalog.Api.Services.Tmdb;

public interface ITmdbService
{
    Task<PagedResultDto<MovieSummaryDto>> GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct);
}
