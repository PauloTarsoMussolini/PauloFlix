namespace MovieCatalog.Api.Models.Movies;

public record MovieDetailDto(
    int TmdbId,
    string Title,
    string Overview,
    string? PosterUrl,
    string? BackdropUrl,
    string? ReleaseDate,
    double VoteAverage,
    int? RuntimeMinutes,
    List<GenreDto> Genres,
    List<CastMemberDto> Cast,
    List<ProviderDto> WatchProviders,
    string? WatchLink);
