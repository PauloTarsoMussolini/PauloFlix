using Microsoft.AspNetCore.Mvc;
using MovieCatalog.Api.Models.Movies;
using MovieCatalog.Api.Services.Tmdb;

namespace MovieCatalog.Api.Controllers;

[ApiController]
[Route("api")]
public class MoviesController : ControllerBase
{
    private readonly ITmdbService _tmdbService;

    public MoviesController(ITmdbService tmdbService)
    {
        _tmdbService = tmdbService;
    }

    [HttpGet("movies/popular")]
    public async Task<ActionResult<PagedResultDto<MovieSummaryDto>>> GetPopular(
        [FromQuery] string provider, [FromQuery] int? genre, [FromQuery] int page, CancellationToken ct)
    {
        if (page < 1) page = 1;
        var result = await _tmdbService.GetPopularByProviderAsync(provider, genre, page, ct);
        return Ok(result);
    }
}
