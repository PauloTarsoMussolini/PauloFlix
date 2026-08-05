using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MovieCatalog.Api.Exceptions;
using MovieCatalog.Api.Services.Tmdb;

namespace MovieCatalog.Api.Tests.Services;

public class TmdbServiceTests
{
    private static TmdbOptions BuildOptions() => new()
    {
        WatchRegion = "BR",
        Language = "pt-BR",
        PopularCacheHours = 6,
        DetailCacheHours = 24,
        StaticCacheDays = 7,
        Providers = new List<TmdbProviderOption>
        {
            new() { Key = "netflix", DisplayName = "Netflix", TmdbProviderId = 8 }
        }
    };

    private static TmdbPagedResponse<TmdbMovieSummary> BuildRawPage() => new(
        1,
        new List<TmdbMovieSummary> { new(1, "Filme Teste", "Sinopse", "/poster.jpg", "/backdrop.jpg", "2024-01-01", 8.5) },
        1,
        1);

    [Fact]
    public async Task GetPopularByProviderAsync_CallsClientOnce_WhenCacheMisses()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildRawPage());

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        var result = await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);

        Assert.Single(result.Results);
        Assert.Equal("Filme Teste", result.Results[0].Title);
        client.Verify(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPopularByProviderAsync_UsesCache_OnSecondCall()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildRawPage());

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);
        await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);

        client.Verify(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPopularByProviderAsync_ThrowsTmdbUnavailable_WhenClientFails()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await Assert.ThrowsAsync<TmdbUnavailableException>(
            () => service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None));
    }

    [Fact]
    public async Task GetPopularByProviderAsync_ThrowsArgumentException_ForUnknownProvider()
    {
        var client = new Mock<ITmdbClient>();
        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GetPopularByProviderAsync("hulu", null, 1, CancellationToken.None));
    }

    [Fact]
    public async Task GetMovieDetailsAsync_MapsCastAndFiltersProvidersToConfigured()
    {
        var raw = new TmdbMovieDetail(
            42, "Filme Detalhado", "Sinopse completa", "/poster.jpg", "/backdrop.jpg", "2023-05-01", 7.9, 120,
            new List<TmdbGenre> { new(28, "Acao") },
            new TmdbCredits(new List<TmdbCastMember>
            {
                new(1, "Ator Um", "Personagem Um", "/ator1.jpg", 0),
                new(2, "Ator Dois", "Personagem Dois", null, 1)
            }),
            new TmdbWatchProvidersResult(new Dictionary<string, TmdbWatchProviderRegion>
            {
                ["BR"] = new TmdbWatchProviderRegion(new List<TmdbWatchProvider>
                {
                    new(8, "Netflix"),
                    new(9999, "Servico Nao Curado")
                })
            }));

        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(raw);

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        var result = await service.GetMovieDetailsAsync(42, CancellationToken.None);

        Assert.Equal("Filme Detalhado", result.Title);
        Assert.Equal(2, result.Cast.Count);
        Assert.Single(result.WatchProviders);
        Assert.Equal("netflix", result.WatchProviders[0].Key);
    }

    [Fact]
    public async Task GetMovieDetailsAsync_UsesCache_OnSecondCall()
    {
        var raw = new TmdbMovieDetail(42, "Filme", "Sinopse", null, null, "2023-01-01", 7.0, null,
            new List<TmdbGenre>(), new TmdbCredits(new List<TmdbCastMember>()), null);

        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(raw);

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await service.GetMovieDetailsAsync(42, CancellationToken.None);
        await service.GetMovieDetailsAsync(42, CancellationToken.None);

        client.Verify(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>()), Times.Once);
    }
}
