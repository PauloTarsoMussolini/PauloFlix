using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MovieCatalog.Api.Exceptions;
using MovieCatalog.Api.Models.Movies;

namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbService : ITmdbService
{
    private readonly ITmdbClient _client;
    private readonly IMemoryCache _cache;
    private readonly TmdbOptions _options;

    public TmdbService(ITmdbClient client, IMemoryCache cache, IOptions<TmdbOptions> options)
    {
        _client = client;
        _cache = cache;
        _options = options.Value;
    }

    public async Task<PagedResultDto<MovieSummaryDto>> GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct)
    {
        var provider = _options.Providers.FirstOrDefault(p => p.Key == providerKey)
            ?? throw new ArgumentException("Provedor desconhecido: " + providerKey, nameof(providerKey));

        var cacheKey = "popular:" + providerKey + ":" + (genreId?.ToString() ?? "all") + ":" + page;
        if (_cache.TryGetValue(cacheKey, out PagedResultDto<MovieSummaryDto>? cached))
            return cached!;

        TmdbPagedResponse<TmdbMovieSummary> raw;
        try
        {
            raw = await _client.DiscoverByProviderAsync(provider.TmdbProviderId, genreId, page, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TmdbUnavailableException("Nao foi possivel buscar filmes populares na TMDB.", ex);
        }

        var result = new PagedResultDto<MovieSummaryDto>(raw.Page, raw.TotalPages, raw.Results.Select(MapSummary).ToList());
        _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.PopularCacheHours));
        return result;
    }

    private static MovieSummaryDto MapSummary(TmdbMovieSummary m) => new(
        m.Id, m.Title, m.Overview,
        TmdbImageUrlBuilder.Poster(m.PosterPath),
        TmdbImageUrlBuilder.Backdrop(m.BackdropPath),
        m.ReleaseDate, m.VoteAverage);
}
