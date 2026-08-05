namespace MovieCatalog.Api.Services.Watchlist;

public interface IWatchlistService
{
    Task<List<int>> GetTmdbMovieIdsAsync(string userId, CancellationToken ct);
    Task AddAsync(string userId, int tmdbMovieId, CancellationToken ct);
    Task RemoveAsync(string userId, int tmdbMovieId, CancellationToken ct);
}
