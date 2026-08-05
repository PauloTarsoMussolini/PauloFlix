using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Services.Auth;

public interface IJwtTokenService
{
    string GenerateToken(ApplicationUser user);
}
