using System.Text.Json.Serialization;

namespace MovieCatalog.Api.Services.Tmdb;

public record TmdbPagedResponse<T>(
    [property: JsonPropertyName("page")] int Page,
    [property: JsonPropertyName("results")] List<T> Results,
    [property: JsonPropertyName("total_pages")] int TotalPages,
    [property: JsonPropertyName("total_results")] int TotalResults);

public record TmdbMovieSummary(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("overview")] string Overview,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("vote_average")] double VoteAverage);

public record TmdbGenre(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name);

public record TmdbGenresResponse(
    [property: JsonPropertyName("genres")] List<TmdbGenre> Genres);

public record TmdbCastMember(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("character")] string Character,
    [property: JsonPropertyName("profile_path")] string? ProfilePath,
    [property: JsonPropertyName("order")] int Order);

public record TmdbCredits(
    [property: JsonPropertyName("cast")] List<TmdbCastMember> Cast);

public record TmdbWatchProvider(
    [property: JsonPropertyName("provider_id")] int ProviderId,
    [property: JsonPropertyName("provider_name")] string ProviderName);

public record TmdbWatchProviderRegion(
    [property: JsonPropertyName("flatrate")] List<TmdbWatchProvider>? Flatrate);

public record TmdbWatchProvidersResult(
    [property: JsonPropertyName("results")] Dictionary<string, TmdbWatchProviderRegion> Results);

public record TmdbMovieDetail(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("overview")] string Overview,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("vote_average")] double VoteAverage,
    [property: JsonPropertyName("runtime")] int? Runtime,
    [property: JsonPropertyName("genres")] List<TmdbGenre> Genres,
    [property: JsonPropertyName("credits")] TmdbCredits? Credits,
    [property: JsonPropertyName("watch/providers")] TmdbWatchProvidersResult? WatchProviders);
