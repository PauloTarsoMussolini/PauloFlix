using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MovieCatalog.Api.Models.Movies;
using MovieCatalog.Api.Services.Tmdb;

namespace MovieCatalog.Api.Controllers;

[ApiController]
[Route("api")]
[EnableRateLimiting("catalog")]
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

    [HttpGet("movies/{tmdbId:int}")]
    public async Task<ActionResult<MovieDetailDto>> GetDetails(int tmdbId, CancellationToken ct)
    {
        var result = await _tmdbService.GetMovieDetailsAsync(tmdbId, ct);
        return Ok(result);
    }

    [HttpGet("movies/search")]
    public async Task<ActionResult<PagedResultDto<MovieSummaryDto>>> Search(
        [FromQuery] string query, [FromQuery] int page, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query)) return BadRequest("O parametro query e obrigatorio.");
        if (page < 1) page = 1;
        var result = await _tmdbService.SearchMoviesAsync(query, page, ct);
        return Ok(result);
    }

    [HttpGet("genres")]
    public async Task<ActionResult<List<GenreDto>>> GetGenres(CancellationToken ct)
    {
        var result = await _tmdbService.GetGenresAsync(ct);
        return Ok(result);
    }

    [HttpGet("providers")]
    public ActionResult<List<ProviderDto>> GetProviders()
    {
        return Ok(_tmdbService.GetProviders());
    }
}
