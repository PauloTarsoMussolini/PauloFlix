using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbClient : ITmdbClient
{
    private readonly HttpClient _http;
    private readonly TmdbOptions _options;

    public TmdbClient(HttpClient http, IOptions<TmdbOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<TmdbPagedResponse<TmdbMovieSummary>> DiscoverByProviderAsync(int tmdbProviderId, int? genreId, int page, CancellationToken ct)
    {
        var url = "discover/movie?watch_region=" + _options.WatchRegion + "&with_watch_providers=" + tmdbProviderId +
                  "&with_watch_monetization_types=flatrate&sort_by=popularity.desc&language=" + _options.Language + "&page=" + page;
        if (genreId.HasValue) url += "&with_genres=" + genreId.Value;

        var response = await _http.GetFromJsonAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbPagedResponse<TmdbMovieSummary>> SearchMoviesAsync(string query, int page, CancellationToken ct)
    {
        var url = "search/movie?query=" + Uri.EscapeDataString(query) + "&language=" + _options.Language + "&page=" + page;
        var response = await _http.GetFromJsonAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbMovieDetail> GetMovieDetailsAsync(int tmdbId, CancellationToken ct)
    {
        var url = "movie/" + tmdbId + "?append_to_response=credits,watch/providers&language=" + _options.Language;
        var response = await _http.GetFromJsonAsync<TmdbMovieDetail>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbGenresResponse> GetGenresAsync(CancellationToken ct)
    {
        var url = "genre/movie/list?language=" + _options.Language;
        var response = await _http.GetFromJsonAsync<TmdbGenresResponse>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }
}
