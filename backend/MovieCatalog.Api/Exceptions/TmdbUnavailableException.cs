namespace MovieCatalog.Api.Exceptions;

public class TmdbUnavailableException : Exception
{
    public TmdbUnavailableException(string message, Exception? inner = null) : base(message, inner)
    {
    }
}
