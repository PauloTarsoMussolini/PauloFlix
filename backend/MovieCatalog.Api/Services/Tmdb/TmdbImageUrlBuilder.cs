namespace MovieCatalog.Api.Services.Tmdb;

public static class TmdbImageUrlBuilder
{
    private const string BaseUrl = "https://image.tmdb.org/t/p/";

    public static string? Poster(string? path) => path is null ? null : BaseUrl + "w342" + path;
    public static string? Backdrop(string? path) => path is null ? null : BaseUrl + "w1280" + path;
    public static string? Profile(string? path) => path is null ? null : BaseUrl + "w185" + path;
}
