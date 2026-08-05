namespace MovieCatalog.Api.Models.Movies;

public record MovieSummaryDto(
    int TmdbId,
    string Title,
    string Overview,
    string? PosterUrl,
    string? BackdropUrl,
    string? ReleaseDate,
    double VoteAverage);
