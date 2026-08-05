using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieCatalog.Api.Models.Movies;
using MovieCatalog.Api.Services.Tmdb;
using MovieCatalog.Api.Services.Watchlist;

namespace MovieCatalog.Api.Controllers;

[ApiController]
[Route("api/watchlist")]
[Authorize]
public class WatchlistController : ControllerBase
{
    private readonly IWatchlistService _watchlistService;
    private readonly ITmdbService _tmdbService;

    public WatchlistController(IWatchlistService watchlistService, ITmdbService tmdbService)
    {
        _watchlistService = watchlistService;
        _tmdbService = tmdbService;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;

    [HttpGet]
    public async Task<ActionResult<List<MovieSummaryDto>>> Get(CancellationToken ct)
    {
        var tmdbIds = await _watchlistService.GetTmdbMovieIdsAsync(CurrentUserId, ct);

        var movies = new List<MovieSummaryDto>();
        foreach (var tmdbId in tmdbIds)
        {
            var detail = await _tmdbService.GetMovieDetailsAsync(tmdbId, ct);
            movies.Add(new MovieSummaryDto(
                detail.TmdbId, detail.Title, detail.Overview,
                detail.PosterUrl, detail.BackdropUrl, detail.ReleaseDate, detail.VoteAverage));
        }

        return Ok(movies);
    }

    [HttpPost("{tmdbMovieId:int}")]
    public async Task<IActionResult> Add(int tmdbMovieId, CancellationToken ct)
    {
        await _watchlistService.AddAsync(CurrentUserId, tmdbMovieId, ct);
        return NoContent();
    }

    [HttpDelete("{tmdbMovieId:int}")]
    public async Task<IActionResult> Remove(int tmdbMovieId, CancellationToken ct)
    {
        await _watchlistService.RemoveAsync(CurrentUserId, tmdbMovieId, ct);
        return NoContent();
    }
}
