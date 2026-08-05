using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Data;

namespace MovieCatalog.Api.Services.Watchlist;

public class WatchlistService : IWatchlistService
{
    private readonly ApplicationDbContext _context;

    public WatchlistService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<int>> GetTmdbMovieIdsAsync(string userId, CancellationToken ct)
    {
        return await _context.WatchlistItems
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => w.TmdbMovieId)
            .ToListAsync(ct);
    }

    public async Task AddAsync(string userId, int tmdbMovieId, CancellationToken ct)
    {
        var exists = await _context.WatchlistItems
            .AnyAsync(w => w.UserId == userId && w.TmdbMovieId == tmdbMovieId, ct);
        if (exists) return;

        _context.WatchlistItems.Add(new WatchlistItem
        {
            UserId = userId,
            TmdbMovieId = tmdbMovieId,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(string userId, int tmdbMovieId, CancellationToken ct)
    {
        var item = await _context.WatchlistItems
            .FirstOrDefaultAsync(w => w.UserId == userId && w.TmdbMovieId == tmdbMovieId, ct);
        if (item is null) return;

        _context.WatchlistItems.Remove(item);
        await _context.SaveChangesAsync(ct);
    }
}
