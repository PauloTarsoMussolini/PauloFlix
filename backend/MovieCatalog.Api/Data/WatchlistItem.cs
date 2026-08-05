namespace MovieCatalog.Api.Data;

public class WatchlistItem
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int TmdbMovieId { get; set; }
    public DateTime CreatedAt { get; set; }
}
