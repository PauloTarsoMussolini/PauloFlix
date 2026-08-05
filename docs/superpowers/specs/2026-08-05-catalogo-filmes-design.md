# Catálogo de Filmes estilo Netflix — Design

## Contexto e objetivo

Aplicativo de catálogo/descoberta de filmes, estilo Netflix, que mostra quais filmes estão disponíveis em quais serviços de streaming no Brasil no momento, usando a API da TMDB (The Movie Database) como fonte de dados. Projeto de portfólio/aprendizado, com foco em demonstrar boas práticas de front-end, backend, segurança e performance.

**Importante:** a TMDB fornece metadados (sinopse, elenco, pôsteres, avaliações) e informação de onde assistir, mas não hospeda vídeo. O app é um catálogo/descoberta — ao escolher assistir, o usuário é direcionado ao app/site do streaming correspondente. Não há reprodução de vídeo dentro do app.

## Escopo

**Dentro do escopo (v1):**
- Catálogo de filmes (não inclui séries de TV) disponíveis no Brasil.
- Navegação por home com destaque + carrosséis por categoria/streaming.
- Busca de filmes.
- Filtro por serviço de streaming (assinatura) e gênero.
- Página de detalhes do filme (sinopse, elenco, nota, onde assistir).
- Login/cadastro de usuário e "Minha Lista" (favoritos/watchlist).
- Scroll infinito nas listagens.

**Fora do escopo (v1 — possível evolução futura):**
- Séries de TV.
- Reprodução de vídeo dentro do app.
- Múltiplas regiões/idiomas (fixo em pt-BR/Brasil).
- Provedores de compra/aluguel avulso (só assinatura/"flatrate").
- Refresh token / renovação silenciosa de sessão.
- Recuperação de senha por e-mail.
- Painel administrativo.
- Avaliações/comentários de usuários.
- Testes automatizados de UI (front-end).

## Arquitetura

Monólito ASP.NET Core Web API que também serve o build estático do React (SPA), hospedado como um único site no SmarterASP.NET (IIS), com deploy via GitHub.

```
┌─────────────────────────────────────────────────────────┐
│  SmarterASP.NET (IIS) — um único site                    │
│                                                            │
│  ASP.NET Core Web API                                     │
│  ├── wwwroot/          → build estático do React (SPA)    │
│  ├── Controllers/      → MoviesController, AuthController,│
│  │                        WatchlistController              │
│  ├── Services/                                            │
│  │   ├── TmdbService    → chama a TMDB, aplica IMemoryCache│
│  │   └── WatchlistService                                 │
│  ├── Identity           → ASP.NET Core Identity + JWT      │
│  └── Data (EF Core)     → SQL Server                       │
│         ├── Users / Roles (tabelas do Identity)            │
│         └── WatchlistItems (UserId, TmdbMovieId, criadoEm) │
└─────────────────────────────────────────────────────────┘
                │
                │ HTTPS (server-side, credencial nunca exposta ao navegador)
                ▼
        api.themoviedb.org
```

**Backend** em camadas: `Controllers` (endpoints HTTP) → `Services` (regra de negócio + integração TMDB) → `Data` (EF Core + SQL Server).

**Frontend**: React SPA, buildado como arquivos estáticos e servido pelo próprio ASP.NET Core (mesma origem — sem necessidade de CORS). Estrutura por funcionalidade: `pages/Home`, `pages/Search`, `components/MovieCard`, `components/MovieModal`, `components/ProviderFilter`, `context/AuthContext` (guarda o JWT em memória, não em localStorage), `services/api.ts` (client HTTP que injeta o token no header `Authorization`).

**Por que este e não outras arquiteturas:**
- Dois sites separados (API + front em domínios diferentes) foi descartado — mesma origem elimina CORS/CSRF extra e simplifica o deploy num único plano de hospedagem compartilhada, sem ganho real de escala para um projeto de portfólio.
- Microsserviços/múltiplos bancos foram descartados por over-engineering para o escopo (catálogo + auth + favoritos).

## Modelo de dados

O SQL Server guarda apenas o essencial próprio da aplicação — nenhum dado de filme é duplicado da TMDB:

- **Tabelas do ASP.NET Core Identity** (`AspNetUsers`, `AspNetRoles`, etc.) — geradas automaticamente pelo framework.
- **`WatchlistItems`**: `Id` (PK), `UserId` (FK → AspNetUsers), `TmdbMovieId` (int), `CreatedAt` (datetime2). Índice único em `(UserId, TmdbMovieId)` para evitar duplicata na lista.

Os dados de exibição (poster, título, sinopse, nota, onde assistir) sempre vêm da TMDB (via cache no backend), nunca são persistidos no banco próprio.

## Endpoints da API

```
Auth
  POST /api/auth/register        cria conta (Identity)
  POST /api/auth/login           retorna JWT
  GET  /api/auth/me              dados do usuário logado

Catálogo (proxy TMDB, cacheado)
  GET  /api/movies/popular?provider=8&page=1
  GET  /api/movies/search?query=...&page=1
  GET  /api/movies/{tmdbId}      detalhes + elenco + onde assistir
  GET  /api/providers            lista curada dos streamings suportados
  GET  /api/genres               lista de gêneros

Minha Lista (autenticado)
  GET    /api/watchlist                    filmes favoritados (join com TMDB)
  POST   /api/watchlist/{tmdbMovieId}      adiciona
  DELETE /api/watchlist/{tmdbMovieId}      remove
```

## Integração com a TMDB (proxy + cache)

O navegador nunca chama a TMDB diretamente — todo acesso passa pelo backend:

1. React chama um endpoint do próprio backend (ex.: `/api/movies/popular`).
2. O `TmdbService` monta uma chave de cache (ex.: `popular:p8:page1`).
3. Se a chave estiver no `IMemoryCache`, retorna direto — sem chamar a TMDB.
4. Se não, chama a TMDB usando um `HttpClient` nomeado (via `IHttpClientFactory`) com o **Read Access Token da TMDB (v4)** no header `Authorization: Bearer ...`.
5. Guarda o resultado no cache com expiração por tipo: listas/populares (~6h), detalhes de filme (~24h), gêneros/provedores (~7 dias, mudam raramente).
6. Devolve o JSON para o React.

**Provedores de streaming exibidos:** apenas assinatura (monetization type `flatrate` da TMDB) para o Brasil — lista curada com os principais: Netflix, Prime Video, Disney+, Max, Globoplay, Apple TV+, Paramount+. Compra/aluguel avulso fica fora do filtro.

## Autenticação e segurança

- **HTTPS obrigatório**: `UseHttpsRedirection` + HSTS. SmarterASP.NET fornece certificado SSL no plano.
- **Senhas**: hashing pelo próprio ASP.NET Core Identity (PBKDF2), política de senha padrão do Identity.
- **Autenticação da SPA**: login retorna um **JWT Bearer** de vida curta (~2h). O React guarda o token em memória (não em `localStorage`), enviado no header `Authorization` em cada request. Sem refresh token no v1 (YAGNI — usuário reloga ao expirar; refresh token adicionaria complexidade de revogação não justificada pelo escopo).
- **Rate limiting** (middleware nativo do ASP.NET Core): limite mais restrito em `/api/auth/login` e `/api/auth/register` (previne força bruta); limite geral mais permissivo nos endpoints de catálogo (protege a cota da TMDB).
- **Validação de entrada** em todos os DTOs (registro, login, busca) via Data Annotations/FluentValidation.
- **CORS desabilitado** — front e API são a mesma origem, então não há necessidade de abrir CORS (menor superfície de ataque).
- **SQL Injection**: EF Core com queries parametrizadas por padrão, sem SQL cru.
- **XSS**: React escapa conteúdo por padrão; nenhuma sinopse/dados da TMDB é renderizado via `dangerouslySetInnerHTML`.
- **Tratamento de erro genérico em produção**: middleware global captura exceções, loga o detalhe no servidor e retorna só uma mensagem padrão ao cliente (sem stack trace).

### Gestão de segredos (variáveis de ambiente)

Nenhum dado sensível vai para `appsettings.json` nem para o repositório. O ASP.NET Core mapeia variáveis de ambiente para configuração usando `__` (duplo underscore) no lugar de `:`. As variáveis de ambiente devem ser criadas no pool do SmarterASP.NET:

| Variável | O que é | Observação |
|---|---|---|
| `Tmdb__ReadAccessToken` | TMDB Read Access Token (v4) | Vai no header `Authorization: Bearer` nas chamadas à TMDB |
| `ConnectionStrings__DefaultConnection` | Connection string completa do SQL Server | Server, database, usuário, senha do plano SmarterASP.NET |
| `Jwt__Key` | Chave secreta para assinar os JWTs de login | String aleatória, mínimo 32 caracteres; não reaproveitar de outro projeto |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Não é segredo, mas essencial: desliga páginas de erro detalhadas e ativa `appsettings.Production.json` |

`Jwt__Issuer` e `Jwt__Audience` não são sensíveis e permanecem no `appsettings.json` versionado.

## Performance

- **Cache no backend** (descrito acima) é a principal defesa contra latência e limite de requisições da TMDB.
- **Compressão de resposta** (Gzip/Brotli) habilitada na API.
- **Imagens da TMDB**: usar os tamanhos redimensionados do CDN deles (ex. `w342` para pôster de card, `w1280` só no hero/detalhe) em vez da imagem original. `loading="lazy"` em imagens fora da viewport inicial.
- **Busca com debounce** (~400ms) antes de chamar a API.
- **Scroll infinito** via `IntersectionObserver`, cancelando requisições obsoletas (`AbortController`) se o usuário mudar de filtro rapidamente.
- **Build do React**: code-splitting por rota (lazy loading), assets com hash de conteúdo e cache longo no navegador.

## Front-end: layout e navegação

- **Home**: hero com filme em destaque + carrosséis horizontais roláveis por categoria/streaming (ex.: "Em alta na Netflix", "Ação no Prime").
- **Filtros**: por serviço de streaming (assinatura) e gênero.
- **Detalhes do filme**: modal que abre sobre a página atual (mantém posição de scroll), com URL própria e compartilhável (`/filme/:id`) — permite abrir direto por link também.
- **Minha Lista**: página com os filmes favoritados do usuário logado.

## Tratamento de erros

- TMDB indisponível/timeout: `TmdbService` captura a falha e o endpoint retorna um erro padronizado (502/503); o React exibe um estado amigável ("não foi possível carregar agora") com opção de tentar novamente.
- React error boundaries isolam cada carrossel/seção — a falha de uma seção não derruba a página inteira.

## Testes

Escopo essencial com **xUnit** no backend, focado na lógica que pode quebrar de forma silenciosa:
- `TmdbService`: cache hit/miss, tratamento de erro quando a TMDB falha/timeout.
- Filtro de provedores (mapear provedor selecionado → parâmetro correto da TMDB).
- `WatchlistService`: adicionar, remover, evitar duplicata.

Sem testes automatizados de UI no v1 — verificação do front-end é manual, testando o fluxo no navegador.

## Deploy

- Repositório no GitHub, deploy contínuo para o SmarterASP.NET (recurso de deploy via GitHub do próprio provedor).
- Pipeline de build gera o bundle do React e copia para `wwwroot/` do projeto ASP.NET Core antes do publish — um único artefato de deploy.
- Variáveis de ambiente/segredos configuradas diretamente no painel do SmarterASP.NET (nunca no repositório).
