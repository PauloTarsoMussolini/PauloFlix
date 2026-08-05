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
}
