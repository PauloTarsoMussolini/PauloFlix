using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Data;
using MovieCatalog.Api.Services.Watchlist;

namespace MovieCatalog.Api.Tests.Services;

public class WatchlistServiceTests
{
    private static ApplicationDbContext BuildContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task AddAsync_AddsNewItem()
    {
        using var context = BuildContext();
        var service = new WatchlistService(context);

        await service.AddAsync("user-1", 550, CancellationToken.None);

        var ids = await service.GetTmdbMovieIdsAsync("user-1", CancellationToken.None);
        Assert.Equal(new List<int> { 550 }, ids);
    }

    [Fact]
    public async Task AddAsync_IsIdempotent_WhenCalledTwiceWithSameMovie()
    {
        using var context = BuildContext();
        var service = new WatchlistService(context);

        await service.AddAsync("user-1", 550, CancellationToken.None);
        await service.AddAsync("user-1", 550, CancellationToken.None);

        Assert.Equal(1, await context.WatchlistItems.CountAsync());
    }

    [Fact]
    public async Task RemoveAsync_RemovesExistingItem()
    {
        using var context = BuildContext();
        var service = new WatchlistService(context);
        await service.AddAsync("user-1", 550, CancellationToken.None);

        await service.RemoveAsync("user-1", 550, CancellationToken.None);

        Assert.Empty(await service.GetTmdbMovieIdsAsync("user-1", CancellationToken.None));
    }

    [Fact]
    public async Task RemoveAsync_IsNoOp_WhenItemDoesNotExist()
    {
        using var context = BuildContext();
        var service = new WatchlistService(context);

        await service.RemoveAsync("user-1", 999, CancellationToken.None);

        Assert.Empty(await service.GetTmdbMovieIdsAsync("user-1", CancellationToken.None));
    }
}
