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

    public async Task<MovieDetailDto> GetMovieDetailsAsync(int tmdbId, CancellationToken ct)
    {
        var cacheKey = "detail:" + tmdbId;
        if (_cache.TryGetValue(cacheKey, out MovieDetailDto? cached))
            return cached!;

        TmdbMovieDetail raw;
        try
        {
            raw = await _client.GetMovieDetailsAsync(tmdbId, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TmdbUnavailableException("Nao foi possivel buscar detalhes do filme " + tmdbId + " na TMDB.", ex);
        }

        var providerByTmdbId = _options.Providers.ToDictionary(p => p.TmdbProviderId);
        var regionWatchProviders = raw.WatchProviders?.Results.GetValueOrDefault(_options.WatchRegion);
        var flatrate = regionWatchProviders?.Flatrate ?? new();
        var providers = flatrate
            .Where(p => providerByTmdbId.ContainsKey(p.ProviderId))
            .Select(p => new ProviderDto(providerByTmdbId[p.ProviderId].Key, providerByTmdbId[p.ProviderId].DisplayName))
            .ToList();
        var watchLink = regionWatchProviders?.Link;

        var cast = (raw.Credits?.Cast ?? new())
            .OrderBy(c => c.Order)
            .Take(10)
            .Select(c => new CastMemberDto(c.Name, c.Character, TmdbImageUrlBuilder.Profile(c.ProfilePath)))
            .ToList();

        var result = new MovieDetailDto(
            raw.Id, raw.Title, raw.Overview,
            TmdbImageUrlBuilder.Poster(raw.PosterPath),
            TmdbImageUrlBuilder.Backdrop(raw.BackdropPath),
            raw.ReleaseDate, raw.VoteAverage, raw.Runtime,
            raw.Genres.Select(g => new GenreDto(g.Id, g.Name)).ToList(),
            cast, providers, watchLink);

        _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.DetailCacheHours));
        return result;
    }

    public async Task<PagedResultDto<MovieSummaryDto>> SearchMoviesAsync(string query, int page, CancellationToken ct)
    {
        var cacheKey = "search:" + query + ":" + page;
        if (_cache.TryGetValue(cacheKey, out PagedResultDto<MovieSummaryDto>? cached))
            return cached!;

        TmdbPagedResponse<TmdbMovieSummary> raw;
        try
        {
            raw = await _client.SearchMoviesAsync(query, page, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TmdbUnavailableException("Nao foi possivel buscar filmes na TMDB.", ex);
        }

        var result = new PagedResultDto<MovieSummaryDto>(raw.Page, raw.TotalPages, raw.Results.Select(MapSummary).ToList());
        _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.PopularCacheHours));
        return result;
    }

    public async Task<List<GenreDto>> GetGenresAsync(CancellationToken ct)
    {
        const string cacheKey = "genres";
        if (_cache.TryGetValue(cacheKey, out List<GenreDto>? cached))
            return cached!;

        TmdbGenresResponse raw;
        try
        {
            raw = await _client.GetGenresAsync(ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TmdbUnavailableException("Nao foi possivel buscar generos na TMDB.", ex);
        }

        var result = raw.Genres.Select(g => new GenreDto(g.Id, g.Name)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromDays(_options.StaticCacheDays));
        return result;
    }

    public List<ProviderDto> GetProviders() =>
        _options.Providers.Select(p => new ProviderDto(p.Key, p.DisplayName)).ToList();
}
