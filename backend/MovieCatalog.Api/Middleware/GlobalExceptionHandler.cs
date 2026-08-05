using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MovieCatalog.Api.Exceptions;

namespace MovieCatalog.Api.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Erro nao tratado ao processar {Path}", httpContext.Request.Path);

        var statusCode = exception is TmdbUnavailableException
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status500InternalServerError;
        var title = exception is TmdbUnavailableException
            ? "Servico de filmes indisponivel no momento"
            : "Ocorreu um erro inesperado";

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = statusCode,
            Title = title
        }, cancellationToken);

        return true;
    }
}
