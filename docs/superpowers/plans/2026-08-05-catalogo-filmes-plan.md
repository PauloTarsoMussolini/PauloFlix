# Catálogo de Filmes estilo Netflix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Netflix-style movie catalog/discovery app (backend + frontend) that shows which movies are available on which Brazilian subscription streaming services right now, using the TMDB API.

**Architecture:** ASP.NET Core Web API (C#, .NET 10) that also serves a React SPA build as static files from the same site (no CORS). SQL Server via EF Core stores only Identity users and a minimal `WatchlistItems` table; all movie data comes from TMDB through a caching proxy service (`TmdbService` + `IMemoryCache`). JWT Bearer auth via ASP.NET Core Identity, no refresh tokens.

**Tech Stack:** .NET 10 SDK, ASP.NET Core Web API (Controllers), EF Core 10 (SQL Server + InMemory for tests), ASP.NET Core Identity, JWT Bearer auth, xUnit + Moq, React 19 + TypeScript via Vite, react-router-dom v7 (amended from React 18/v6 after Task 12 - Vite scaffolded the versions current at implementation time; the routing APIs used in this plan - BrowserRouter, Routes, Route, Outlet, useParams, useNavigate, Link - are unchanged between v6 and v7).

**Amendment (post Task 1 review):** the plan originally specified .NET 8; the dev machine has only .NET 9/10 SDKs installed, so the target was updated to .NET 10 (current LTS as of this writing) after Task 1's scaffold. All later tasks' EF Core/ASP.NET Core package references should resolve to the 10.x line accordingly.

**Spec:** `docs/superpowers/specs/2026-08-05-catalogo-filmes-design.md`

## Global Constraints

- Region fixed to Brazil: TMDB `watch_region=BR`, `language=pt-BR`. No multi-region support.
- Scope is movies only — no TV series.
- No video playback in-app — detail view links out to the streaming provider.
- Only subscription ("flatrate") providers are shown — no rent/buy.
- No secrets in `appsettings.json` or the repo. Secrets come from environment variables: `Tmdb__ReadAccessToken`, `ConnectionStrings__DefaultConnection`, `Jwt__Key`, `ASPNETCORE_ENVIRONMENT`. Locally, use `dotnet user-secrets` instead of committing them.
- TMDB Read Access Token (v4) goes in the `Authorization: Bearer` header — never as a query string `api_key`.
- JWT is short-lived (~2h) with no refresh token (YAGNI per spec) — user re-logs in after expiry.
- React stores the JWT in memory only (`AuthContext` state) — never in `localStorage`.
- CORS stays disabled — frontend and API are same-origin in production (React build served from the API's `wwwroot`).
- No automated UI tests in v1 — frontend tasks are verified manually in the browser.

---

### Task 1: Backend solution scaffold + health endpoint

**Files:**
- Create: `backend/MovieCatalog.sln`
- Create: `backend/MovieCatalog.Api/MovieCatalog.Api.csproj`
- Create: `backend/MovieCatalog.Api/Program.cs`
- Create: `backend/MovieCatalog.Api/Controllers/HealthController.cs`
- Create: `backend/MovieCatalog.Api/appsettings.json`
- Create: `backend/MovieCatalog.Api/appsettings.Development.json`
- Create: `backend/MovieCatalog.Api.Tests/MovieCatalog.Api.Tests.csproj`
- Create: `backend/MovieCatalog.Api.Tests/HealthEndpointTests.cs`
- Modify: `.gitignore` (add .NET build output patterns)

**Interfaces:**
- Produces: `GET /api/health` → `200 OK` with body `{"status":"ok"}`. `public partial class Program { }` at the bottom of `Program.cs` (required so `WebApplicationFactory<Program>` can find the entry point in tests).

- [ ] **Step 1: Scaffold the projects**

```bash
mkdir backend && cd backend
dotnet new sln -n MovieCatalog
dotnet new webapi -n MovieCatalog.Api -o MovieCatalog.Api --use-controllers
dotnet new xunit -n MovieCatalog.Api.Tests -o MovieCatalog.Api.Tests
dotnet sln add MovieCatalog.Api/MovieCatalog.Api.csproj MovieCatalog.Api.Tests/MovieCatalog.Api.Tests.csproj
dotnet add MovieCatalog.Api.Tests/MovieCatalog.Api.Tests.csproj reference MovieCatalog.Api/MovieCatalog.Api.csproj
dotnet add MovieCatalog.Api.Tests package Microsoft.AspNetCore.Mvc.Testing
dotnet add MovieCatalog.Api package Swashbuckle.AspNetCore
```

- [ ] **Step 2: Replace `Program.cs` with the minimal app**

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

public partial class Program { }
```

- [ ] **Step 3: Write the failing test**

```csharp
// MovieCatalog.Api.Tests/HealthEndpointTests.cs
using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace MovieCatalog.Api.Tests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHealth_ReturnsOkWithStatus()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":\"ok\"", body);
    }
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL — `/api/health` returns 404 (no such controller yet).

- [ ] **Step 5: Implement `HealthController`**

```csharp
// MovieCatalog.Api/Controllers/HealthController.cs
using Microsoft.AspNetCore.Mvc;

namespace MovieCatalog.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS

- [ ] **Step 7: Add `.gitignore` entries and commit**

Append to the repo-root `.gitignore`:

```
backend/**/bin/
backend/**/obj/
```

```bash
git add backend .gitignore
git commit -m "feat: scaffold ASP.NET Core Web API with health endpoint"
```

---

### Task 2: Identity + EF Core data layer

**Files:**
- Create: `backend/MovieCatalog.Api/Identity/ApplicationUser.cs`
- Create: `backend/MovieCatalog.Api/Data/ApplicationDbContext.cs`
- Create: `backend/MovieCatalog.Api/Migrations/*` (generated by EF Core)
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Modify: `backend/MovieCatalog.Api/appsettings.json`
- Modify: `backend/MovieCatalog.Api/appsettings.Development.json`
- Test: `backend/MovieCatalog.Api.Tests/Data/ApplicationDbContextTests.cs`

**Interfaces:**
- Produces: `ApplicationUser : IdentityUser` (used by Task 3's `AuthController`/`JwtTokenService`). `ApplicationDbContext : IdentityDbContext<ApplicationUser>` with a `Users` DbSet (inherited from Identity) — later extended with `WatchlistItems` in Task 9.

- [ ] **Step 1: Add EF Core + Identity packages**

```bash
cd backend/MovieCatalog.Api
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
cd ../MovieCatalog.Api.Tests
dotnet add package Microsoft.EntityFrameworkCore.InMemory
cd ../..
```

- [ ] **Step 2: Create `ApplicationUser`**

```csharp
// MovieCatalog.Api/Identity/ApplicationUser.cs
using Microsoft.AspNetCore.Identity;

namespace MovieCatalog.Api.Identity;

public class ApplicationUser : IdentityUser
{
}
```

- [ ] **Step 3: Create `ApplicationDbContext`**

```csharp
// MovieCatalog.Api/Data/ApplicationDbContext.cs
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }
}
```

- [ ] **Step 4: Write the test for the data layer**

```csharp
// MovieCatalog.Api.Tests/Data/ApplicationDbContextTests.cs
using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Data;
using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Tests.Data;

public class ApplicationDbContextTests
{
    private static ApplicationDbContext BuildContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Users_CanAddAndQueryApplicationUser()
    {
        using var context = BuildContext();
        context.Users.Add(new ApplicationUser { UserName = "teste@exemplo.com", Email = "teste@exemplo.com" });
        await context.SaveChangesAsync();

        var found = await context.Users.FirstOrDefaultAsync(u => u.Email == "teste@exemplo.com");

        Assert.NotNull(found);
    }
}
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL — build error, `ApplicationDbContext`/`ApplicationUser` not referenced correctly yet (or pass trivially if Steps 2-3 already compile; if it already passes, proceed — the important verification is Step 6 passing after wiring DI in Step 7).

- [ ] **Step 6: Run the test to verify it passes**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS

- [ ] **Step 7: Wire DbContext + Identity into `Program.cs`**

Replace `Program.cs` with:

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Data;
using MovieCatalog.Api.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.User.RequireUniqueEmail = true;
})
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

public partial class Program { }
```

- [ ] **Step 8: Add the local dev connection string**

In `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\mssqllocaldb;Database=MovieCatalogDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

In `appsettings.json`, leave `ConnectionStrings` absent (Production reads it from the `ConnectionStrings__DefaultConnection` environment variable — see the spec's secrets table).

- [ ] **Step 9: Generate and apply the initial migration**

```bash
cd backend/MovieCatalog.Api
dotnet tool install --global dotnet-ef --version 8.*
dotnet ef migrations add InitialIdentitySchema
dotnet ef database update
cd ../..
```

Expected: migration files created under `Migrations/`, and (if LocalDB is installed) the `MovieCatalogDb` database now exists with the `AspNetUsers`, `AspNetRoles`, etc. tables. If LocalDB isn't installed locally, `dotnet ef migrations add` still succeeds (it only needs the model, not a live connection) — `database update` can be run later once a local SQL Server instance is available.

- [ ] **Step 10: Commit**

```bash
git add backend
git commit -m "feat: add EF Core + ASP.NET Core Identity data layer"
```

---

### Task 3: JWT token service + auth wiring

**Files:**
- Create: `backend/MovieCatalog.Api/Services/Auth/JwtOptions.cs`
- Create: `backend/MovieCatalog.Api/Services/Auth/IJwtTokenService.cs`
- Create: `backend/MovieCatalog.Api/Services/Auth/JwtTokenService.cs`
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Modify: `backend/MovieCatalog.Api/appsettings.json`
- Test: `backend/MovieCatalog.Api.Tests/Services/JwtTokenServiceTests.cs`

**Interfaces:**
- Consumes: `ApplicationUser` (Task 2) — `Id`, `Email`.
- Produces: `IJwtTokenService.GenerateToken(ApplicationUser user) : string` — used by `AuthController` in Task 4.

- [ ] **Step 1: Add the JWT package**

```bash
dotnet add backend/MovieCatalog.Api package Microsoft.AspNetCore.Authentication.JwtBearer
```

- [ ] **Step 2: Create `JwtOptions`**

```csharp
// MovieCatalog.Api/Services/Auth/JwtOptions.cs
namespace MovieCatalog.Api.Services.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiresMinutes { get; set; } = 120;
}
```

- [ ] **Step 3: Create `IJwtTokenService`**

```csharp
// MovieCatalog.Api/Services/Auth/IJwtTokenService.cs
using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Services.Auth;

public interface IJwtTokenService
{
    string GenerateToken(ApplicationUser user);
}
```

- [ ] **Step 4: Write the failing test**

```csharp
// MovieCatalog.Api.Tests/Services/JwtTokenServiceTests.cs
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
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL — `JwtTokenService` does not exist yet.

- [ ] **Step 6: Implement `JwtTokenService`**

```csharp
// MovieCatalog.Api/Services/Auth/JwtTokenService.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Services.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateToken(ApplicationUser user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.ExpiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS

- [ ] **Step 8: Wire JWT auth into `Program.cs`**

Replace `Program.cs` with:

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MovieCatalog.Api.Data;
using MovieCatalog.Api.Identity;
using MovieCatalog.Api.Services.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.User.RequireUniqueEmail = true;
})
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
```

- [ ] **Step 9: Add non-secret JWT config to `appsettings.json`**

```json
{
  "Jwt": {
    "Issuer": "movie-catalog-api",
    "Audience": "movie-catalog-client",
    "ExpiresMinutes": 120
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 10: Set the local dev signing key via user-secrets**

```bash
cd backend/MovieCatalog.Api
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "dev-only-signing-key-change-me-32chars+"
cd ../..
```

- [ ] **Step 11: Run the full test suite and commit**

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (all tests, including Task 1/2's)

```bash
git add backend
git commit -m "feat: add JWT token generation and auth pipeline wiring"
```

---

### Task 4: AuthController (register / login / me)

**Files:**
- Create: `backend/MovieCatalog.Api/Models/Auth/RegisterRequestDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Auth/LoginRequestDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Auth/AuthResponseDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Auth/UserResponseDto.cs`
- Create: `backend/MovieCatalog.Api/Controllers/AuthController.cs`

**Interfaces:**
- Consumes: `UserManager<ApplicationUser>` (from Identity, Task 2), `IJwtTokenService` (Task 3).
- Produces: `POST /api/auth/register`, `POST /api/auth/login` → `AuthResponseDto(string Token, string Email)`. `GET /api/auth/me` → `UserResponseDto(string Id, string Email)`. These are consumed by the frontend's `authApi` in Task 13.

No automated tests for this task — per the spec's testing scope (essential tests limited to `TmdbService`, provider mapping, `WatchlistService`), `AuthController` is verified manually.

- [ ] **Step 1: Create the request/response DTOs**

```csharp
// MovieCatalog.Api/Models/Auth/RegisterRequestDto.cs
using System.ComponentModel.DataAnnotations;

namespace MovieCatalog.Api.Models.Auth;

public record RegisterRequestDto(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password);
```

```csharp
// MovieCatalog.Api/Models/Auth/LoginRequestDto.cs
using System.ComponentModel.DataAnnotations;

namespace MovieCatalog.Api.Models.Auth;

public record LoginRequestDto(
    [Required, EmailAddress] string Email,
    [Required] string Password);
```

**Amendment (post Task 4 review):** the plan originally used `[property: Required, ...]` target specifiers. ASP.NET Core's MVC model validation pipeline throws `InvalidOperationException` for record types bound as action parameters when validation attributes target the property instead of the constructor parameter (`DefaultComplexObjectValidationStrategy.ThrowIfRecordTypeHasValidationOnProperties`) - confirmed against the live app. Corrected to plain parameter-level attributes, which is the pattern MVC's record binding actually requires.

```csharp
// MovieCatalog.Api/Models/Auth/AuthResponseDto.cs
namespace MovieCatalog.Api.Models.Auth;

public record AuthResponseDto(string Token, string Email);
```

```csharp
// MovieCatalog.Api/Models/Auth/UserResponseDto.cs
namespace MovieCatalog.Api.Models.Auth;

public record UserResponseDto(string Id, string Email);
```

- [ ] **Step 2: Implement `AuthController`**

```csharp
// MovieCatalog.Api/Controllers/AuthController.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MovieCatalog.Api.Identity;
using MovieCatalog.Api.Models.Auth;
using MovieCatalog.Api.Services.Auth;

namespace MovieCatalog.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(UserManager<ApplicationUser> userManager, IJwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto request)
    {
        var user = new ApplicationUser { UserName = request.Email, Email = request.Email };
        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        var token = _jwtTokenService.GenerateToken(user);
        return Ok(new AuthResponseDto(token, user.Email!));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized();

        var token = _jwtTokenService.GenerateToken(user);
        return Ok(new AuthResponseDto(token, user.Email!));
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<UserResponseDto> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        return Ok(new UserResponseDto(id!, email!));
    }
}
```

- [ ] **Step 3: Run the app and verify manually**

```bash
cd backend/MovieCatalog.Api
dotnet run
```

In another terminal (replace the port with the one printed by `dotnet run`, also visible in `Properties/launchSettings.json`):

```bash
curl -k -X POST https://localhost:7159/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"SenhaForte123"}'
```

Expected: `200 OK` with a JSON body containing `token` and `email`.

```bash
curl -k -X POST https://localhost:7159/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"SenhaForte123"}'
```

Expected: `200 OK` with a fresh token. Copy the `token` value, then:

```bash
curl -k https://localhost:7159/api/auth/me -H "Authorization: Bearer <token>"
```

Expected: `200 OK` with the user's `id` and `email`.

- [ ] **Step 4: Commit**

```bash
git add backend
git commit -m "feat: add register/login/me auth endpoints"
```

---

### Task 5: TMDB client plumbing + global exception handling

**Files:**
- Create: `backend/MovieCatalog.Api/Services/Tmdb/TmdbOptions.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/TmdbModels.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/ITmdbClient.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/TmdbClient.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/TmdbImageUrlBuilder.cs`
- Create: `backend/MovieCatalog.Api/Exceptions/TmdbUnavailableException.cs`
- Create: `backend/MovieCatalog.Api/Middleware/GlobalExceptionHandler.cs`
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Modify: `backend/MovieCatalog.Api/appsettings.json`

**Interfaces:**
- Produces: `ITmdbClient` (raw TMDB HTTP calls, consumed by `TmdbService` in Tasks 6-8), `TmdbUnavailableException` (thrown by `TmdbService`, caught by `GlobalExceptionHandler`, mapped to `503`), `TmdbImageUrlBuilder.Poster/Backdrop/Profile(path) : string?`.

This task is HTTP plumbing with no business logic to unit-test directly. Tasks 6-8 test the behavior built on top of it by mocking `ITmdbClient`.

- [ ] Step 1: Get your TMDB Read Access Token into local dev secrets

```bash
cd backend/MovieCatalog.Api
dotnet user-secrets set "Tmdb:ReadAccessToken" "<your v4 Read Access Token>"
cd ../..
```

- [ ] Step 2: Verify the curated provider IDs against the live TMDB API

The provider IDs used later in this task are believed correct as of this writing, but TMDB provider catalogs change over time. Confirm them first:

```bash
curl -s "https://api.themoviedb.org/3/watch/providers/movie?language=pt-BR&watch_region=BR" -H "Authorization: Bearer <your Read Access Token>" -o providers.json
grep -o -A2 "provider_name.:.Netflix" providers.json
```

Repeat for Amazon Prime Video, Disney Plus, Max, Globoplay, Apple TV Plus, and Paramount Plus, noting each provider_id. Use the confirmed IDs in Step 9 below.

- [ ] Step 3: Create TmdbOptions

```csharp
// MovieCatalog.Api/Services/Tmdb/TmdbOptions.cs
namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbOptions
{
    public const string SectionName = "Tmdb";

    public string ReadAccessToken { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.themoviedb.org/3/";
    public string WatchRegion { get; set; } = "BR";
    public string Language { get; set; } = "pt-BR";
    public int PopularCacheHours { get; set; } = 6;
    public int DetailCacheHours { get; set; } = 24;
    public int StaticCacheDays { get; set; } = 7;
    public List<TmdbProviderOption> Providers { get; set; } = new();
}

public class TmdbProviderOption
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int TmdbProviderId { get; set; }
}
```

- [ ] Step 4: Create the raw TMDB response models

```csharp
// MovieCatalog.Api/Services/Tmdb/TmdbModels.cs
using System.Text.Json.Serialization;

namespace MovieCatalog.Api.Services.Tmdb;

public record TmdbPagedResponse<T>(
    [property: JsonPropertyName("page")] int Page,
    [property: JsonPropertyName("results")] List<T> Results,
    [property: JsonPropertyName("total_pages")] int TotalPages,
    [property: JsonPropertyName("total_results")] int TotalResults);

public record TmdbMovieSummary(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("overview")] string Overview,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("vote_average")] double VoteAverage);

public record TmdbGenre(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name);

public record TmdbGenresResponse(
    [property: JsonPropertyName("genres")] List<TmdbGenre> Genres);

public record TmdbCastMember(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("character")] string Character,
    [property: JsonPropertyName("profile_path")] string? ProfilePath,
    [property: JsonPropertyName("order")] int Order);

public record TmdbCredits(
    [property: JsonPropertyName("cast")] List<TmdbCastMember> Cast);

public record TmdbWatchProvider(
    [property: JsonPropertyName("provider_id")] int ProviderId,
    [property: JsonPropertyName("provider_name")] string ProviderName);

public record TmdbWatchProviderRegion(
    [property: JsonPropertyName("flatrate")] List<TmdbWatchProvider>? Flatrate);

public record TmdbWatchProvidersResult(
    [property: JsonPropertyName("results")] Dictionary<string, TmdbWatchProviderRegion> Results);

public record TmdbMovieDetail(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("overview")] string Overview,
    [property: JsonPropertyName("poster_path")] string? PosterPath,
    [property: JsonPropertyName("backdrop_path")] string? BackdropPath,
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("vote_average")] double VoteAverage,
    [property: JsonPropertyName("runtime")] int? Runtime,
    [property: JsonPropertyName("genres")] List<TmdbGenre> Genres,
    [property: JsonPropertyName("credits")] TmdbCredits? Credits,
    [property: JsonPropertyName("watch/providers")] TmdbWatchProvidersResult? WatchProviders);
```

- [ ] Step 5: Create ITmdbClient and TmdbClient

```csharp
// MovieCatalog.Api/Services/Tmdb/ITmdbClient.cs
namespace MovieCatalog.Api.Services.Tmdb;

public interface ITmdbClient
{
    Task<TmdbPagedResponse<TmdbMovieSummary>> DiscoverByProviderAsync(int tmdbProviderId, int? genreId, int page, CancellationToken ct);
    Task<TmdbPagedResponse<TmdbMovieSummary>> SearchMoviesAsync(string query, int page, CancellationToken ct);
    Task<TmdbMovieDetail> GetMovieDetailsAsync(int tmdbId, CancellationToken ct);
    Task<TmdbGenresResponse> GetGenresAsync(CancellationToken ct);
}
```

```csharp
// MovieCatalog.Api/Services/Tmdb/TmdbClient.cs
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbClient : ITmdbClient
{
    private readonly HttpClient _http;
    private readonly TmdbOptions _options;

    public TmdbClient(HttpClient http, IOptions<TmdbOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<TmdbPagedResponse<TmdbMovieSummary>> DiscoverByProviderAsync(int tmdbProviderId, int? genreId, int page, CancellationToken ct)
    {
        var url = "discover/movie?watch_region=" + _options.WatchRegion + "&with_watch_providers=" + tmdbProviderId +
                  "&with_watch_monetization_types=flatrate&sort_by=popularity.desc&language=" + _options.Language + "&page=" + page;
        if (genreId.HasValue) url += "&with_genres=" + genreId.Value;

        var response = await _http.GetFromJsonAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbPagedResponse<TmdbMovieSummary>> SearchMoviesAsync(string query, int page, CancellationToken ct)
    {
        var url = "search/movie?query=" + Uri.EscapeDataString(query) + "&language=" + _options.Language + "&page=" + page;
        var response = await _http.GetFromJsonAsync<TmdbPagedResponse<TmdbMovieSummary>>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbMovieDetail> GetMovieDetailsAsync(int tmdbId, CancellationToken ct)
    {
        var url = "movie/" + tmdbId + "?append_to_response=credits,watch/providers&language=" + _options.Language;
        var response = await _http.GetFromJsonAsync<TmdbMovieDetail>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }

    public async Task<TmdbGenresResponse> GetGenresAsync(CancellationToken ct)
    {
        var url = "genre/movie/list?language=" + _options.Language;
        var response = await _http.GetFromJsonAsync<TmdbGenresResponse>(url, ct);
        return response ?? throw new HttpRequestException("Resposta vazia da TMDB.");
    }
}
```

- [ ] Step 6: Create TmdbImageUrlBuilder

```csharp
// MovieCatalog.Api/Services/Tmdb/TmdbImageUrlBuilder.cs
namespace MovieCatalog.Api.Services.Tmdb;

public static class TmdbImageUrlBuilder
{
    private const string BaseUrl = "https://image.tmdb.org/t/p/";

    public static string? Poster(string? path) => path is null ? null : BaseUrl + "w342" + path;
    public static string? Backdrop(string? path) => path is null ? null : BaseUrl + "w1280" + path;
    public static string? Profile(string? path) => path is null ? null : BaseUrl + "w185" + path;
}
```

- [ ] Step 7: Create TmdbUnavailableException and GlobalExceptionHandler

```csharp
// MovieCatalog.Api/Exceptions/TmdbUnavailableException.cs
namespace MovieCatalog.Api.Exceptions;

public class TmdbUnavailableException : Exception
{
    public TmdbUnavailableException(string message, Exception? inner = null) : base(message, inner)
    {
    }
}
```

```csharp
// MovieCatalog.Api/Middleware/GlobalExceptionHandler.cs
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
```

- [ ] Step 8: Wire the TMDB client and exception handler into Program.cs

Add these using statements alongside the existing ones:

```csharp
using System.Net.Http.Headers;
using MovieCatalog.Api.Middleware;
using MovieCatalog.Api.Services.Tmdb;
```

Add this block right after the builder.Services.AddAuthorization() line:

```csharp
builder.Services.Configure<TmdbOptions>(builder.Configuration.GetSection(TmdbOptions.SectionName));
builder.Services.AddHttpClient<ITmdbClient, TmdbClient>((sp, client) =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TmdbOptions>>().Value;
    client.BaseAddress = new Uri(opts.BaseUrl);
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", opts.ReadAccessToken);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});
builder.Services.AddMemoryCache();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
```

Add this line right after `var app = builder.Build();` and before the `if (app.Environment.IsDevelopment())` block:

```csharp
app.UseExceptionHandler();
```

- [ ] Step 9: Add the Tmdb section to appsettings.json

Use the provider IDs confirmed in Step 2:

```json
"Tmdb": {
  "BaseUrl": "https://api.themoviedb.org/3/",
  "WatchRegion": "BR",
  "Language": "pt-BR",
  "PopularCacheHours": 6,
  "DetailCacheHours": 24,
  "StaticCacheDays": 7,
  "Providers": [
    { "Key": "netflix", "DisplayName": "Netflix", "TmdbProviderId": 8 },
    { "Key": "prime", "DisplayName": "Prime Video", "TmdbProviderId": 119 },
    { "Key": "disney", "DisplayName": "Disney+", "TmdbProviderId": 337 },
    { "Key": "max", "DisplayName": "Max", "TmdbProviderId": 1899 },
    { "Key": "globoplay", "DisplayName": "Globoplay", "TmdbProviderId": 307 },
    { "Key": "appletv", "DisplayName": "Apple TV+", "TmdbProviderId": 350 },
    { "Key": "paramount", "DisplayName": "Paramount+", "TmdbProviderId": 531 }
  ]
}
```

- [ ] Step 10: Build and commit

Run: `dotnet build backend/MovieCatalog.sln`
Expected: builds with no errors (no tests added in this task).

```bash
git add backend
git commit -m "feat: add TMDB HTTP client, image URL builder, and global exception handling"
```

---

### Task 6: TmdbService - popular movies by provider (TDD) + endpoint

**Files:**
- Create: `backend/MovieCatalog.Api/Models/Movies/MovieSummaryDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Movies/PagedResultDto.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/ITmdbService.cs`
- Create: `backend/MovieCatalog.Api/Services/Tmdb/TmdbService.cs`
- Create: `backend/MovieCatalog.Api/Controllers/MoviesController.cs`
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Test: `backend/MovieCatalog.Api.Tests/Services/TmdbServiceTests.cs`

**Interfaces:**
- Consumes: `ITmdbClient` (Task 5), `IMemoryCache`, `IOptions<TmdbOptions>`.
- Produces: `ITmdbService.GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct) : Task<PagedResultDto<MovieSummaryDto>>` and `GET /api/movies/popular?provider=&genre=&page=`, consumed by the frontend in Task 12+.

- [ ] Step 1: Add the Moq test package

```bash
dotnet add backend/MovieCatalog.Api.Tests package Moq
```

- [ ] Step 2: Create the DTOs

```csharp
// MovieCatalog.Api/Models/Movies/MovieSummaryDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record MovieSummaryDto(
    int TmdbId,
    string Title,
    string Overview,
    string? PosterUrl,
    string? BackdropUrl,
    string? ReleaseDate,
    double VoteAverage);
```

```csharp
// MovieCatalog.Api/Models/Movies/PagedResultDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record PagedResultDto<T>(int Page, int TotalPages, List<T> Results);
```

- [ ] Step 3: Create ITmdbService

```csharp
// MovieCatalog.Api/Services/Tmdb/ITmdbService.cs
using MovieCatalog.Api.Models.Movies;

namespace MovieCatalog.Api.Services.Tmdb;

public interface ITmdbService
{
    Task<PagedResultDto<MovieSummaryDto>> GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct);
}
```

- [ ] Step 4: Write the failing tests

```csharp
// MovieCatalog.Api.Tests/Services/TmdbServiceTests.cs
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MovieCatalog.Api.Exceptions;
using MovieCatalog.Api.Services.Tmdb;

namespace MovieCatalog.Api.Tests.Services;

public class TmdbServiceTests
{
    private static TmdbOptions BuildOptions() => new()
    {
        WatchRegion = "BR",
        Language = "pt-BR",
        PopularCacheHours = 6,
        DetailCacheHours = 24,
        StaticCacheDays = 7,
        Providers = new List<TmdbProviderOption>
        {
            new() { Key = "netflix", DisplayName = "Netflix", TmdbProviderId = 8 }
        }
    };

    private static TmdbPagedResponse<TmdbMovieSummary> BuildRawPage() => new(
        1,
        new List<TmdbMovieSummary> { new(1, "Filme Teste", "Sinopse", "/poster.jpg", "/backdrop.jpg", "2024-01-01", 8.5) },
        1,
        1);

    [Fact]
    public async Task GetPopularByProviderAsync_CallsClientOnce_WhenCacheMisses()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildRawPage());

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        var result = await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);

        Assert.Single(result.Results);
        Assert.Equal("Filme Teste", result.Results[0].Title);
        client.Verify(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPopularByProviderAsync_UsesCache_OnSecondCall()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildRawPage());

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);
        await service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None);

        client.Verify(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPopularByProviderAsync_ThrowsTmdbUnavailable_WhenClientFails()
    {
        var client = new Mock<ITmdbClient>();
        client.Setup(c => c.DiscoverByProviderAsync(8, null, 1, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));

        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await Assert.ThrowsAsync<TmdbUnavailableException>(
            () => service.GetPopularByProviderAsync("netflix", null, 1, CancellationToken.None));
    }

    [Fact]
    public async Task GetPopularByProviderAsync_ThrowsArgumentException_ForUnknownProvider()
    {
        var client = new Mock<ITmdbClient>();
        var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GetPopularByProviderAsync("hulu", null, 1, CancellationToken.None));
    }
}
```

- [ ] Step 5: Run the tests to verify they fail

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL - `TmdbService` does not exist yet.

- [ ] Step 6: Implement TmdbService.GetPopularByProviderAsync

```csharp
// MovieCatalog.Api/Services/Tmdb/TmdbService.cs
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MovieCatalog.Api.Exceptions;
using MovieCatalog.Api.Models.Movies;

namespace MovieCatalog.Api.Services.Tmdb;

public class TmdbService : ITmdbService
{
    private readonly ITmdbClient _client;
    private readonly IMemoryCache _cache;
    private readonly TmdbOptions _options;

    public TmdbService(ITmdbClient client, IMemoryCache cache, IOptions<TmdbOptions> options)
    {
        _client = client;
        _cache = cache;
        _options = options.Value;
    }

    public async Task<PagedResultDto<MovieSummaryDto>> GetPopularByProviderAsync(string providerKey, int? genreId, int page, CancellationToken ct)
    {
        var provider = _options.Providers.FirstOrDefault(p => p.Key == providerKey)
            ?? throw new ArgumentException("Provedor desconhecido: " + providerKey, nameof(providerKey));

        var cacheKey = "popular:" + providerKey + ":" + (genreId?.ToString() ?? "all") + ":" + page;
        if (_cache.TryGetValue(cacheKey, out PagedResultDto<MovieSummaryDto>? cached))
            return cached!;

        TmdbPagedResponse<TmdbMovieSummary> raw;
        try
        {
            raw = await _client.DiscoverByProviderAsync(provider.TmdbProviderId, genreId, page, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new TmdbUnavailableException("Nao foi possivel buscar filmes populares na TMDB.", ex);
        }

        var result = new PagedResultDto<MovieSummaryDto>(raw.Page, raw.TotalPages, raw.Results.Select(MapSummary).ToList());
        _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.PopularCacheHours));
        return result;
    }

    private static MovieSummaryDto MapSummary(TmdbMovieSummary m) => new(
        m.Id, m.Title, m.Overview,
        TmdbImageUrlBuilder.Poster(m.PosterPath),
        TmdbImageUrlBuilder.Backdrop(m.BackdropPath),
        m.ReleaseDate, m.VoteAverage);
}
```

- [ ] Step 7: Run the tests to verify they pass

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (all 4 tests in TmdbServiceTests)

- [ ] Step 8: Register ITmdbService in Program.cs

Add this line right after `builder.Services.AddMemoryCache();`:

```csharp
builder.Services.AddScoped<ITmdbService, TmdbService>();
```

- [ ] Step 9: Create MoviesController with the popular endpoint

```csharp
// MovieCatalog.Api/Controllers/MoviesController.cs
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
```

- [ ] Step 10: Verify manually

```bash
cd backend/MovieCatalog.Api
dotnet run
```

```bash
curl -k "https://localhost:7159/api/movies/popular?provider=netflix&page=1"
```

Expected: `200 OK` with a JSON page of movies from TMDB, `posterUrl`/`backdropUrl` pointing to `image.tmdb.org`.

- [ ] Step 11: Commit

```bash
git add backend
git commit -m "feat: add TmdbService popular-by-provider with caching and tests"
```

---

### Task 7: TmdbService - movie details with cast and providers (TDD) + endpoint

**Files:**
- Create: `backend/MovieCatalog.Api/Models/Movies/GenreDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Movies/ProviderDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Movies/CastMemberDto.cs`
- Create: `backend/MovieCatalog.Api/Models/Movies/MovieDetailDto.cs`
- Modify: `backend/MovieCatalog.Api/Services/Tmdb/ITmdbService.cs`
- Modify: `backend/MovieCatalog.Api/Services/Tmdb/TmdbService.cs`
- Modify: `backend/MovieCatalog.Api/Controllers/MoviesController.cs`
- Test: `backend/MovieCatalog.Api.Tests/Services/TmdbServiceTests.cs`

**Interfaces:**
- Produces: `ITmdbService.GetMovieDetailsAsync(int tmdbId, CancellationToken ct) : Task<MovieDetailDto>` and `GET /api/movies/{tmdbId}`.

- [ ] Step 1: Create the remaining DTOs

```csharp
// MovieCatalog.Api/Models/Movies/GenreDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record GenreDto(int Id, string Name);
```

```csharp
// MovieCatalog.Api/Models/Movies/ProviderDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record ProviderDto(string Key, string DisplayName);
```

```csharp
// MovieCatalog.Api/Models/Movies/CastMemberDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record CastMemberDto(string Name, string Character, string? ProfileUrl);
```

```csharp
// MovieCatalog.Api/Models/Movies/MovieDetailDto.cs
namespace MovieCatalog.Api.Models.Movies;

public record MovieDetailDto(
    int TmdbId,
    string Title,
    string Overview,
    string? PosterUrl,
    string? BackdropUrl,
    string? ReleaseDate,
    double VoteAverage,
    int? RuntimeMinutes,
    List<GenreDto> Genres,
    List<CastMemberDto> Cast,
    List<ProviderDto> WatchProviders);
```

- [ ] Step 2: Add the method signature to ITmdbService

Add this line inside the `ITmdbService` interface body (Task 6):

```csharp
Task<MovieDetailDto> GetMovieDetailsAsync(int tmdbId, CancellationToken ct);
```

- [ ] Step 3: Write the failing tests

Append to `TmdbServiceTests.cs`:

```csharp
[Fact]
public async Task GetMovieDetailsAsync_MapsCastAndFiltersProvidersToConfigured()
{
    var raw = new TmdbMovieDetail(
        42, "Filme Detalhado", "Sinopse completa", "/poster.jpg", "/backdrop.jpg", "2023-05-01", 7.9, 120,
        new List<TmdbGenre> { new(28, "Acao") },
        new TmdbCredits(new List<TmdbCastMember>
        {
            new(1, "Ator Um", "Personagem Um", "/ator1.jpg", 0),
            new(2, "Ator Dois", "Personagem Dois", null, 1)
        }),
        new TmdbWatchProvidersResult(new Dictionary<string, TmdbWatchProviderRegion>
        {
            ["BR"] = new TmdbWatchProviderRegion(new List<TmdbWatchProvider>
            {
                new(8, "Netflix"),
                new(9999, "Servico Nao Curado")
            })
        }));

    var client = new Mock<ITmdbClient>();
    client.Setup(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(raw);

    var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

    var result = await service.GetMovieDetailsAsync(42, CancellationToken.None);

    Assert.Equal("Filme Detalhado", result.Title);
    Assert.Equal(2, result.Cast.Count);
    Assert.Single(result.WatchProviders);
    Assert.Equal("netflix", result.WatchProviders[0].Key);
}

[Fact]
public async Task GetMovieDetailsAsync_UsesCache_OnSecondCall()
{
    var raw = new TmdbMovieDetail(42, "Filme", "Sinopse", null, null, "2023-01-01", 7.0, null,
        new List<TmdbGenre>(), new TmdbCredits(new List<TmdbCastMember>()), null);

    var client = new Mock<ITmdbClient>();
    client.Setup(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(raw);

    var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

    await service.GetMovieDetailsAsync(42, CancellationToken.None);
    await service.GetMovieDetailsAsync(42, CancellationToken.None);

    client.Verify(c => c.GetMovieDetailsAsync(42, It.IsAny<CancellationToken>()), Times.Once);
}
```

- [ ] Step 4: Run the tests to verify they fail

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL - build error, `TmdbService` has no `GetMovieDetailsAsync` method yet.

- [ ] Step 5: Implement TmdbService.GetMovieDetailsAsync

Add this method to `TmdbService`, and add `using MovieCatalog.Api.Models.Movies;` if not already present:

```csharp
public async Task<MovieDetailDto> GetMovieDetailsAsync(int tmdbId, CancellationToken ct)
{
    var cacheKey = "detail:" + tmdbId;
    if (_cache.TryGetValue(cacheKey, out MovieDetailDto? cached))
        return cached!;

    TmdbMovieDetail raw;
    try
    {
        raw = await _client.GetMovieDetailsAsync(tmdbId, ct);
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        throw new TmdbUnavailableException("Nao foi possivel buscar detalhes do filme " + tmdbId + " na TMDB.", ex);
    }

    var providerByTmdbId = _options.Providers.ToDictionary(p => p.TmdbProviderId);
    var flatrate = raw.WatchProviders?.Results.GetValueOrDefault(_options.WatchRegion)?.Flatrate ?? new();
    var providers = flatrate
        .Where(p => providerByTmdbId.ContainsKey(p.ProviderId))
        .Select(p => new ProviderDto(providerByTmdbId[p.ProviderId].Key, providerByTmdbId[p.ProviderId].DisplayName))
        .ToList();

    var cast = (raw.Credits?.Cast ?? new())
        .OrderBy(c => c.Order)
        .Take(10)
        .Select(c => new CastMemberDto(c.Name, c.Character, TmdbImageUrlBuilder.Profile(c.ProfilePath)))
        .ToList();

    var result = new MovieDetailDto(
        raw.Id, raw.Title, raw.Overview,
        TmdbImageUrlBuilder.Poster(raw.PosterPath),
        TmdbImageUrlBuilder.Backdrop(raw.BackdropPath),
        raw.ReleaseDate, raw.VoteAverage, raw.Runtime,
        raw.Genres.Select(g => new GenreDto(g.Id, g.Name)).ToList(),
        cast, providers);

    _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.DetailCacheHours));
    return result;
}
```

- [ ] Step 6: Run the tests to verify they pass

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (all TmdbServiceTests, including the two new ones)

- [ ] Step 7: Add the detail endpoint to MoviesController

Add this action inside `MoviesController`:

```csharp
[HttpGet("movies/{tmdbId:int}")]
public async Task<ActionResult<MovieDetailDto>> GetDetails(int tmdbId, CancellationToken ct)
{
    var result = await _tmdbService.GetMovieDetailsAsync(tmdbId, ct);
    return Ok(result);
}
```

- [ ] Step 8: Verify manually

```bash
curl -k "https://localhost:7159/api/movies/550"
```

Expected: `200 OK` with title, overview, cast, and `watchProviders` limited to the curated list (may be empty if that title is not on any of the configured services in Brazil).

- [ ] Step 9: Commit

```bash
git add backend
git commit -m "feat: add TmdbService movie details with cast and provider filtering"
```

---

### Task 8: TmdbService - search, genres, providers list (TDD) + endpoints

**Files:**
- Modify: `backend/MovieCatalog.Api/Services/Tmdb/ITmdbService.cs`
- Modify: `backend/MovieCatalog.Api/Services/Tmdb/TmdbService.cs`
- Modify: `backend/MovieCatalog.Api/Controllers/MoviesController.cs`
- Test: `backend/MovieCatalog.Api.Tests/Services/TmdbServiceTests.cs`

**Interfaces:**
- Produces: `SearchMoviesAsync(string query, int page, CancellationToken ct)`, `GetGenresAsync(CancellationToken ct)`, `GetProviders()`, wired to `GET /api/movies/search`, `GET /api/genres`, `GET /api/providers`.

- [ ] Step 1: Add the method signatures to ITmdbService

Add these lines inside the `ITmdbService` interface body:

```csharp
Task<PagedResultDto<MovieSummaryDto>> SearchMoviesAsync(string query, int page, CancellationToken ct);
Task<List<GenreDto>> GetGenresAsync(CancellationToken ct);
List<ProviderDto> GetProviders();
```

- [ ] Step 2: Write the failing tests

Append to `TmdbServiceTests.cs`:

```csharp
[Fact]
public async Task SearchMoviesAsync_CallsClientOnce_WhenCacheMisses()
{
    var client = new Mock<ITmdbClient>();
    client.Setup(c => c.SearchMoviesAsync("matrix", 1, It.IsAny<CancellationToken>())).ReturnsAsync(BuildRawPage());

    var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

    var result = await service.SearchMoviesAsync("matrix", 1, CancellationToken.None);

    Assert.Single(result.Results);
    client.Verify(c => c.SearchMoviesAsync("matrix", 1, It.IsAny<CancellationToken>()), Times.Once);
}

[Fact]
public async Task GetGenresAsync_CachesResult()
{
    var client = new Mock<ITmdbClient>();
    client.Setup(c => c.GetGenresAsync(It.IsAny<CancellationToken>()))
        .ReturnsAsync(new TmdbGenresResponse(new List<TmdbGenre> { new(28, "Acao") }));

    var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

    await service.GetGenresAsync(CancellationToken.None);
    var second = await service.GetGenresAsync(CancellationToken.None);

    Assert.Single(second);
    client.Verify(c => c.GetGenresAsync(It.IsAny<CancellationToken>()), Times.Once);
}

[Fact]
public void GetProviders_ReturnsConfiguredProviders()
{
    var client = new Mock<ITmdbClient>();
    var service = new TmdbService(client.Object, new MemoryCache(new MemoryCacheOptions()), Options.Create(BuildOptions()));

    var providers = service.GetProviders();

    Assert.Single(providers);
    Assert.Equal("netflix", providers[0].Key);
}
```

- [ ] Step 3: Run the tests to verify they fail

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL - build error, the three new members do not exist on `TmdbService` yet.

- [ ] Step 4: Implement the three methods

Add these to `TmdbService`:

```csharp
public async Task<PagedResultDto<MovieSummaryDto>> SearchMoviesAsync(string query, int page, CancellationToken ct)
{
    var cacheKey = "search:" + query + ":" + page;
    if (_cache.TryGetValue(cacheKey, out PagedResultDto<MovieSummaryDto>? cached))
        return cached!;

    TmdbPagedResponse<TmdbMovieSummary> raw;
    try
    {
        raw = await _client.SearchMoviesAsync(query, page, ct);
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        throw new TmdbUnavailableException("Nao foi possivel buscar filmes na TMDB.", ex);
    }

    var result = new PagedResultDto<MovieSummaryDto>(raw.Page, raw.TotalPages, raw.Results.Select(MapSummary).ToList());
    _cache.Set(cacheKey, result, TimeSpan.FromHours(_options.PopularCacheHours));
    return result;
}

public async Task<List<GenreDto>> GetGenresAsync(CancellationToken ct)
{
    const string cacheKey = "genres";
    if (_cache.TryGetValue(cacheKey, out List<GenreDto>? cached))
        return cached!;

    TmdbGenresResponse raw;
    try
    {
        raw = await _client.GetGenresAsync(ct);
    }
    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
    {
        throw new TmdbUnavailableException("Nao foi possivel buscar generos na TMDB.", ex);
    }

    var result = raw.Genres.Select(g => new GenreDto(g.Id, g.Name)).ToList();
    _cache.Set(cacheKey, result, TimeSpan.FromDays(_options.StaticCacheDays));
    return result;
}

public List<ProviderDto> GetProviders() =>
    _options.Providers.Select(p => new ProviderDto(p.Key, p.DisplayName)).ToList();
```

- [ ] Step 5: Run the tests to verify they pass

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (all TmdbServiceTests)

- [ ] Step 6: Add the remaining endpoints to MoviesController

Add these actions inside `MoviesController`:

```csharp
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
```

- [ ] Step 7: Verify manually

```bash
curl -k "https://localhost:7159/api/movies/search?query=matrix&page=1"
curl -k "https://localhost:7159/api/genres"
curl -k "https://localhost:7159/api/providers"
```

Expected: `200 OK` for all three, each with the shape described in the spec's endpoint list.

- [ ] Step 8: Commit

```bash
git add backend
git commit -m "feat: add search, genres, and providers endpoints to TmdbService"
```

---

### Task 9: WatchlistItem entity + WatchlistService (TDD)

**Files:**
- Create: `backend/MovieCatalog.Api/Data/WatchlistItem.cs`
- Modify: `backend/MovieCatalog.Api/Data/ApplicationDbContext.cs`
- Create: `backend/MovieCatalog.Api/Services/Watchlist/IWatchlistService.cs`
- Create: `backend/MovieCatalog.Api/Services/Watchlist/WatchlistService.cs`
- Create: `backend/MovieCatalog.Api/Migrations/*` (generated)
- Test: `backend/MovieCatalog.Api.Tests/Services/WatchlistServiceTests.cs`

**Interfaces:**
- Produces: `IWatchlistService.GetTmdbMovieIdsAsync(userId, ct) : Task<List<int>>`, `AddAsync(userId, tmdbMovieId, ct) : Task`, `RemoveAsync(userId, tmdbMovieId, ct) : Task` - consumed by `WatchlistController` in Task 10.

- [ ] Step 1: Create the WatchlistItem entity

```csharp
// MovieCatalog.Api/Data/WatchlistItem.cs
namespace MovieCatalog.Api.Data;

public class WatchlistItem
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int TmdbMovieId { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

- [ ] Step 2: Add the DbSet and unique index to ApplicationDbContext

Replace `ApplicationDbContext` with:

```csharp
// MovieCatalog.Api/Data/ApplicationDbContext.cs
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MovieCatalog.Api.Identity;

namespace MovieCatalog.Api.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<WatchlistItem> WatchlistItems => Set<WatchlistItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<WatchlistItem>()
            .HasIndex(w => new { w.UserId, w.TmdbMovieId })
            .IsUnique();
    }
}
```

- [ ] Step 3: Create IWatchlistService

```csharp
// MovieCatalog.Api/Services/Watchlist/IWatchlistService.cs
namespace MovieCatalog.Api.Services.Watchlist;

public interface IWatchlistService
{
    Task<List<int>> GetTmdbMovieIdsAsync(string userId, CancellationToken ct);
    Task AddAsync(string userId, int tmdbMovieId, CancellationToken ct);
    Task RemoveAsync(string userId, int tmdbMovieId, CancellationToken ct);
}
```

- [ ] Step 4: Write the failing tests

```csharp
// MovieCatalog.Api.Tests/Services/WatchlistServiceTests.cs
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
```

- [ ] Step 5: Run the tests to verify they fail

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: FAIL - `WatchlistService` does not exist yet.

- [ ] Step 6: Implement WatchlistService

```csharp
// MovieCatalog.Api/Services/Watchlist/WatchlistService.cs
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

        try
        {
            await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            foreach (var entry in _context.ChangeTracker.Entries<WatchlistItem>()
                .Where(e => e.State == EntityState.Added))
            {
                entry.State = EntityState.Detached;
            }

            // Only swallow this as a benign race (a concurrent AddAsync for the same
            // (userId, tmdbMovieId) won the unique index) if the row now actually
            // exists. Any other cause of the failure - the row still isn't there -
            // is a real error and must surface to the caller.
            var existsNow = await _context.WatchlistItems
                .AnyAsync(w => w.UserId == userId && w.TmdbMovieId == tmdbMovieId, ct);
            if (!existsNow) throw;
        }
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
```

- [ ] Step 7: Run the tests to verify they pass

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (all WatchlistServiceTests)

- [ ] Step 8: Register IWatchlistService and generate the migration

Add this line to `Program.cs`, right after the `AddScoped<ITmdbService, TmdbService>();` line from Task 6:

```csharp
builder.Services.AddScoped<Services.Watchlist.IWatchlistService, Services.Watchlist.WatchlistService>();
```

```bash
cd backend/MovieCatalog.Api
dotnet ef migrations add AddWatchlistItems
dotnet ef database update
cd ../..
```

Expected: a new migration file adding the `WatchlistItems` table with the unique `(UserId, TmdbMovieId)` index; if a local SQL Server/LocalDB instance is reachable, `database update` applies it.

- [ ] Step 9: Commit

```bash
git add backend
git commit -m "feat: add WatchlistItem entity and WatchlistService with tests"
```

---

### Task 10: WatchlistController

**Files:**
- Create: `backend/MovieCatalog.Api/Controllers/WatchlistController.cs`

**Interfaces:**
- Consumes: `IWatchlistService` (Task 9), `ITmdbService.GetMovieDetailsAsync` (Task 7).
- Produces: `GET /api/watchlist`, `POST /api/watchlist/{tmdbMovieId}`, `DELETE /api/watchlist/{tmdbMovieId}` (all `[Authorize]`) - consumed by the frontend's `watchlistApi` in Task 12+.

No automated tests for this task (controller wiring only; the underlying `WatchlistService` already has unit tests) - verified manually.

- [ ] Step 1: Implement WatchlistController

```csharp
// MovieCatalog.Api/Controllers/WatchlistController.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieCatalog.Api.Exceptions;
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
    private readonly ILogger<WatchlistController> _logger;

    public WatchlistController(IWatchlistService watchlistService, ITmdbService tmdbService, ILogger<WatchlistController> logger)
    {
        _watchlistService = watchlistService;
        _tmdbService = tmdbService;
        _logger = logger;
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
            try
            {
                var detail = await _tmdbService.GetMovieDetailsAsync(tmdbId, ct);
                movies.Add(new MovieSummaryDto(
                    detail.TmdbId, detail.Title, detail.Overview,
                    detail.PosterUrl, detail.BackdropUrl, detail.ReleaseDate, detail.VoteAverage));
            }
            catch (TmdbUnavailableException ex)
            {
                // A single delisted/renumbered movie must not take down the whole
                // watchlist - skip it and let the user still see (and remove) the rest.
                _logger.LogWarning(ex, "Skipping TMDB movie {TmdbId} in watchlist for user {UserId}: details unavailable", tmdbId, CurrentUserId);
            }
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
```

**Amendment (post Task 10 review):** the plan originally had `Get()` call `_tmdbService.GetMovieDetailsAsync` unguarded per item, so one delisted/renumbered TMDB movie in a user's watchlist would 503 the whole list with no way to recover except a blind DELETE. Added a per-item `try/catch (TmdbUnavailableException)` that logs and skips the bad entry instead, so the rest of the list still renders.

- [ ] Step 2: Verify manually

```bash
TOKEN=$(curl -k -s -X POST https://localhost:7159/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"teste@exemplo.com\",\"password\":\"SenhaForte123\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
curl -k -X POST https://localhost:7159/api/watchlist/550 -H "Authorization: Bearer $TOKEN"
curl -k https://localhost:7159/api/watchlist -H "Authorization: Bearer $TOKEN"
curl -k -X DELETE https://localhost:7159/api/watchlist/550 -H "Authorization: Bearer $TOKEN"
```

Expected: `POST` returns `204`, the `GET` in between shows the movie, and after `DELETE` a repeated `GET` returns an empty list.

- [ ] Step 3: Commit

```bash
git add backend
git commit -m "feat: add WatchlistController with authenticated CRUD endpoints"
```

---

### Task 11: Rate limiting, HTTPS/HSTS, response compression

**Files:**
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Modify: `backend/MovieCatalog.Api/Controllers/AuthController.cs`
- Modify: `backend/MovieCatalog.Api/Controllers/MoviesController.cs`
- Modify: `backend/MovieCatalog.Api/Controllers/WatchlistController.cs`

**Interfaces:**
- Produces: two named rate-limit policies, `"auth"` (5 requests/minute) and `"catalog"` (60 requests/minute), applied via `[EnableRateLimiting]`.

No new unit tests - this is ASP.NET Core's built-in middleware, verified manually by exceeding the limit.

- [ ] Step 1: Register rate limiting, compression, and HSTS in Program.cs

Add this `using` statement:

```csharp
using Microsoft.AspNetCore.RateLimiting;
```

Add this block right after the TMDB/cache registrations from Task 5 (before `var app = builder.Build();`):

```csharp
builder.Services.AddResponseCompression();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("catalog", opt =>
    {
        opt.PermitLimit = 60;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});
```

**Amendment (post Task 11 review):** `AddRateLimiter` defaults `RejectionStatusCode` to `503 Service Unavailable`, not `429 Too Many Requests` - the implementer caught this when the manual verification returned 503 instead of the expected 429. Added `options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;` so throttled requests are distinguishable from genuine TMDB-outage 503s (which `GlobalExceptionHandler` already uses for `TmdbUnavailableException`).

Replace the `if (app.Environment.IsDevelopment()) { ... }` block with:

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}
```

Add these two lines right after `app.UseHttpsRedirection();` and before `app.UseAuthentication();`:

```csharp
app.UseResponseCompression();
app.UseRateLimiter();
```

- [ ] Step 2: Apply the "auth" policy to AuthController

Add `using Microsoft.AspNetCore.RateLimiting;` to `AuthController.cs`, and add this attribute directly above the class declaration:

```csharp
[EnableRateLimiting("auth")]
```

- [ ] Step 3: Apply the "catalog" policy to MoviesController and WatchlistController

Add `using Microsoft.AspNetCore.RateLimiting;` to both files, and add `[EnableRateLimiting("catalog")]` directly above each class declaration (`MoviesController` and `WatchlistController`).

- [ ] Step 4: Run the full test suite

Run: `dotnet test backend/MovieCatalog.Api.Tests`
Expected: PASS (rate limiting doesn't affect `WebApplicationFactory`/unit tests since they don't exceed the window)

- [ ] Step 5: Verify manually

```bash
cd backend/MovieCatalog.Api
dotnet run
```

```bash
for i in 1 2 3 4 5 6; do curl -k -s -o /dev/null -w "%{http_code}\n" -X POST https://localhost:7159/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"x@x.com\",\"password\":\"wrong\"}"; done
```

Expected: the first 5 requests return `401`, the 6th returns `429 Too Many Requests`.

- [ ] Step 6: Commit

```bash
git add backend
git commit -m "feat: add rate limiting, response compression, and HSTS"
```

---

### Task 12: Frontend scaffold (Vite + React + TypeScript) with dev proxy

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/types/movie.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/movies.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/watchlist.ts`
- Modify: `.gitignore` (add node_modules, dist)

**Interfaces:**
- Produces: `apiClient.get/post/delete`, `moviesApi`, `authApi`, `watchlistApi` - consumed by every page/component from Task 13 onward. Types (`MovieSummary`, `MovieDetail`, `PagedResult<T>`, `Genre`, `Provider`) mirror the backend DTOs from Tasks 6-8 (property names match because ASP.NET Core's default JSON serializer uses camelCase).

No automated tests in this task (per spec scope) - verified by running the dev server and confirming API calls succeed through the proxy.

- [ ] Step 1: Scaffold the Vite project

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom
cd ..
```

- [ ] Step 2: Find the backend's local HTTPS port and configure the dev proxy

```bash
cat backend/MovieCatalog.Api/Properties/launchSettings.json
```

Note the `applicationUrl` for the `https` profile (e.g. `https://localhost:7159`). Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7159',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

Replace `7159` with the port you found. This keeps the browser talking to a single origin (the Vite dev server), matching the "no CORS" architecture decision even in development.

- [ ] Step 3: Create the shared types

```ts
// frontend/src/types/movie.ts
export interface MovieSummary {
  tmdbId: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string | null
  voteAverage: number
}

export interface PagedResult<T> {
  page: number
  totalPages: number
  results: T[]
}

export interface Genre {
  id: number
  name: string
}

export interface Provider {
  key: string
  displayName: string
}

export interface CastMember {
  name: string
  character: string
  profileUrl: string | null
}

export interface MovieDetail {
  tmdbId: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string | null
  voteAverage: number
  runtimeMinutes: number | null
  genres: Genre[]
  cast: CastMember[]
  watchProviders: Provider[]
}
```

- [ ] Step 4: Create the API client with auth token injection and cancellation support

```ts
// frontend/src/api/client.ts
const BASE_URL = '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (authToken) headers.set('Authorization', 'Bearer ' + authToken)

  const response = await fetch(BASE_URL + path, { ...options, headers })
  if (!response.ok) {
    throw new Error('Erro na requisicao: ' + response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}
```

- [ ] Step 5: Create the typed API modules

```ts
// frontend/src/api/movies.ts
import { apiClient } from './client'
import type { MovieDetail, MovieSummary, PagedResult, Genre, Provider } from '../types/movie'

export const moviesApi = {
  getPopular: (providerKey: string, page: number, genreId?: number, signal?: AbortSignal) =>
    apiClient.get<PagedResult<MovieSummary>>(
      '/movies/popular?provider=' + providerKey + '&page=' + page + (genreId ? '&genre=' + genreId : ''),
      signal
    ),
  search: (query: string, page: number, signal?: AbortSignal) =>
    apiClient.get<PagedResult<MovieSummary>>(
      '/movies/search?query=' + encodeURIComponent(query) + '&page=' + page, signal
    ),
  getDetails: (tmdbId: number) => apiClient.get<MovieDetail>('/movies/' + tmdbId),
  getProviders: () => apiClient.get<Provider[]>('/providers'),
  getGenres: () => apiClient.get<Genre[]>('/genres')
}
```

```ts
// frontend/src/api/auth.ts
import { apiClient } from './client'

export interface AuthResponse {
  token: string
  email: string
}

export const authApi = {
  register: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password })
}
```

```ts
// frontend/src/api/watchlist.ts
import { apiClient } from './client'
import type { MovieSummary } from '../types/movie'

export const watchlistApi = {
  get: () => apiClient.get<MovieSummary[]>('/watchlist'),
  add: (tmdbId: number) => apiClient.post<void>('/watchlist/' + tmdbId),
  remove: (tmdbId: number) => apiClient.delete<void>('/watchlist/' + tmdbId)
}
```

- [ ] Step 6: Update .gitignore and verify the dev server proxies correctly

Append to the repo-root `.gitignore`:

```
frontend/node_modules/
frontend/dist/
```

In one terminal: `cd backend/MovieCatalog.Api && dotnet run`
In another: `cd frontend && npm run dev`

Open the printed Vite URL (e.g. `http://localhost:5173`), open the browser dev tools console, and run:

```js
fetch('/api/providers').then(r => r.json()).then(console.log)
```

Expected: the configured providers list logs to the console (no CORS error), confirming the proxy works.

- [ ] Step 7: Commit

```bash
git add frontend .gitignore
git commit -m "feat: scaffold React + TypeScript frontend with API client and dev proxy"
```

---

### Task 13: AuthContext + routing shell + Login/Register pages

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/pages/HomePage.tsx` (placeholder, filled in Task 15)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces: `AuthProvider`, `useAuth() : { token, email, login(token, email), logout() }` - consumed by every page that needs to know if a user is logged in (Task 16's `MovieModal`, Task 18's `WatchlistPage`).

Verified manually in the browser (no automated UI tests per spec scope).

- [ ] Step 1: Create AuthContext

```tsx
// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import { setAuthToken } from '../api/client'

interface AuthState {
  token: string | null
  email: string | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, email: null })

  function login(token: string, email: string) {
    setAuthToken(token)
    setState({ token, email })
  }

  function logout() {
    setAuthToken(null)
    setState({ token: null, email: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
```

- [ ] Step 2: Create LoginPage and RegisterPage

```tsx
// frontend/src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await authApi.login(email, password)
      login(result.token, result.email)
      navigate('/')
    } catch {
      setError('E-mail ou senha invalidos.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Entrar</h1>
      <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="form-error">{error}</p>}
      <button type="submit">Entrar</button>
    </form>
  )
}
```

```tsx
// frontend/src/pages/RegisterPage.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await authApi.register(email, password)
      login(result.token, result.email)
      navigate('/')
    } catch {
      setError('Nao foi possivel criar a conta. Verifique os dados e tente novamente.')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Criar conta</h1>
      <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      {error && <p className="form-error">{error}</p>}
      <button type="submit">Criar conta</button>
    </form>
  )
}
```

- [ ] Step 3: Create a placeholder HomePage and the routing shell

```tsx
// frontend/src/pages/HomePage.tsx
export default function HomePage() {
  return <div className="home-page"><p>Em construcao (Task 15).</p></div>
}
```

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

```tsx
// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

Note: `./styles/theme.css` is created in Task 14 - if running the dev server before then, temporarily comment out that import.

- [ ] Step 4: Verify manually

```bash
cd frontend
npm run dev
```

Open the dev server URL, go to `/cadastro`, register a test account, confirm it redirects to `/` without errors. Go to `/login` and confirm logging back in also works.

- [ ] Step 5: Commit

```bash
git add frontend
git commit -m "feat: add auth context, routing shell, and login/register pages"
```

---

### Task 14: Theme CSS + MovieCard + MovieCarousel

**Files:**
- Create: `frontend/src/styles/theme.css`
- Create: `frontend/src/components/MovieCard.tsx`
- Create: `frontend/src/components/MovieCarousel.tsx`
- Create: `frontend/src/components/ErrorBoundary.tsx`

**Interfaces:**
- Produces: `<MovieCard movie basePath />`, `<MovieCarousel title providerKey basePath />` (fetches its own data), `<ErrorBoundary fallback>` - consumed by `HomePage` (Task 15) and `BrowsePage`/`SearchPage` (Task 16).

Note: `posterUrl`/`backdropUrl` already come as full `image.tmdb.org` URLs from the backend (Task 6/7's `TmdbImageUrlBuilder`), so the frontend never needs to build TMDB image URLs itself.

- [ ] Step 1: Create the dark theme stylesheet

```css
/* frontend/src/styles/theme.css */
:root {
  --bg: #141414;
  --bg-elevated: #1f1f1f;
  --text: #ffffff;
  --text-muted: #b3b3b3;
  --accent: #e50914;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
}

.hero-banner {
  height: 60vh;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 32px;
}

.hero-banner-content h1 { font-size: 2.5rem; margin: 0 0 8px; }
.hero-banner-content p { max-width: 600px; color: var(--text-muted); }

.carousel { padding: 16px 32px; }
.carousel-row { display: flex; gap: 12px; overflow-x: auto; }
.carousel-error { padding: 0 32px; color: var(--text-muted); }

.movie-card img { width: 160px; border-radius: 4px; display: block; }
.movie-card-placeholder {
  width: 160px; height: 240px; background: var(--bg-elevated);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 8px;
}

.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 16px 32px;
}

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}

.modal-content {
  background: var(--bg-elevated); max-width: 700px; width: 90%;
  max-height: 85vh; overflow-y: auto; border-radius: 8px; padding: 24px; position: relative;
}

.modal-close {
  position: absolute; top: 12px; right: 12px; background: none; border: none;
  color: var(--text); font-size: 1.5rem; cursor: pointer;
}

.modal-backdrop { width: 100%; border-radius: 8px; margin-bottom: 16px; }

.provider-filter { display: flex; gap: 12px; padding: 16px 32px; }
.provider-filter-item { color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 4px; }
.provider-filter-item.active { background: var(--accent); color: var(--text); }

.auth-form {
  max-width: 360px; margin: 64px auto; display: flex; flex-direction: column; gap: 12px; padding: 0 16px;
}
.auth-form input { padding: 10px; border-radius: 4px; border: 1px solid #333; background: var(--bg-elevated); color: var(--text); }

.search-input {
  margin: 16px 32px; width: calc(100% - 64px); padding: 10px; border-radius: 4px;
  border: 1px solid #333; background: var(--bg-elevated); color: var(--text);
}

button { background: var(--accent); color: var(--text); border: none; cursor: pointer; border-radius: 4px; padding: 8px 14px; }
```

- [ ] Step 2: Create MovieCard

```tsx
// frontend/src/components/MovieCard.tsx
import { Link } from 'react-router-dom'
import type { MovieSummary } from '../types/movie'

export default function MovieCard({ movie, basePath }: { movie: MovieSummary; basePath: string }) {
  return (
    <Link to={basePath + '/filme/' + movie.tmdbId} className="movie-card">
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
      ) : (
        <div className="movie-card-placeholder">{movie.title}</div>
      )}
    </Link>
  )
}
```

- [ ] Step 3: Create MovieCarousel

```tsx
// frontend/src/components/MovieCarousel.tsx
import { useEffect, useState } from 'react'
import { moviesApi } from '../api/movies'
import type { MovieSummary } from '../types/movie'
import MovieCard from './MovieCard'

export default function MovieCarousel({ title, providerKey, basePath }: { title: string; providerKey: string; basePath: string }) {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    moviesApi.getPopular(providerKey, 1)
      .then(result => { if (!cancelled) { setMovies(result.results); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [providerKey])

  if (status === 'error') {
    return <p className="carousel-error">Nao foi possivel carregar "{title}" agora.</p>
  }

  return (
    <section className="carousel">
      <h2>{title}</h2>
      <div className="carousel-row">
        {status === 'loading'
          ? <p>Carregando...</p>
          : movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath={basePath} />)}
      </div>
    </section>
  )
}
```

- [ ] Step 4: Create ErrorBoundary

```tsx
// frontend/src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
```

- [ ] Step 5: Uncomment the theme.css import in main.tsx (if it was commented in Task 13) and verify

```bash
cd frontend
npm run dev
```

Confirm the app loads with a dark background and no console errors.

- [ ] Step 6: Commit

```bash
git add frontend
git commit -m "feat: add dark theme, MovieCard, MovieCarousel, and ErrorBoundary"
```

---

### Task 15: HomePage (hero + carousels) + MovieModal route

**Files:**
- Create: `frontend/src/components/HeroBanner.tsx`
- Create: `frontend/src/components/MovieModal.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `moviesApi.getProviders/getPopular/getDetails` (Task 12), `watchlistApi.add` (Task 12), `useAuth()` (Task 13), `MovieCarousel`/`ErrorBoundary` (Task 14).
- Produces: the `/filme/:tmdbId` nested route rendered as an overlay on top of whichever page is active (matches the spec's "modal over current page with its own shareable URL" decision).

- [ ] Step 1: Create HeroBanner

```tsx
// frontend/src/components/HeroBanner.tsx
import type { MovieSummary } from '../types/movie'

export default function HeroBanner({ movie }: { movie: MovieSummary | null }) {
  if (!movie) return null
  return (
    <div className="hero-banner" style={{ backgroundImage: movie.backdropUrl ? 'url(' + movie.backdropUrl + ')' : undefined }}>
      <div className="hero-banner-content">
        <h1>{movie.title}</h1>
        <p>{movie.overview}</p>
      </div>
    </div>
  )
}
```

- [ ] Step 2: Create MovieModal

```tsx
// frontend/src/components/MovieModal.tsx
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { watchlistApi } from '../api/watchlist'
import { useAuth } from '../context/AuthContext'
import type { MovieDetail } from '../types/movie'

export default function MovieModal() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!tmdbId) return
    setStatus('loading')
    moviesApi.getDetails(Number(tmdbId))
      .then(result => { setMovie(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [tmdbId])

  function close() {
    // location.key is 'default' when there is no prior in-app history entry
    // (a direct link, a new tab, or a refresh) - navigate(-1) in that case
    // would leave the app entirely instead of closing back to the parent page.
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  async function addToWatchlist() {
    if (!movie || !token) return
    await watchlistApi.add(movie.tmdbId)
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>&times;</button>
        {status === 'loading' && <p>Carregando...</p>}
        {status === 'error' && <p>Nao foi possivel carregar este filme agora.</p>}
        {status === 'ready' && movie && (
          <>
            {movie.backdropUrl && <img src={movie.backdropUrl} alt={movie.title} className="modal-backdrop" />}
            <h2>{movie.title}</h2>
            <p>{movie.releaseDate ? movie.releaseDate.slice(0, 4) : ''} - {movie.voteAverage.toFixed(1)}</p>
            <p>{movie.overview}</p>
            <div className="modal-providers">
              {movie.watchProviders.map(p => <span key={p.key} className="provider-badge">{p.displayName}</span>)}
            </div>
            {token && <button onClick={addToWatchlist}>+ Minha Lista</button>}
            <h3>Elenco</h3>
            <div className="cast-row">
              {movie.cast.map(c => <div key={c.name}>{c.name} como {c.character}</div>)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

**Amendment (post Task 15 review):** the plan originally had `close()` call `navigate(-1)` unconditionally. For the exact use case this route pattern exists for - a shared/direct link to `/filme/:id` - there is no prior in-app history entry, so `navigate(-1)` would leave the SPA entirely rather than closing back to a parent page. Added a `location.key === 'default'` check (react-router-dom's signal for "no prior history in this session") to fall back to `navigate('/')` in that case.

- [ ] Step 3: Fill in HomePage with hero + carousels + Outlet

```tsx
// frontend/src/pages/HomePage.tsx
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import type { MovieSummary, Provider } from '../types/movie'
import HeroBanner from '../components/HeroBanner'
import MovieCarousel from '../components/MovieCarousel'
import { ErrorBoundary } from '../components/ErrorBoundary'

export default function HomePage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [heroMovie, setHeroMovie] = useState<MovieSummary | null>(null)

  useEffect(() => {
    moviesApi.getProviders()
      .then(loadedProviders => {
        setProviders(loadedProviders)
        if (loadedProviders.length > 0) {
          moviesApi.getPopular(loadedProviders[0].key, 1)
            .then(firstPage => setHeroMovie(firstPage.results[0] ?? null))
            .catch(() => setHeroMovie(null))
        }
      })
      .catch(() => setProviders([]))
  }, [])

  return (
    <div className="home-page">
      <HeroBanner movie={heroMovie} />
      {providers.map(provider => (
        <ErrorBoundary key={provider.key} fallback={<p className="carousel-error">Nao foi possivel carregar esta secao.</p>}>
          <MovieCarousel title={'Em alta na ' + provider.displayName} providerKey={provider.key} basePath="" />
        </ErrorBoundary>
      ))}
      <Outlet />
    </div>
  )
}
```

**Amendment (post Task 15 review):** the plan originally chained the hero-movie fetch inside the providers `.then()`, so a transient failure fetching just the hero's first popular page fell into the outer `.catch()` and reset `providers` to `[]` too - wiping the entire carousel section over a secondary fetch failure. Split into two independent promise chains so a hero-fetch failure only clears `heroMovie`, not `providers`.

- [ ] Step 4: Add the modal route to App.tsx

Replace the `<Route path="/" element={<HomePage />} />` line with:

```tsx
<Route path="/" element={<HomePage />}>
  <Route path="filme/:tmdbId" element={<MovieModal />} />
</Route>
```

Add the import at the top of `App.tsx`:

```tsx
import MovieModal from './components/MovieModal'
```

- [ ] Step 5: Verify manually

```bash
cd frontend
npm run dev
```

Confirm the home page shows a hero banner and one carousel per configured provider, and clicking a poster opens the modal with the URL changing to `/filme/<id>` while the carousels stay visible behind it. Clicking the close button or outside the modal returns to `/`.

- [ ] Step 6: Commit

```bash
git add frontend
git commit -m "feat: add HomePage hero/carousels and movie detail modal"
```

---

### Task 16: Debounce/infinite-scroll hooks + SearchPage

**Files:**
- Create: `frontend/src/hooks/useDebounce.ts`
- Create: `frontend/src/hooks/useInfiniteScroll.ts`
- Create: `frontend/src/pages/SearchPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `useDebounce<T>(value, delayMs) : T`, `useInfiniteScroll(onIntersect, enabled) : RefObject<HTMLDivElement>` - reused by `BrowsePage` in Task 17.

- [ ] Step 1: Create useDebounce

```ts
// frontend/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
```

- [ ] Step 2: Create useInfiniteScroll

```ts
// frontend/src/hooks/useInfiniteScroll.ts
import { useEffect, useRef } from 'react'

export function useInfiniteScroll(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onIntersect()
    }, { rootMargin: '200px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [onIntersect, enabled])

  return sentinelRef
}
```

- [ ] Step 3: Create SearchPage with debounce, cancellation, and infinite scroll

```tsx
// frontend/src/pages/SearchPage.tsx
import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { useDebounce } from '../hooks/useDebounce'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import type { MovieSummary } from '../types/movie'
import MovieCard from '../components/MovieCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 400)
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!debouncedQuery) { setMovies([]); setPage(1); setTotalPages(1); return }

    const controller = new AbortController()
    setStatus('loading')
    moviesApi.search(debouncedQuery, 1, controller.signal)
      .then(result => {
        setMovies(result.results)
        setPage(1)
        setTotalPages(result.totalPages)
        setStatus('idle')
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })

    return () => controller.abort()
  }, [debouncedQuery])

  const loadMore = useCallback(() => {
    if (status === 'loading' || page >= totalPages) return
    setStatus('loading')
    moviesApi.search(debouncedQuery, page + 1)
      .then(result => {
        setMovies(prev => [...prev, ...result.results])
        setPage(result.page)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [debouncedQuery, page, totalPages, status])

  const sentinelRef = useInfiniteScroll(loadMore, page < totalPages)

  return (
    <div className="search-page">
      <input
        className="search-input"
        placeholder="Buscar filme..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="movie-grid">
        {movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath="/busca" />)}
      </div>
      {status === 'error' && <p>Nao foi possivel buscar agora. Tente novamente.</p>}
      <div ref={sentinelRef} />
      <Outlet />
    </div>
  )
}
```

- [ ] Step 4: Add the search route to App.tsx

Add the import: `import SearchPage from './pages/SearchPage'`

Add this route (with a nested modal route, same pattern as HomePage):

```tsx
<Route path="/busca" element={<SearchPage />}>
  <Route path="filme/:tmdbId" element={<MovieModal />} />
</Route>
```

- [ ] Step 5: Verify manually

```bash
cd frontend
npm run dev
```

Go to `/busca`, type a query (e.g. "matrix"), confirm results appear ~400ms after you stop typing, and scroll to the bottom to confirm more pages load automatically.

- [ ] Step 6: Commit

```bash
git add frontend
git commit -m "feat: add debounced search page with infinite scroll"
```

---

### Task 17: ProviderFilter + BrowsePage (provider + genre browsing)

**Files:**
- Create: `frontend/src/components/ProviderFilter.tsx`
- Create: `frontend/src/pages/BrowsePage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useInfiniteScroll` (Task 16), `moviesApi.getPopular/getProviders/getGenres` (Task 12).
- Produces: the `/streaming/:providerKey` route - the concrete implementation of the spec's "filtro por servico de streaming e genero" requirement (full infinite-scroll catalog per provider, as opposed to the bounded home-page carousels).

- [ ] Step 1: Create ProviderFilter

```tsx
// frontend/src/components/ProviderFilter.tsx
import { Link } from 'react-router-dom'
import type { Provider } from '../types/movie'

export default function ProviderFilter({ providers, activeKey }: { providers: Provider[]; activeKey?: string }) {
  return (
    <nav className="provider-filter">
      {providers.map(p => (
        <Link
          key={p.key}
          to={'/streaming/' + p.key}
          className={p.key === activeKey ? 'provider-filter-item active' : 'provider-filter-item'}
        >
          {p.displayName}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] Step 2: Create BrowsePage

```tsx
// frontend/src/pages/BrowsePage.tsx
import { useCallback, useEffect, useState } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import { moviesApi } from '../api/movies'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import type { MovieSummary, Provider, Genre } from '../types/movie'
import MovieCard from '../components/MovieCard'
import ProviderFilter from '../components/ProviderFilter'

export default function BrowsePage() {
  const { providerKey } = useParams<{ providerKey: string }>()
  const [providers, setProviders] = useState<Provider[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [genreId, setGenreId] = useState<number | undefined>(undefined)
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading')

  useEffect(() => {
    moviesApi.getProviders().then(setProviders).catch(() => setProviders([]))
    moviesApi.getGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    if (!providerKey) return
    const controller = new AbortController()
    setStatus('loading')
    setMovies([])
    setPage(1)
    moviesApi.getPopular(providerKey, 1, genreId, controller.signal)
      .then(result => { setMovies(result.results); setTotalPages(result.totalPages); setStatus('idle') })
      .catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => controller.abort()
  }, [providerKey, genreId])

  const loadMore = useCallback(() => {
    if (!providerKey || status === 'loading' || page >= totalPages) return
    setStatus('loading')
    moviesApi.getPopular(providerKey, page + 1, genreId)
      .then(result => {
        setMovies(prev => [...prev, ...result.results])
        setPage(result.page)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [providerKey, genreId, page, totalPages, status])

  const sentinelRef = useInfiniteScroll(loadMore, page < totalPages)

  return (
    <div className="browse-page">
      <ProviderFilter providers={providers} activeKey={providerKey} />
      <select value={genreId ?? ''} onChange={e => setGenreId(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Todos os generos</option>
        {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <div className="movie-grid">
        {movies.map(movie => <MovieCard key={movie.tmdbId} movie={movie} basePath={'/streaming/' + providerKey} />)}
      </div>
      {status === 'error' && <p>Nao foi possivel carregar agora. Tente novamente.</p>}
      <div ref={sentinelRef} />
      <Outlet />
    </div>
  )
}
```

- [ ] Step 3: Add the browse route to App.tsx

Add the import: `import BrowsePage from './pages/BrowsePage'`

Add this route:

```tsx
<Route path="/streaming/:providerKey" element={<BrowsePage />}>
  <Route path="filme/:tmdbId" element={<MovieModal />} />
</Route>
```

- [ ] Step 4: Verify manually

```bash
cd frontend
npm run dev
```

Go to `/streaming/netflix`, confirm a full infinite-scroll grid loads, switch to another provider via the filter nav, and confirm selecting a genre from the dropdown resets the grid and re-filters.

- [ ] Step 5: Commit

```bash
git add frontend
git commit -m "feat: add provider/genre browse page with infinite scroll"
```

---

### Task 18: NavBar + WatchlistPage (Minha Lista)

**Files:**
- Create: `frontend/src/components/NavBar.tsx`
- Create: `frontend/src/pages/WatchlistPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles/theme.css`

**Interfaces:**
- Consumes: `useAuth()` (Task 13), `watchlistApi` (Task 12).
- Produces: top-level navigation between Home, Search, and Minha Lista, plus login/logout controls - the only way a user reaches `/minha-lista` or logs out once past Task 13's forms.

- [ ] Step 1: Create NavBar

```tsx
// frontend/src/components/NavBar.tsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { token, email, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav-bar">
      <Link to="/" className="nav-brand">Catalogo</Link>
      <div className="nav-links">
        <Link to="/busca">Buscar</Link>
        {token && <Link to="/minha-lista">Minha Lista</Link>}
        {token ? (
          <>
            <span className="nav-user">{email}</span>
            <button onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login">Entrar</Link>
            <Link to="/cadastro">Criar conta</Link>
          </>
        )}
      </div>
    </nav>
  )
}
```

- [ ] Step 2: Create WatchlistPage

```tsx
// frontend/src/pages/WatchlistPage.tsx
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { watchlistApi } from '../api/watchlist'
import type { MovieSummary } from '../types/movie'
import MovieCard from '../components/MovieCard'

export default function WatchlistPage() {
  const [movies, setMovies] = useState<MovieSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    watchlistApi.get()
      .then(result => { setMovies(result); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [])

  async function remove(tmdbId: number) {
    await watchlistApi.remove(tmdbId)
    setMovies(prev => prev.filter(m => m.tmdbId !== tmdbId))
  }

  if (status === 'loading') return <p>Carregando...</p>
  if (status === 'error') return <p>Nao foi possivel carregar sua lista agora.</p>

  return (
    <div className="watchlist-page">
      <h1>Minha Lista</h1>
      <div className="movie-grid">
        {movies.map(movie => (
          <div key={movie.tmdbId} className="watchlist-item">
            <MovieCard movie={movie} basePath="/minha-lista" />
            <button onClick={() => remove(movie.tmdbId)}>Remover</button>
          </div>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
```

- [ ] Step 3: Mount NavBar and the watchlist route in App.tsx

Replace `App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import BrowsePage from './pages/BrowsePage'
import WatchlistPage from './pages/WatchlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MovieModal from './components/MovieModal'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/busca" element={<SearchPage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/streaming/:providerKey" element={<BrowsePage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/minha-lista" element={<WatchlistPage />}>
            <Route path="filme/:tmdbId" element={<MovieModal />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] Step 4: Add NavBar styles

Append to `frontend/src/styles/theme.css`:

```css
.nav-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 32px; position: sticky; top: 0; background: var(--bg); z-index: 10;
}
.nav-brand { color: var(--text); font-weight: bold; text-decoration: none; font-size: 1.2rem; }
.nav-links { display: flex; align-items: center; gap: 16px; }
.nav-links a { color: var(--text-muted); text-decoration: none; }
.nav-user { color: var(--text-muted); }
.watchlist-item { display: flex; flex-direction: column; gap: 6px; }
```

- [ ] Step 5: Verify manually

```bash
cd frontend
npm run dev
```

Confirm: logged out, the nav shows "Entrar"/"Criar conta" and no "Minha Lista" link. After logging in, "Minha Lista" appears; opening a movie modal and clicking "+ Minha Lista", then visiting `/minha-lista`, shows that movie; clicking "Remover" takes it out of the list; "Sair" logs out and hides "Minha Lista" again.

- [ ] Step 6: Commit

```bash
git add frontend
git commit -m "feat: add navigation bar and watchlist page"
```

---

### Task 19: Production build wiring (wwwroot copy + SPA fallback) + deploy docs

**Files:**
- Modify: `backend/MovieCatalog.Api/MovieCatalog.Api.csproj`
- Modify: `backend/MovieCatalog.Api/Program.cs`
- Create: `README.md` (repo root)

**Interfaces:** none new - this task wires together everything built in Tasks 1-18 into a single deployable artifact.

- [ ] Step 1: Add an MSBuild target that builds the frontend and copies it into wwwroot on publish

Add this `<Target>` element inside the `<Project>` root of `backend/MovieCatalog.Api/MovieCatalog.Api.csproj` (as a sibling of the existing `<PropertyGroup>`/`<ItemGroup>` elements):

```xml
<Target Name="BuildAndCopyFrontend" BeforeTargets="Publish">
  <Exec Command="npm install" WorkingDirectory="../../frontend" />
  <Exec Command="npm run build" WorkingDirectory="../../frontend" />
  <RemoveDir Directories="wwwroot" Condition="Exists('wwwroot')" />
  <ItemGroup>
    <FrontendDistFiles Include="../../frontend/dist/**/*.*" />
  </ItemGroup>
  <Copy SourceFiles="@(FrontendDistFiles)" DestinationFolder="wwwroot/%(RecursiveDir)" />
</Target>
```

This runs automatically before `dotnet publish` (which is what a GitHub-triggered deploy on SmarterASP.NET runs), so a single publish produces both the API and the built React app in one artifact - no separate CI pipeline needed.

- [ ] Step 2: Add SPA static file serving and fallback routing to Program.cs

Add these two lines right before `app.Run();` (after `app.MapControllers();`):

```csharp
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
```

`MapFallbackToFile` ensures client-side routes like `/streaming/netflix` or `/filme/550` (which do not exist as physical files) still load `index.html` and let React Router take over, instead of returning a 404.

- [ ] Step 3: Add wwwroot to .gitignore

Append to the repo-root `.gitignore` (the built frontend is regenerated on every publish, not committed):

```
backend/MovieCatalog.Api/wwwroot/
```

- [ ] Step 4: Verify the full production build locally

```bash
cd backend/MovieCatalog.Api
dotnet publish -c Release -o ./publish-test
```

Expected: the command runs `npm install`/`npm run build` for the frontend, then `./publish-test/wwwroot/index.html` and the built JS/CSS assets exist alongside the published API DLLs.

```bash
cd publish-test
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__DefaultConnection="Server=(localdb)\mssqllocaldb;Database=MovieCatalogDb;Trusted_Connection=True;" \
Jwt__Key="local-verification-key-at-least-32-characters" \
Tmdb__ReadAccessToken="<your token>" \
dotnet MovieCatalog.Api.dll
```

Open the printed URL in a browser and confirm the full app (not just the API) loads, including client-side routes like `/busca` on a hard refresh.

```bash
cd ../..
rm -rf backend/MovieCatalog.Api/publish-test
```

- [ ] Step 5: Write the deploy README

```markdown
# Catalogo de Filmes

Catalogo/descoberta de filmes estilo Netflix, usando a API da TMDB. Ver `docs/superpowers/specs/2026-08-05-catalogo-filmes-design.md` para o design completo.

## Rodando localmente

Backend:

    cd backend/MovieCatalog.Api
    dotnet user-secrets set "Tmdb:ReadAccessToken" "<seu token>"
    dotnet user-secrets set "Jwt:Key" "<qualquer string aleatoria de 32+ caracteres>"
    dotnet ef database update
    dotnet run

Frontend (em outro terminal):

    cd frontend
    npm install
    npm run dev

## Deploy no SmarterASP.NET

O deploy via GitHub do SmarterASP.NET roda `dotnet publish` no projeto `backend/MovieCatalog.Api`, que builda o React automaticamente (ver `MovieCatalog.Api.csproj`) e publica tudo como um unico site.

Antes do primeiro deploy, crie estas variaveis de ambiente no pool do SmarterASP.NET:

| Variavel | Valor |
|---|---|
| `Tmdb__ReadAccessToken` | Seu TMDB Read Access Token (v4) |
| `ConnectionStrings__DefaultConnection` | Connection string do SQL Server do plano |
| `Jwt__Key` | String aleatoria, minimo 32 caracteres, unica para este projeto |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

Depois do primeiro deploy, aplique as migrations no banco do plano (rode localmente apontando a connection string de producao, ou via console do SmarterASP.NET se disponivel):

    dotnet ef database update --connection "<connection string de producao>"
```

- [ ] Step 6: Commit

```bash
git add backend/MovieCatalog.Api/MovieCatalog.Api.csproj backend/MovieCatalog.Api/Program.cs .gitignore README.md
git commit -m "feat: wire production build to serve React SPA from wwwroot, add deploy docs"
```
