# Catalogo de Filmes

Catalogo/descoberta de filmes estilo Netflix, usando a API da TMDB. Ver `docs/superpowers/specs/2026-08-05-catalogo-filmes-design.md` para o design completo.

## Rodando localmente

Backend:

    cd backend/MovieCatalog.Api
    dotnet user-secrets set "Tmdb:ReadAccessToken" "<seu token>"
    dotnet user-secrets set "Jwt:Key" "<qualquer string aleatoria de 32+ caracteres>"
    dotnet ef database update
    dotnet run --launch-profile https

O projeto tem dois launch profiles (`http` na porta 5128, `https` na porta 7299). O proxy de dev do frontend (`frontend/vite.config.ts`) aponta para a porta `https` (7299), entao rode com `--launch-profile https` - sem essa flag, `dotnet run` usa o profile `http` por padrao e as chamadas da API do frontend falham com connection refused.

Frontend (em outro terminal):

    cd frontend
    npm install
    npm run dev

## Deploy no SmarterASP.NET

O deploy via GitHub do SmarterASP.NET roda `dotnet publish` no projeto `backend/MovieCatalog.Api`, que builda o React automaticamente (ver `MovieCatalog.Api.csproj`) e publica tudo como um unico site.

**Dependencia de Node/npm:** o target MSBuild `BuildAndCopyFrontend` no `.csproj` roda `npm install` e `npm run build` a cada `dotnet publish`. Isso significa que o ambiente de build do SmarterASP.NET precisa ter Node.js/npm disponivel - sem isso, `dotnet publish` falha. Se a plataforma de destino nao puder rodar npm, uma alternativa e buildar o frontend separadamente (`npm run build` localmente) e commitar/enviar um `wwwroot` ja pronto em vez de depender do build automatico durante o publish (nao implementado atualmente - documentado aqui apenas como fallback).

Antes do primeiro deploy, crie estas variaveis de ambiente no pool do SmarterASP.NET:

| Variavel | Valor |
|---|---|
| `Tmdb__ReadAccessToken` | Seu TMDB Read Access Token (v4) |
| `ConnectionStrings__DefaultConnection` | Connection string do SQL Server do plano |
| `Jwt__Key` | String aleatoria, minimo 32 caracteres, unica para este projeto |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

Depois do primeiro deploy, aplique as migrations no banco do plano (rode localmente apontando a connection string de producao, ou via console do SmarterASP.NET se disponivel):

    dotnet ef database update --connection "<connection string de producao>"
