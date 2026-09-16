# PauloFlix — front-end

React 19 + Vite, CSS puro com custom properties. Consome a API do repositório `PauloFlix-Api` (irmão desta pasta).

## Design system

Antes de criar ou alterar qualquer tela ou componente, leia `docs/DESIGN-SYSTEM.md`.
Ele traz os tokens (bloco JSON), a escala tipográfica, o nome exato de cada classe CSS com o HTML mínimo, as regras de faça e evite e o vocabulário dos textos.

- Fonte de verdade executável: `src/styles/theme.css`. Use as classes que já existem; não crie classes paralelas.
- Tokens da seção 2.2 do Markdown são proposta e ainda não existem no CSS; use o valor literal.
- Referência visual para pessoas: `docs/design-system.html`.
- Textos da interface: sempre acentuados, caixa de frase, sem exclamação (seção 10 do Markdown).

## Rodando

    npm install
    npm run dev      # http://localhost:5173, proxy de /api definido em vite.config.ts
    npm run build    # exige VITE_API_BASE_URL em produção
