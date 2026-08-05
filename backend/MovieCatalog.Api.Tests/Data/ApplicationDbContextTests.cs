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
