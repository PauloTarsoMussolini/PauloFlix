# Separação dos repositórios front-end e back-end — Design

## Contexto e objetivo

O repositório `ibe` hoje é um monorepo: `frontend/` (React + Vite) e `backend/` (ASP.NET Core Web API) convivem no mesmo Git, e o deploy no SmarterASP.NET publica os dois como um único site — o `.csproj` do back-end builda o front-end (`npm install && npm run build`) e copia o resultado para `wwwroot/` durante `dotnet publish`.

O provedor de hospedagem (SmarterASP.NET) vai passar a servir front-end e back-end como **dois sites separados**, cada um com seu próprio deploy via Git. Isso exige dois repositórios independentes — um site não pode ficar de olho num subdiretório do repositório do outro.

**Objetivo deste trabalho:** extrair o back-end para um repositório próprio, preservando seu histórico de commits, e ajustar o que dependia da topologia de repositório único (build acoplado, mesma origem sem CORS) para que front-end e back-end funcionem como dois deploys independentes.

## Escopo

**Dentro do escopo:**
- Extrair `backend/` para um novo repositório Git local, em `C:\Users\ptars\Estudos\IA\PauloFlix-Api`, preservando o histórico de commits que tocaram essa pasta.
- Remover `backend/` do repositório `ibe`, com um commit normal (sem reescrever histórico existente).
- Mover o conteúdo de `frontend/` para a raiz de `ibe` (o repositório passa a conter só o front-end).
- Remover do back-end a integração de build que buildava o front-end (`BuildAndCopyFrontend` / `AddFrontendFilesToPublish` no `.csproj`).
- Adicionar CORS configurável no back-end (`Cors:AllowedOrigins` em `appsettings.json`).
- Tornar a URL da API configurável no front-end via variável de ambiente do Vite, em vez do caminho relativo fixo `/api`.
- Adicionar um `web.config` no front-end com regra de URL Rewrite para o roteamento client-side (React Router) funcionar sob IIS.
- Atualizar `README.md` de cada repositório para refletir a nova topologia.
- Atualizar `.gitignore` do repositório `ibe` (remover entradas específicas de `backend/`).

**Fora do escopo:**
- Criar o repositório remoto no GitHub (o usuário cria e informa a URL depois).
- Configurar os dois sites no painel do SmarterASP.NET (build hooks, domínios, variáveis de ambiente do provedor).
- Deploy e teste em produção.
- Preencher o valor real de produção de `Cors:AllowedOrigins` e `VITE_API_BASE_URL` (ficam como placeholder/documentados — os domínios reais só existem depois que os sites forem criados).
- Qualquer mudança de funcionalidade do app — este trabalho é só de topologia/infraestrutura.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Local do novo repositório | `C:\Users\ptars\Estudos\IA\PauloFlix-Api` (pasta irmã de `ibe`) | Escolhido pelo usuário. |
| Histórico de commits do back-end | Preservar | `git subtree` está disponível localmente (`git-filter-repo` não está instalado); não há segredos no histórico de `backend/` (verificado — só `appsettings.json`/`appsettings.Development.json`, sem chaves reais). |
| `backend/` no repositório `ibe` após a extração | `git rm -r backend/` + commit normal | Simples e seguro; commits antigos deste repositório continuam com os arquivos do back-end no histórico, sem risco (sem segredos). Reescrever o histórico do `ibe` foi descartado por ser mais invasivo (exigiria force-push) sem benefício real aqui. |
| Estrutura do repositório `ibe` após a extração | `frontend/*` sobe para a raiz | Remove um nível de aninhamento redundante agora que é o único projeto do repositório; mais convencional para hospedagem Node e para quem abrir o repositório pela primeira vez. |
| Acoplamento de build back-end→front-end | Remover (`BuildAndCopyFrontend`/`AddFrontendFilesToPublish`) | Deixa de fazer sentido com os dois sites separados; o back-end passa a ser uma API pura. |
| CORS | Configurável via `Cors:AllowedOrigins` em `appsettings.json`, seguindo o padrão já usado por `Tmdb`/`Jwt` | Os dois sites passam a ter origens diferentes; sem CORS as chamadas do front-end para a API seriam bloqueadas pelo navegador. |
| URL da API no front-end | Variável de ambiente do Vite (`VITE_API_BASE_URL`), com fallback para `/api` relativo quando não definida | Preserva o fluxo de dev atual (proxy do Vite, sem precisar de CORS localmente) e permite apontar para o domínio real da API em produção sem mudar código. |
| Roteamento SPA sob IIS | `web.config` com regra de URL Rewrite | SmarterASP.NET é hospedagem IIS/Windows; sem essa regra, acessar uma rota do React Router diretamente (ex: `/streaming/netflix`) resulta em 404. |

## Plano de execução

### 1. Extrair o back-end com histórico preservado

Em uma cópia de trabalho do repositório `ibe` (não a working copy principal, para não afetar o dia a dia durante a operação):

```
git clone <ibe local> temp-extract
cd temp-extract
git subtree split -P backend -b backend-only
```

Isso gera um branch `backend-only` contendo só os commits que tocaram `backend/`, com os caminhos já sem o prefixo `backend/` (ex: `backend/MovieCatalog.Api/Program.cs` vira `MovieCatalog.Api/Program.cs`).

Depois:

```
mkdir C:\Users\ptars\Estudos\IA\PauloFlix-Api
cd C:\Users\ptars\Estudos\IA\PauloFlix-Api
git init
git pull <temp-extract> backend-only
```

O resultado é um repositório git local, com histórico, sem remoto configurado — pronto para `git remote add origin <url>` assim que o usuário criar o repositório no GitHub.

### 2. Ajustar o novo repositório do back-end

- Remover do `.csproj` os targets `BuildAndCopyFrontend` e `AddFrontendFilesToPublish`.
- Adicionar seção `Cors` em `appsettings.json`:
  ```json
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:4173"]
  }
  ```
  (produção fica para o usuário preencher quando o domínio do site do front-end existir — documentar isso no README).
- Registrar CORS em `Program.cs`: `AddCors` lendo `Cors:AllowedOrigins`, e `UseCors` no pipeline, antes de authentication/authorization.
- Novo `README.md`, adaptado do README atual: só as seções relevantes ao back-end (setup local, `dotnet ef database update`, `dotnet run --launch-profile https`, variáveis de ambiente do SmarterASP.NET, agora incluindo `Cors__AllowedOrigins__0` como variável a configurar).
- Confirmar que `.gitignore` (herdado do subtree split) segue cobrindo `**/bin/`, `**/obj/`.

### 3. Limpar o repositório `ibe`

- `git rm -r backend/` + commit.
- Mover todo o conteúdo de `frontend/` para a raiz, incluindo arquivos ocultos (`.gitignore`, `.oxlintrc.json`) — um glob simples como `frontend/*` não pega arquivos ocultos, e `frontend/.*` sozinho também casa com `.`/`..`, então a listagem de arquivos a mover precisa ser explícita (ex: `git ls-files frontend/` como base) em vez de um único comando com glob. Detalhe de execução a resolver no plano de implementação. + commit.
- Atualizar `.gitignore` da raiz: remover `backend/**/bin/`, `backend/**/obj/`, `backend/MovieCatalog.Api/wwwroot/`; conferir que as entradas de `node_modules/`, `dist/` continuam corretas nos novos caminhos (sem o prefixo `frontend/`).
- Atualizar `vite.config.ts`: nenhuma mudança de path esperada (já é relativo à própria pasta), só confirmar que o proxy para `https://localhost:7299` continua fazendo sentido (API local continua rodando nessa porta, agora a partir da pasta `PauloFlix-Api`).

### 4. Ajustar o front-end para URL de API configurável

Em `src/api/client.ts`:

```ts
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api'
```

Sem `VITE_API_BASE_URL` definida (dev local, `npm run dev`), `BASE_URL` continua `/api` — comportamento idêntico ao atual, via proxy do Vite. Em build de produção, `VITE_API_BASE_URL` deve apontar para o domínio do site da API no SmarterASP.NET (a definir quando o site existir) — documentar no README do front-end como/onde configurar essa variável no build do SmarterASP.NET.

### 5. Roteamento SPA no IIS

Adicionar `public/web.config`:

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

Arquivos em `public/` são copiados como estão para `dist/` pelo Vite, então isso chega ao build de produção automaticamente.

### 6. Atualizar `README.md` da raiz de `ibe`

Reescrever para refletir que o repositório agora é só o front-end: comandos de setup (`npm install`, `npm run dev`) sem a seção de back-end, nota sobre `VITE_API_BASE_URL` para build de produção, e um link/menção ao novo repositório `PauloFlix-Api` para quem precisar do back-end.

## Riscos e observações

- **`git subtree split` em repositório com poucos commits** (20 tocando `backend/`) é rápido e de baixo risco — não há necessidade de `git-filter-repo`.
- **Nada é destrutivo no repositório `ibe` original** até o passo 3: a extração acontece numa cópia de trabalho separada.
- **CORS e `VITE_API_BASE_URL` ficam com placeholders** — funcionam em dev (mesma origem via proxy) mas exigem que o usuário preencha os valores reais depois que os dois sites existirem no SmarterASP.NET. Isso é inerente ao fato de que os domínios ainda não existem, não uma lacuna do plano.
- **`git mv` de `frontend/*` para a raiz** precisa cobrir arquivos ocultos (`.gitignore`, `.oxlintrc.json`) explicitamente, já que glob `*` não os pega.

## Critérios de verificação

- No novo repositório `PauloFlix-Api`: `dotnet build` e `dotnet test` passam sem o `frontend/` presente; `git log` mostra o histórico de commits do back-end preservado.
- No repositório `ibe` (raiz): `npm install`, `npm run build`, `tsc -b` e `oxlint` passam sem erros; `git log` mostra a remoção de `backend/` como um commit normal, sem reescrever histórico anterior.
- Rodando os dois localmente (back-end em `PauloFlix-Api` na porta 7299, front-end na raiz de `ibe` com `npm run dev`), o app funciona exatamente como antes — navegação, busca, login, watchlist — sem mudança de comportamento percebida pelo usuário final.
- `curl -I -H "Origin: http://localhost:5173" https://localhost:7299/api/providers` (ou equivalente) retorna cabeçalho `Access-Control-Allow-Origin` compatível, confirmando que o CORS configurado funciona para a origem de dev.
