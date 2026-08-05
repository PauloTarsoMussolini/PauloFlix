namespace MovieCatalog.Api.Models.Movies;

public record PagedResultDto<T>(int Page, int TotalPages, List<T> Results);
