namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbOptions
{
    public const string SectionName = "Tmdb";

    public string ReadAccessToken { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.themoviedb.org/3/";
    public string WatchRegion { get; set; } = "BR";
    public string Language { get; set; } = "pt-BR";
    public int PopularCacheHours { get; set; } = 6;
    public int DetailCacheHours { get; set; } = 24;
    public int StaticCacheDays { get; set; } = 7;
    public List<TmdbProviderOption> Providers { get; set; } = new();
}

public class TmdbProviderOption
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int TmdbProviderId { get; set; }
}
