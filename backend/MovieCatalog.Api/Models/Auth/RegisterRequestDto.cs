using System.ComponentModel.DataAnnotations;

namespace MovieCatalog.Api.Models.Auth;

public record RegisterRequestDto(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password);
