using System.ComponentModel.DataAnnotations;

namespace MovieCatalog.Api.Models.Auth;

public record LoginRequestDto(
    [Required, EmailAddress] string Email,
    [Required] string Password);
