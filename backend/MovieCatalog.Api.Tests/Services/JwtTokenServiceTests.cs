using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using MovieCatalog.Api.Identity;
using MovieCatalog.Api.Services.Auth;

namespace MovieCatalog.Api.Tests.Services;

public class JwtTokenServiceTests
{
    private static IOptions<JwtOptions> BuildOptions() => Options.Create(new JwtOptions
    {
        Key = "test-signing-key-at-least-32-characters-long!",
        Issuer = "movie-catalog-tests",
        Audience = "movie-catalog-tests",
        ExpiresMinutes = 120
    });

    [Fact]
    public void GenerateToken_IncludesUserIdAndEmailClaims()
    {
        var service = new JwtTokenService(BuildOptions());
        var user = new ApplicationUser { Id = "user-123", Email = "teste@exemplo.com", UserName = "teste@exemplo.com" };

        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("user-123", parsed.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal("teste@exemplo.com", parsed.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.True(parsed.ValidTo > DateTime.UtcNow.AddMinutes(110));
    }
}
