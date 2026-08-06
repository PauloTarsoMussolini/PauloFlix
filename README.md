# PauloFlix — Front-end

PauloFlix — descoberta de filmes estilo Netflix, usando a API da TMDB como fonte de dados. Consome a API do repositório separado https://github.com/PauloTarsoMussolini/PauloFlix-Api.

Ver `docs/superpowers/specs/2026-08-05-catalogo-filmes-design.md` para o design completo da aplicação, e `2026-08-05-separacao-backend-frontend-design.md` para o design da separação entre front-end e back-end.

## Rodando localmente

    npm install
    npm run dev

Abre em `http://localhost:5173` e faz proxy de `/api` para `https://localhost:7299` (a API rodando localmente a partir do repositório `PauloFlix-Api` — ver o README de lá para subir o back-end).

## Build de produção

    npm run build

Builds de produção precisam definir `VITE_API_BASE_URL`, apontando para a API publicada — este repositório é sempre implantado como um site estático separado do back-end, então não existe cenário de produção em que as duas origens coincidam. O fallback para `/api` como caminho relativo só existe para funcionar com o proxy do `npm run dev` (veja acima); usá-lo em produção faz as chamadas à API caírem no rewrite do `web.config` e retornarem o próprio `index.html`. Defina `VITE_API_BASE_URL` antes do build:

    VITE_API_BASE_URL=https://api.exemplo.com npm run build

## Deploy no SmarterASP.NET

Este front-end é publicado como um site próprio no SmarterASP.NET, separado do site da API, com build automático (Node) a partir do git push. Configure `VITE_API_BASE_URL` como variável de ambiente de build do site, apontando para o domínio da API em produção.

O roteamento client-side (React Router) depende de `public/web.config` (URL Rewrite do IIS) para funcionar em acesso direto a rotas como `/streaming/netflix` — sem isso, essas URLs retornam 404.
