# Separação Backend/Frontend em Repositórios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair `backend/` do repositório `ibe` para um repositório Git próprio (`PauloFlix-Api`, com histórico preservado), deixar `ibe` só com o front-end (na raiz), e ajustar as duas aplicações para funcionarem como dois deploys independentes (CORS, URL de API configurável, roteamento SPA sob IIS).

**Architecture:** Nenhuma mudança de arquitetura da aplicação em si — é uma reorganização de repositórios. `git subtree split` extrai o histórico de `backend/` para um branch isolado, que vira o `main` de um novo repositório local. O back-end deixa de servir o front-end (remove o target MSBuild de build+cópia e o middleware de arquivos estáticos) e passa a expor CORS configurável. O front-end passa a resolver a URL da API via variável de ambiente do Vite, com fallback para o caminho relativo `/api` (mantendo o fluxo de dev local inalterado).

**Tech Stack:** ASP.NET Core 10 (back-end), React + TypeScript + Vite (front-end), Git (`git subtree`), IIS/SmarterASP.NET (hospedagem).

## Global Constraints

- Novo repositório do back-end local em: `C:\Users\ptars\Estudos\IA\PauloFlix-Api` (`/c/Users/ptars/Estudos/IA/PauloFlix-Api` em paths POSIX/Git Bash).
- Histórico de commits de `backend/` deve ser preservado no novo repositório (via `git subtree`, não `git-filter-repo` — não está instalado).
- `backend/` sai do repositório `ibe` via `git rm` + commit normal — **não** reescrever o histórico existente de `ibe`.
- `frontend/*` sobe para a raiz do repositório `ibe` (repositório passa a conter só o front-end).
- Back-end vira API pura: não builda nem serve o front-end.
- CORS configurável via `Cors:AllowedOrigins` em `appsettings.json`, com defaults de dev `http://localhost:5173` e `http://localhost:4173`.
- URL da API no front-end configurável via `VITE_API_BASE_URL` (variável de ambiente do Vite), com fallback para `/api` relativo quando não definida.
- Criar o repositório remoto no GitHub, configurar os sites no SmarterASP.NET e fazer deploy em produção ficam fora de escopo deste plano.
- Repositório de origem: `C:\Users\ptars\Estudos\IA\ibe` (`/c/Users/ptars/Estudos/IA/ibe`).

---

### Task 1: Extrair `backend/` para um novo repositório com histórico preservado

**Files:**
- Create: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/` (novo repositório Git local, sem código ainda modificado — só o conteúdo atual de `backend/`)
- Nenhum arquivo do repositório `ibe` é modificado nesta task.

**Interfaces:**
- Consumes: nada (task inicial).
- Produces: repositório Git em `/c/Users/ptars/Estudos/IA/PauloFlix-Api`, branch `main`, com o conteúdo atual de `backend/*` na raiz e o histórico de commits que tocaram `backend/` preservado. Tasks seguintes (2) modificam esse repositório.

- [ ] **Step 1: Clonar `ibe` numa pasta temporária**

```bash
git clone /c/Users/ptars/Estudos/IA/ibe /c/Users/ptars/Estudos/IA/_ibe-extract-tmp
```

Expected: clone concluído sem erros, mostrando `Cloning into '/c/Users/ptars/Estudos/IA/_ibe-extract-tmp'...`.

- [ ] **Step 2: Extrair o histórico de `backend/` num branch isolado**

```bash
cd /c/Users/ptars/Estudos/IA/_ibe-extract-tmp
git subtree split -P backend -b backend-only
```

Expected: git processa os commits (~20) e imprime o hash do commit final do branch `backend-only`.

- [ ] **Step 3: Verificar o branch extraído**

```bash
git log --oneline backend-only | wc -l
git log --oneline backend-only -5
```

Expected: contagem de commits compatível com o histórico de `backend/` no repositório original (verificado antes: 20 commits); os 5 mais recentes mostram mensagens reconhecíveis (ex: relacionadas a rate limiting, compressão HTTPS, etc.).

- [ ] **Step 4: Criar o novo repositório e puxar o branch extraído**

```bash
mkdir /c/Users/ptars/Estudos/IA/PauloFlix-Api
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api
git init -b main
git pull /c/Users/ptars/Estudos/IA/_ibe-extract-tmp backend-only
```

Expected: `git pull` popula o branch `main` (antes vazio/unborn) com o histórico de `backend-only`, sem pedir merge manual (repositório novo não tem commits prévios para conflitar).

- [ ] **Step 5: Verificar a estrutura e o histórico no novo repositório**

```bash
ls
git log --oneline | wc -l
git log --oneline -3
```

Expected: `ls` mostra `MovieCatalog.Api/`, `MovieCatalog.Api.Tests/`, `MovieCatalog.sln` diretamente na raiz (sem prefixo `backend/`); a contagem e as últimas mensagens de commit batem com o Step 3.

- [ ] **Step 6: Verificar que o projeto builda a partir do novo local**

```bash
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api
dotnet build
```

Expected: `Build succeeded.` — confirma que a extração não quebrou nenhum path relativo dentro do projeto .NET.

- [ ] **Step 7: Rodar os testes existentes**

```bash
dotnet test
```

Expected: todos os testes existentes (incluindo `HealthEndpointTests`) passam. `user-secrets` e a LocalDB já configurados localmente para este projeto continuam valendo — são identificados pelo mesmo `UserSecretsId` no `.csproj`, que não muda com a extração.

- [ ] **Step 8: Remover o clone temporário**

```bash
rm -rf /c/Users/ptars/Estudos/IA/_ibe-extract-tmp
```

Expected: pasta removida; `/c/Users/ptars/Estudos/IA/PauloFlix-Api` continua intacto (é um repositório independente, não depende mais do clone temporário).

---

### Task 2: Transformar o back-end extraído em API pura, com CORS configurável

**Files:**
- Modify: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/MovieCatalog.Api.csproj`
- Modify: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/Program.cs`
- Modify: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/appsettings.json`
- Create: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/.gitignore`
- Create: `/c/Users/ptars/Estudos/IA/PauloFlix-Api/README.md`

**Interfaces:**
- Consumes: repositório criado na Task 1.
- Produces: API que responde `GET /api/health` com header `Access-Control-Allow-Origin` quando a origem da requisição está em `Cors:AllowedOrigins`; nenhum arquivo estático é mais servido por esta API.

- [ ] **Step 1: Remover a integração de build do front-end do `.csproj`**

Editar `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/MovieCatalog.Api.csproj`, removendo os dois `<Target>` (`BuildAndCopyFrontend` e `AddFrontendFilesToPublish`) e o comentário explicativo entre eles. O arquivo final deve ficar:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UserSecretsId>5ac124b1-e099-41c5-bff1-7979979adaeb</UserSecretsId>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.10" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="10.0.10" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.10">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.10" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.3" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Remover o middleware que servia o front-end em `Program.cs`**

Em `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/Program.cs`, remover estas três linhas do fim do arquivo (depois de `app.MapControllers();` e antes de `app.Run();`):

```csharp
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
```

- [ ] **Step 3: Adicionar `Cors:AllowedOrigins` em `appsettings.json`**

Em `/c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api/appsettings.json`, adicionar a seção `Cors` (logo após `Jwt`):

```json
{
  "Jwt": {
    "Issuer": "movie-catalog-api",
    "Audience": "movie-catalog-client",
    "ExpiresMinutes": 120
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:4173"]
  },
  "Tmdb": {
```

(mantendo o restante do arquivo — `Tmdb`, `Logging`, `AllowedHosts` — sem alterações).

- [ ] **Step 4: Registrar CORS em `Program.cs`**

Adicionar, logo após o bloco `builder.Services.AddAuthorization();` (linha 51 do arquivo original):

```csharp
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

E adicionar `app.UseCors("Frontend");` no pipeline, entre `app.UseResponseCompression();` e `app.UseRateLimiter();`:

```csharp
app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

- [ ] **Step 5: Build**

```bash
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api
dotnet build
```

Expected: `Build succeeded.`

- [ ] **Step 6: Verificar CORS manualmente**

```bash
cd MovieCatalog.Api
dotnet run --launch-profile https &
sleep 5
curl -s -D - -o /dev/null -H "Origin: http://localhost:5173" https://localhost:7299/api/health --insecure | grep -i "access-control-allow-origin"
kill %1
```

Expected: a saída do `curl` mostra `Access-Control-Allow-Origin: http://localhost:5173`. Se o processo não aceitar `kill %1` (dependendo do shell), localizar e encerrar manualmente o processo `dotnet` que ficou ouvindo na porta 7299.

- [ ] **Step 7: Criar `.gitignore` para o novo repositório**

O `git subtree split` só traz arquivos que estavam dentro de `backend/` — o `.gitignore` original (na raiz de `ibe`) fica de fora, então este repositório ainda não tem um. Criar `/c/Users/ptars/Estudos/IA/PauloFlix-Api/.gitignore`:

```
**/bin/
**/obj/
```

- [ ] **Step 8: Escrever o README do novo repositório**

Criar `/c/Users/ptars/Estudos/IA/PauloFlix-Api/README.md`:

```markdown
# PauloFlix — API

API (ASP.NET Core) do catálogo/descoberta de filmes estilo Netflix, usando a API da TMDB. O front-end (React) vive em um repositório separado: https://github.com/PauloTarsoMussolini/PauloFlix.

Este repositório foi extraído de um monorepo original — ver `2026-08-05-catalogo-filmes-design.md` e `2026-08-05-separacao-backend-frontend-design.md` no repositório do front-end (`docs/superpowers/specs/`) para o design completo.

## Rodando localmente

    cd MovieCatalog.Api
    dotnet user-secrets set "Tmdb:ReadAccessToken" "<seu token>"
    dotnet user-secrets set "Jwt:Key" "<qualquer string aleatória de 32+ caracteres>"
    dotnet ef database update
    dotnet run --launch-profile https

O projeto tem dois launch profiles (`http` na porta 5128, `https` na porta 7299). O front-end (rodando localmente a partir do outro repositório) tem seu proxy de dev apontando para a porta `https` (7299), então rode com `--launch-profile https` — sem essa flag, `dotnet run` usa o profile `http` por padrão e as chamadas da API do front-end falham com connection refused.

Por padrão, `Cors:AllowedOrigins` em `appsettings.json` libera `http://localhost:5173` e `http://localhost:4173` (portas padrão do Vite em dev/preview), então chamadas do front-end local já funcionam sem configuração extra.

## Deploy no SmarterASP.NET

Esta API é publicada como um site próprio no SmarterASP.NET, separado do site que serve o front-end. O deploy via GitHub roda `dotnet publish` neste repositório.

Antes do primeiro deploy, crie estas variáveis de ambiente no pool do SmarterASP.NET:

| Variável | Valor |
|---|---|
| `Tmdb__ReadAccessToken` | Seu TMDB Read Access Token (v4) |
| `ConnectionStrings__DefaultConnection` | Connection string do SQL Server do plano |
| `Jwt__Key` | String aleatória, mínimo 32 caracteres, única para este projeto |
| `Cors__AllowedOrigins__0` | URL do site do front-end em produção (ex: `https://paulomussolini-front.smarterasp.net`) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

Depois do primeiro deploy, aplique as migrations no banco do plano (rode localmente apontando a connection string de produção, ou via console do SmarterASP.NET se disponível):

    dotnet ef database update --connection "<connection string de produção>"
```

- [ ] **Step 9: Commit**

```bash
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api
git add -A
git commit -m "chore: torna a API independente do front-end (CORS, sem build acoplado)"
```

---

### Task 3: Remover `backend/` do repositório `ibe`

**Files:**
- Delete: `/c/Users/ptars/Estudos/IA/ibe/backend/` (toda a pasta)

**Interfaces:**
- Consumes: confirmação da Task 1/2 de que o novo repositório já tem o conteúdo de `backend/` extraído e funcional.
- Produces: repositório `ibe` sem a pasta `backend/`, com `frontend/` ainda no lugar atual (Task 4 cuida de movê-la).

- [ ] **Step 1: Remover a pasta**

```bash
cd /c/Users/ptars/Estudos/IA/ibe
git rm -r backend
```

Expected: git lista todos os arquivos removidos de `backend/`.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove backend/ (extraido para o repositorio PauloFlix-Api)"
```

Expected: commit criado; histórico anterior do repositório permanece intacto (nenhum rebase/rewrite).

---

### Task 4: Mover `frontend/*` para a raiz de `ibe`

**Files:**
- Move: todos os arquivos e pastas dentro de `/c/Users/ptars/Estudos/IA/ibe/frontend/` para `/c/Users/ptars/Estudos/IA/ibe/`
- Delete: `frontend/README.md` (boilerplate genérico do template Vite, será substituído pelo README real na Task 7)
- Modify: `.gitignore` (raiz)

**Interfaces:**
- Consumes: Task 3 concluída (backend/ já removido).
- Produces: repositório `ibe` com o projeto front-end diretamente na raiz (`src/`, `public/`, `package.json`, etc.), pronto para `npm install`/`npm run dev`/`npm run build` a partir da raiz.

- [ ] **Step 1: Mover os arquivos e pastas rastreados pelo git, um a um**

```bash
cd /c/Users/ptars/Estudos/IA/ibe
git rm .gitignore
git mv frontend/.gitignore .gitignore
git mv frontend/.oxlintrc.json .oxlintrc.json
git rm frontend/README.md
git mv frontend/index.html index.html
git mv frontend/package-lock.json package-lock.json
git mv frontend/package.json package.json
git mv frontend/public public
git mv frontend/src src
git mv frontend/tsconfig.app.json tsconfig.app.json
git mv frontend/tsconfig.json tsconfig.json
git mv frontend/tsconfig.node.json tsconfig.node.json
git mv frontend/vite.config.ts vite.config.ts
```

Expected: cada `git mv`/`git rm` roda sem erro. Ao final, `git status` mostra as mudanças em stage (renames detectados como `renamed:`) e `frontend/` só tem `node_modules/` restante (não rastreado pelo git).

- [ ] **Step 2: Mover `node_modules` fisicamente (não rastreado, mas útil para não precisar reinstalar)**

```bash
mv frontend/node_modules node_modules
rmdir frontend
```

Expected: `frontend/` deixa de existir; `ls` na raiz mostra `node_modules/` junto dos outros arquivos movidos.

- [ ] **Step 3: Completar o `.gitignore` mesclado**

O `.gitignore` que veio de `frontend/.gitignore` (agora em `.gitignore`, na raiz) não tem a entrada `.superpowers/` que existia no `.gitignore` antigo da raiz. Editar `.gitignore` adicionando essa linha no topo:

```
.superpowers/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

- [ ] **Step 4: Verificar que o projeto builda a partir da raiz**

```bash
npm run build
npx tsc -b
npx oxlint
```

Expected: os três comandos rodam sem erro (o mesmo resultado de antes da mudança, agora a partir da raiz em vez de `frontend/`).

- [ ] **Step 5: Verificar que o dev server sobe**

```bash
npx vite --port 5173 --strictPort &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
kill %1
```

Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: move frontend/* para a raiz do repositorio"
```

Expected: commit criado com os renames de arquivo e a nova pasta `node_modules` (que deve continuar ignorada — conferir com `git status` que `node_modules/` não aparece como untracked/staged).

---

### Task 5: URL da API configurável no front-end

**Files:**
- Modify: `src/api/client.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE_URL` (variável de ambiente do Vite, opcional).
- Produces: `BASE_URL` usado por `apiClient.get/post/delete` passa a ser `(VITE_API_BASE_URL ?? '') + '/api'` em vez de `'/api'` fixo.

- [ ] **Step 1: Editar `client.ts`**

Em `src/api/client.ts`, trocar:

```ts
const BASE_URL = '/api'
```

por:

```ts
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api'
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc -b
```

Expected: sem erros — `vite/client` (já referenciado em `tsconfig.app.json`) tipa `import.meta.env` com index signature, então `VITE_API_BASE_URL` é aceito sem precisar de um `vite-env.d.ts` extra.

- [ ] **Step 3: Verificar o comportamento padrão (sem a variável definida)**

```bash
npx vite --port 5173 --strictPort &
sleep 2
curl -s http://localhost:5173/ -o /dev/null -w "%{http_code}\n"
kill %1
```

Expected: `200` — comportamento de dev local inalterado (nenhuma variável definida, `BASE_URL` continua `/api`).

- [ ] **Step 4: Verificar o build com a variável definida**

```bash
VITE_API_BASE_URL=https://api.exemplo.test npm run build
grep -r "api.exemplo.test" dist/assets/*.js
```

Expected: o `grep` encontra a string `api.exemplo.test` dentro do bundle gerado — confirma que o Vite substituiu `import.meta.env.VITE_API_BASE_URL` pelo valor em build time.

- [ ] **Step 5: Rebuild sem a variável, pra não deixar o `dist/` de teste com a URL de exemplo**

```bash
npm run build
```

Expected: `Build succeeded` / sem erros; `dist/` volta a refletir o build padrão (sem `VITE_API_BASE_URL`).

- [ ] **Step 6: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: URL da API configuravel via VITE_API_BASE_URL"
```

---

### Task 6: Roteamento SPA sob IIS (`web.config`)

**Files:**
- Create: `public/web.config`

**Interfaces:**
- Consumes: nenhuma (arquivo estático).
- Produces: `dist/web.config` após o build (Vite copia tudo de `public/` para a raiz de `dist/` sem alteração), usado pelo IIS/SmarterASP.NET para redirecionar rotas do React Router para `index.html`.

- [ ] **Step 1: Criar `public/web.config`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

- [ ] **Step 2: Verificar que o build copia o arquivo**

```bash
npm run build
test -f dist/web.config && echo "presente" || echo "AUSENTE"
diff public/web.config dist/web.config
```

Expected: `presente`; `diff` não mostra diferença (cópia exata).

- [ ] **Step 3: Commit**

```bash
git add public/web.config
git commit -m "feat: adiciona web.config para roteamento SPA sob IIS"
```

---

### Task 7: README da raiz e verificação end-to-end

**Files:**
- Modify: `README.md` (raiz de `ibe`)

**Interfaces:**
- Consumes: todas as tasks anteriores concluídas.
- Produces: documentação atualizada; confirmação de que front-end e back-end funcionam juntos localmente na nova topologia de dois repositórios.

- [ ] **Step 1: Reescrever `README.md`**

Substituir o conteúdo de `/c/Users/ptars/Estudos/IA/ibe/README.md` por:

```markdown
# PauloFlix — Front-end

Catálogo/descoberta de filmes estilo Netflix, usando a API da TMDB como fonte de dados. Consome a API do repositório separado https://github.com/PauloTarsoMussolini/PauloFlix-Api.

Ver `docs/superpowers/specs/2026-08-05-catalogo-filmes-design.md` para o design completo da aplicação, e `2026-08-05-separacao-backend-frontend-design.md` para o design da separação entre front-end e back-end.

## Rodando localmente

    npm install
    npm run dev

Abre em `http://localhost:5173` e faz proxy de `/api` para `https://localhost:7299` (a API rodando localmente a partir do repositório `PauloFlix-Api` — ver o README de lá para subir o back-end).

## Build de produção

    npm run build

Por padrão, o build usa `/api` como caminho relativo da API (funciona quando front-end e back-end estão na mesma origem). Para apontar para uma API em outro domínio, defina `VITE_API_BASE_URL` antes do build:

    VITE_API_BASE_URL=https://api.exemplo.com npm run build

## Deploy no SmarterASP.NET

Este front-end é publicado como um site próprio no SmarterASP.NET, separado do site da API, com build automático (Node) a partir do git push. Configure `VITE_API_BASE_URL` como variável de ambiente de build do site, apontando para o domínio da API em produção.

O roteamento client-side (React Router) depende de `public/web.config` (URL Rewrite do IIS) para funcionar em acesso direto a rotas como `/streaming/netflix` — sem isso, essas URLs retornam 404.
```

- [ ] **Step 2: Commit do README**

```bash
git add README.md
git commit -m "docs: atualiza README para repositorio somente front-end"
```

- [ ] **Step 3: Verificação end-to-end — subir os dois projetos localmente**

```bash
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api/MovieCatalog.Api
dotnet run --launch-profile https &
sleep 5
cd /c/Users/ptars/Estudos/IA/ibe
npx vite --port 5173 --strictPort &
sleep 2
```

- [ ] **Step 4: Confirmar que o front-end carrega e fala com a API via proxy**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
curl -s http://localhost:5173/api/health
```

Expected: `200` no primeiro comando; o segundo retorna o corpo de `/api/health` (via proxy do Vite, mesmo comportamento de antes da separação).

- [ ] **Step 5: Confirmar CORS direto na API (sem passar pelo proxy)**

```bash
curl -s -D - -o /dev/null -H "Origin: http://localhost:5173" https://localhost:7299/api/health --insecure | grep -i "access-control-allow-origin"
```

Expected: `Access-Control-Allow-Origin: http://localhost:5173`.

- [ ] **Step 6: Encerrar os processos de teste**

```bash
kill %1 %2
```

Expected: ambos os processos (API e Vite) encerrados. Se `kill %1 %2` não pegar os PIDs certos (depende do shell), localizar manualmente os processos nas portas 7299 e 5173 e encerrá-los.

- [ ] **Step 7: Conferir o estado final dos dois repositórios**

```bash
cd /c/Users/ptars/Estudos/IA/ibe && git status --short && git log --oneline -5
cd /c/Users/ptars/Estudos/IA/PauloFlix-Api && git status --short && git log --oneline -5
```

Expected: ambos os repositórios com working tree limpo (`git status --short` sem saída) e o histórico de commits desta migração visível no topo do log. `PauloFlix-Api` ainda sem remoto configurado (`git remote -v` vazio) — fica para o usuário criar o repositório no GitHub e rodar `git remote add origin <url> && git push -u origin main`.
