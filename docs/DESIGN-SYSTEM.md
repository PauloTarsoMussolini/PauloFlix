# PauloFlix Design System

Versão 1.1.0 · 2026-09-15 · Tema escuro apenas (`color-scheme: dark`).

**Fonte de verdade executável:** `src/styles/theme.css`. Este arquivo descreve esse CSS; não o substitui.
Ao construir uma tela, importe `theme.css` e use as classes listadas na seção Componentes.
Não crie classes paralelas (`.btn-primary`, `.card`) para algo que já existe aqui.
Os valores do bloco `tokens` abaixo são uma cópia de `theme.css`; se divergirem, `theme.css` vence.

Referência visual para pessoas: `docs/design-system.html`.

---

## 1. Princípios

1. **Sala escura.** O fundo é azul-marinho quase preto, não cinza. Superfícies sobem em três degraus discretos. O pôster é sempre o elemento mais claro e colorido da tela.
2. **Um único acento.** O âmbar marca ação e foco. Não existe segunda cor de destaque. Vermelho aparece só como erro. Se o âmbar briga com o fundo, reduza a área, não troque a cor.
3. **Três vozes tipográficas.** Fraunces é letreiro (títulos, marca). Inter conversa (corpo, botões, campos). JetBrains Mono é etiqueta técnica (ano, duração, nota, rótulos em caixa alta).
4. **Movimento curto e opcional.** Transições de 150 a 250 ms com `ease`. Toda animação autônoma fica dentro de `prefers-reduced-motion: no-preference`. Setas do carrossel só aparecem com mouse.

---

## 2. Tokens

### 2.1 Tokens existentes em `theme.css`

Use como `var(--nome)`. Todos já estão declarados em `:root`.

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "bg":            { "$value": "#0b0e14", "$type": "color", "$description": "Fundo da página; barra fixa usa este valor a 72% + blur(14px)" },
    "bg-elevated":   { "$value": "#12161f", "$type": "color", "$description": "Cards, modal, dropdown de busca, formulário" },
    "bg-elevated-2": { "$value": "#1b212d", "$type": "color", "$description": "Campos de entrada, chips, pôster sem imagem, fundo de <img> enquanto carrega" },
    "border":        { "$value": "#262d3b", "$type": "color", "$description": "Contorno padrão de cards, campos e chips" },
    "border-soft":   { "$value": "#1d232f", "$type": "color", "$description": "Divisores internos, skeleton, linha inferior da barra fixa" },
    "text":          { "$value": "#edebe4", "$type": "color", "$description": "Títulos e corpo. 16.2:1 sobre bg (AAA)" },
    "text-muted":    { "$value": "#8c93a6", "$type": "color", "$description": "Metadados, links da nav, placeholder, sinopse. 6.3:1 sobre bg (AA); 5.3:1 sobre bg-elevated-2 (AA, mínimo 12px)" },
    "accent":        { "$value": "#e8a33d", "$type": "color", "$description": "Botão primário, filtro ativo, anel de foco, ponto da marca" },
    "accent-strong": { "$value": "#f2b45a", "$type": "color", "$description": "Hover do botão, nota ★, eyebrow, ícones em hover. 10.5:1 sobre bg" },
    "accent-ink":    { "$value": "#1a1206", "$type": "color", "$description": "Único texto permitido sobre âmbar. 8.6:1 sobre accent (AAA)" },
    "accent-soft":   { "$value": "rgba(232, 163, 61, 0.14)", "$type": "color", "$description": "Anel de foco (3px), fundo do eyebrow e do item de busca ativo" },
    "danger":        { "$value": "#e2685a", "$type": "color", "$description": "Texto de erro; hover do botão fantasma de remover. 5.5:1 sobre bg-elevated (AA)" },
    "danger-soft":   { "$value": "rgba(226, 104, 90, 0.12)", "$type": "color", "$description": "Fundo da caixa de erro" }
  },
  "fontFamily": {
    "display": { "$value": ["Fraunces", "Iowan Old Style", "Georgia", "serif"], "$type": "fontFamily", "$description": "h1, h2, h3 e marca. Peso 600. Nunca em controles" },
    "body":    { "$value": ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"], "$type": "fontFamily", "$description": "Padrão de body. 400 corpo, 500 links e chips, 600 botões e títulos de card" },
    "mono":    { "$value": ["JetBrains Mono", "ui-monospace", "Consolas", "monospace"], "$type": "fontFamily", "$description": "Ano, duração, nota, e-mail, rótulos em caixa alta, dicas de atalho" }
  },
  "radius": {
    "sm": { "$value": "6px",  "$type": "dimension", "$description": "Botões, inputs, select, badge de provedor, caixa de erro, contorno de foco" },
    "md": { "$value": "10px", "$type": "dimension", "$description": "Card de filme, skeleton, dropdown de busca" },
    "lg": { "$value": "16px", "$type": "dimension", "$description": "Modal e formulário de autenticação" }
  },
  "layout": {
    "container-pad": { "$value": "clamp(16px, 4vw, 48px)", "$type": "dimension", "$description": "Único padding lateral da página: nav, hero, carrossel, grade, filtro, estados" }
  }
}
```

Além dos tokens, `theme.css` fixa: pílulas em `999px`, círculos em `50%`, `body` com `line-height: 1.5`, `:focus-visible` global com `outline: 2px solid var(--accent); outline-offset: 2px`.

### 2.2 Tokens estendidos (proposta, ainda não estão em `theme.css`)

Valores que já aparecem como literais nos componentes. **Não use `var(--gap-md)` etc. até que sejam adicionados ao CSS**; use o valor literal indicado.

```json
{
  "space": {
    "gap-xs":   { "$value": "6px",  "$type": "dimension", "$description": "Dentro de itens: título/meta, marca/ponto, hint/campo" },
    "gap-sm":   { "$value": "8px",  "$type": "dimension", "$description": "Chips, badges, elenco, linhas do skeleton, card/botão na lista" },
    "gap-md":   { "$value": "10px", "$type": "dimension", "$description": "Nav (row-gap), meta do modal, item de busca" },
    "gap-lg":   { "$value": "14px", "$type": "dimension", "$description": "Cards no carrossel, campos do formulário, cabeçalho de seção" },
    "gap-xl":   { "$value": "18px", "$type": "dimension", "$description": "Grade de filmes (12px abaixo de 640px)" },
    "gap-2xl":  { "$value": "20px", "$type": "dimension", "$description": "Links da nav e gap horizontal da nav" },
    "stack-sm": { "$value": "20px", "$type": "dimension", "$description": "Grade e filtro: acima" },
    "stack-md": { "$value": "28px", "$type": "dimension", "$description": "Carrossel e título de página: acima" },
    "stack-lg": { "$value": "48px", "$type": "dimension", "$description": "Grade: abaixo" },
    "stack-xl": { "$value": "56px", "$type": "dimension", "$description": "Hero: abaixo do conteúdo" },
    "stack-2xl":{ "$value": "64px", "$type": "dimension", "$description": "Estado vazio: vertical" },
    "stack-3xl":{ "$value": "72px", "$type": "dimension", "$description": "Formulário: margem vertical" }
  },
  "border": {
    "accent":        { "$value": "rgba(232, 163, 61, 0.35)", "$type": "color", "$description": "Borda do eyebrow" },
    "accent-strong": { "$value": "rgba(232, 163, 61, 0.5)",  "$type": "color", "$description": "Borda do card em hover" },
    "danger":        { "$value": "rgba(226, 104, 90, 0.35)", "$type": "color", "$description": "Borda da caixa de erro" }
  },
  "glass": {
    "nav":     { "$value": "rgba(11, 14, 20, 0.72)", "$type": "color", "$description": "+ backdrop-filter: blur(14px)" },
    "arrow":   { "$value": "rgba(18, 22, 31, 0.85)", "$type": "color", "$description": "Setas do carrossel, + blur(6px)" },
    "close":   { "$value": "rgba(11, 14, 20, 0.6)",  "$type": "color", "$description": "Botão fechar do modal; 0.85 no hover" },
    "overlay": { "$value": "rgba(6, 8, 12, 0.72)",   "$type": "color", "$description": "Fundo do modal, + blur(4px)" }
  },
  "shadow": {
    "card-hover": { "$value": "0 14px 28px -12px rgba(232, 163, 61, 0.35), 0 4px 10px rgba(0, 0, 0, 0.4)", "$type": "shadow" },
    "dropdown":   { "$value": "0 20px 40px -12px rgba(0, 0, 0, 0.55)", "$type": "shadow" },
    "ring-focus": { "$value": "0 0 0 3px rgba(232, 163, 61, 0.14)", "$type": "shadow", "$description": "Campos em foco, junto com border-color: accent e outline: none" }
  },
  "motion": {
    "dur-fast":     { "$value": "150ms", "$type": "duration", "$description": "Cor, borda, translateY de botões, links, filtro" },
    "dur-base":     { "$value": "200ms", "$type": "duration", "$description": "Card de filme" },
    "dur-modal":    { "$value": "250ms", "$type": "duration", "$description": "modal-rise" },
    "dur-hero":     { "$value": "600ms", "$type": "duration", "$description": "hero-rise, cascata com atraso de 60ms entre filhos" },
    "dur-shimmer":  { "$value": "1.6s",  "$type": "duration", "$description": "shimmer do skeleton, loop" },
    "ease":         { "$value": "ease",  "$type": "cubicBezier" },
    "ease-shimmer": { "$value": "ease-in-out", "$type": "cubicBezier" }
  },
  "zIndex": {
    "arrow": { "$value": 2,   "$type": "number" },
    "nav":   { "$value": 20,  "$type": "number" },
    "modal": { "$value": 100, "$type": "number" }
  },
  "icon": {
    "sm":     { "$value": "16px", "$type": "dimension", "$description": "Em chips e metadados" },
    "md":     { "$value": "20px", "$type": "dimension", "$description": "Em botões com rótulo e campos" },
    "lg":     { "$value": "24px", "$type": "dimension", "$description": "Botões só de ícone" },
    "stroke": { "$value": 1.75,   "$type": "number" }
  },
  "size": {
    "card-w":        { "$value": "160px", "$type": "dimension", "$description": "132px abaixo de 640px; grade usa minmax(160px, 1fr) e minmax(128px, 1fr)" },
    "search-max-w":  { "$value": "460px", "$type": "dimension" },
    "modal-max-w":   { "$value": "720px", "$type": "dimension" },
    "form-max-w":    { "$value": "380px", "$type": "dimension" },
    "hero-content-w":{ "$value": "640px", "$type": "dimension" }
  }
}
```

---

## 3. Tipografia

| Tamanho | rem | Fonte / peso | Onde |
|---|---|---|---|
| clamp(36px, 4.6vw, 60px) | 2.25–3.75 | display 600, lh 1.05, ls −0.01em | h1 do hero |
| 28px | 1.75 | display 600 | h1 de página (`.page-heading h1`) e de formulário (`.auth-form h1`) |
| 26px | 1.625 | display 600 | h2 do modal |
| 22px | 1.375 | display 600, ls −0.01em | marca `.nav-brand` |
| 20px | 1.25 | display 600 | h2 de carrossel, h2 de estado vazio |
| 17px | 1.0625 | body 400, muted | parágrafo do hero (2 linhas, `line-clamp`) |
| 16px | 1 | body 400, lh 1.5 | corpo, sinopse do modal |
| 15px | 0.9375 | body 600 / 500 | botões, inputs / links da nav |
| 14px | 0.875 | body 600 / 500 / 400 | título do card e da busca / chips de filtro / erro, hint, form-link |
| 13px | 0.8125 | mono 400 · body 500 | meta do modal, e-mail do usuário · chips de elenco, badge de provedor, botão fantasma |
| 12px | 0.75 | mono, caixa alta, ls 0.08–0.12em | eyebrow, h3 do modal, sub do card, badge de gênero |
| 11px | 0.6875 | mono, ls 0.02em | dica de atalho na busca |

Regras: `h1, h2, h3` sempre em `--font-display` 600 e `margin: 0`. Caixa alta só em mono. `text-wrap: balance` em títulos é bem-vindo.

---

## 4. Componentes

Cada item traz a classe exata, o HTML mínimo e os estados. Botão nativo `<button>` já é o botão primário; não precisa de classe.

### 4.1 Botões

```html
<button type="button">Ver detalhes</button>                              <!-- primário: accent, accent-ink, 10px 18px, 600, 15px, raio 6 -->
<button type="button" disabled>Entrando...</button>                      <!-- opacity .55, cursor not-allowed -->
<a class="hero-cta" href="/filme/1">Ver detalhes</a>                     <!-- mesmo visual do primário, 11px 22px -->
<button type="button" class="link-button">Reenviar link de ativação</button> <!-- sem fundo, cor accent, 14px, sublinha no hover -->
<div class="watchlist-item">…<button type="button">Remover</button></div>  <!-- fantasma: dentro de .watchlist-item vira transparente, borda, muted; hover vermelho -->
<button type="button" class="carousel-arrow prev" aria-label="Voltar em Netflix">‹</button> <!-- 38px círculo, vidro; só em hover:hover -->
<button type="button" class="modal-close" aria-label="Fechar">×</button>  <!-- 34px círculo, canto superior direito do modal -->
```

Hover do primário: `--accent-strong` + `translateY(-1px)`. Dentro de `.nav-links`, botões ficam `8px 14px` / 14px.
Regra: um botão âmbar por bloco. Ação secundária é `.link-button`, `.form-link` ou fantasma.

### 4.2 Campos

```html
<!-- Busca da nav -->
<div class="nav-search">
  <div class="nav-search-input-wrap">                      <!-- ::before desenha a lupa em CSS -->
    <input class="nav-search-input" type="search" placeholder="Buscar filme..." aria-label="Buscar filme">
    <button type="button" class="nav-search-clear" aria-label="Limpar busca">×</button>
  </div>
  <div class="nav-search-dropdown">
    <ul class="nav-search-results">
      <li><button type="button" class="nav-search-item active">
        <img src="…w342…" alt="">                          <!-- ou <span class="nav-search-item-placeholder"> -->
        <span class="nav-search-item-info">
          <span class="nav-search-item-title">Robô Selvagem</span>
          <span class="nav-search-item-sub"><span>2024</span><span class="rating-badge">8.3</span></span>
        </span>
      </button></li>
    </ul>
    <div class="nav-search-hint">↑↓ navegar · ↵ abrir · esc fechar</div>
  </div>
  <div class="nav-search-status">Buscando...</div>         <!-- ou "Nenhum filme encontrado." -->
</div>

<!-- Input de formulário: só dentro de .auth-form -->
<input type="email" placeholder="E-mail">                 <!-- 11px 13px, bg-elevated-2, raio 6 -->
<select><option>Todos os gêneros</option></select>        <!-- 8px 12px, bg-elevated-2 -->
```

Foco em campo: `border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-soft)`.

### 4.3 Chips e badges

```html
<span class="hero-eyebrow">Em alta agora</span>            <!-- mono 12px caixa alta, accent-strong sobre accent-soft, pílula -->
<span class="badge">Drama</span>                          <!-- gênero: 12px muted, só borda, pílula. Nunca preenchido -->
<a class="provider-badge" href="…">Netflix</a>            <!-- raio 6, bg-elevated-2; hover inverte para âmbar -->
<span class="cast-chip">Pedro Pascal <span>como Fink</span></span> <!-- pílula 13px; personagem em muted -->
<span class="rating-badge">7.4</span>                     <!-- ::before insere ★; accent-strong; mono quando dentro de .movie-card-sub/.modal-meta -->
<nav class="provider-filter">
  <a class="provider-filter-item active" href="/streaming/netflix">Netflix</a>   <!-- ativo = fundo âmbar, accent-ink -->
  <a class="provider-filter-item" href="/streaming/prime">Prime Video</a>
</nav>
```

Chip preenchido de âmbar significa seleção ativa. Só `.provider-filter-item.active` usa isso.

### 4.4 Barra de navegação

```html
<nav class="nav-bar">                                     <!-- sticky top 0, vidro 72% + blur(14px), z 20, padding 14px var(--container-pad) -->
  <a class="nav-brand" href="/">PauloFlix</a>              <!-- ::after adiciona o ponto âmbar de 6px -->
  <div class="nav-search">…</div>
  <div class="nav-links">
    <a href="/minha-lista">Minha lista</a>
    <span class="nav-user">paulo@exemplo.com</span>       <!-- mono 13px muted -->
    <button type="button">Sair</button>
  </div>
</nav>
```

Ordem via CSS `order`: marca 1, busca 2, links 3. Abaixo de 760px: links sobem para a direita da marca e a busca ocupa a linha inteira.

### 4.5 Hero

```html
<div class="hero-banner" style="background-image:url(…w1280…)">   <!-- min-height 68vh, cover, center 22%, ::before aplica o véu duplo -->
  <div class="hero-banner-content">                                 <!-- max-width 640, padding 0 var(--container-pad) 56px -->
    <span class="hero-eyebrow">Em alta agora</span>
    <h1>Robô Selvagem</h1>
    <p>Sinopse em até duas linhas.</p>
    <a class="hero-cta" href="/filme/1">Ver detalhes</a>
  </div>
</div>
```

Véu: `linear-gradient(180deg, rgba(11,14,20,.15) 0%, rgba(11,14,20,.55) 55%, var(--bg) 100%)` + `linear-gradient(90deg, rgba(11,14,20,.85) 0%, rgba(11,14,20,.1) 55%)`. Obrigatório sempre que houver texto sobre foto. Entrada em cascata `hero-rise` 0/60/120/180 ms.

### 4.6 Card de filme (elemento-assinatura)

```html
<a class="movie-card" href="/filme/1">
  <div class="movie-card-media">
    <img src="…w342…" alt="Robô Selvagem" loading="lazy">          <!-- aspect-ratio 2/3, cover, bg-elevated-2 -->
    <!-- sem pôster: <div class="movie-card-placeholder">Robô Selvagem</div> -->
  </div>
  <div class="movie-card-seam" aria-hidden="true"></div>           <!-- picote: linha tracejada + dois furos na cor --bg -->
  <div class="movie-card-meta">
    <p class="movie-card-title">Robô Selvagem</p>                   <!-- 14px 600, uma linha, ellipsis -->
    <div class="movie-card-sub"><span>2024</span><span class="rating-badge">8.3</span></div>  <!-- mono 12px -->
  </div>
</a>
```

Largura 160px (132px ≤ 640px). Hover e focus-visible: `translateY(-5px)`, borda `rgba(232,163,61,.5)`, sombra `card-hover`, picote âmbar.
Na lista: `<div class="watchlist-item">` envolve o card e um `<button>Remover</button>` (vira fantasma).

Skeleton com a mesma geometria:

```html
<div class="skeleton-card" aria-hidden="true">
  <div class="skeleton-poster"></div>
  <div class="skeleton-lines"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
</div>
```

### 4.7 Carrossel e grade

```html
<section class="carousel">                                <!-- padding 28px var(--container-pad) 4px -->
  <div class="carousel-header"><h2>Em alta na Netflix</h2></div>
  <div class="carousel-row-wrap">
    <button class="carousel-arrow prev" aria-label="Voltar em Netflix">‹</button>
    <div class="carousel-row">…cards ou skeletons…</div>  <!-- flex, gap 14, scroll-snap x proximity, scrollbar oculta -->
    <button class="carousel-arrow next" aria-label="Avançar em Netflix">›</button>
  </div>
</section>
<p class="carousel-error">Não foi possível carregar "Netflix" agora.</p>

<div class="movie-grid">…cards…</div>                     <!-- auto-fill minmax(160px,1fr), gap 18, padding 20px var(--container-pad) 48px -->
```

### 4.8 Modal de detalhes

```html
<div class="modal-overlay">                               <!-- fixed, overlay 72% + blur(4px), padding 24, z 100 -->
  <div class="modal-content" role="dialog" aria-modal="true">   <!-- max 720px, max-height 88vh, raio 16, modal-rise -->
    <button type="button" class="modal-close" aria-label="Fechar">×</button>
    <img class="modal-backdrop" src="…w1280…" alt="">     <!-- 16/7, cover, cantos superiores raio 16 -->
    <div class="modal-body">                               <!-- 24px 28px 28px -->
      <h2>Robô Selvagem</h2>
      <div class="modal-meta"><span>2024</span><span>·</span><span>102 min</span><span class="rating-badge">8.3</span></div>
      <div class="badge-row"><span class="badge">Animação</span></div>
      <p class="modal-overview">Sinopse.</p>
      <div class="modal-providers"><a class="modal-providers-link" href="…"><span class="provider-badge">Netflix</span></a></div>
      <div class="watchlist-action"><button type="button">+ Minha lista</button><p class="form-hint">…</p></div>
      <h3>Elenco</h3>                                      <!-- h3 aqui é rótulo mono 12px caixa alta, não título serifado -->
      <div class="cast-row"><span class="cast-chip">Pedro Pascal <span>como Fink</span></span></div>
    </div>
  </div>
</div>
```

Estados do botão de lista: `+ Minha lista` → `Adicionando...` → `Adicionado`.

### 4.9 Formulário de autenticação e estados

```html
<form class="auth-form">                                  <!-- max 380px, 36px 32px, raio 16, margem 72px auto, gap 14 -->
  <h1>Criar conta</h1>
  <p class="form-hint">Enviaremos um link por e-mail para você confirmar o endereço e escolher sua senha.</p>
  <input type="text" placeholder="Nome">
  <input type="email" placeholder="E-mail">
  <p class="form-error">E-mail ou senha inválidos.</p>    <!-- ou <ul class="form-error"><li>…</li></ul> para várias regras -->
  <button type="submit">Criar conta</button>
  <a class="form-link" href="/login">Já tem conta? Entrar</a>
</form>

<div class="page-heading"><h1>Minha lista</h1></div>
<div class="empty-state"><h2>Sua lista está vazia</h2><p>Adicione filmes a partir da busca ou dos streamings para vê-los aqui.</p></div>
<p class="state-message">Não foi possível carregar sua lista agora.</p>
```

---

## 5. Iconografia

Hoje: lupa desenhada em CSS (`.nav-search-input-wrap::before`), `‹ › ×` como texto, `★` via `.rating-badge::before`. São aceitos.
Para ícones novos, use SVG inline em `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
Exceções: estrela é sólida (`fill="currentColor"`) e âmbar; alerta é vermelho. Todo o resto herda a cor do texto.
Tamanhos: 16 em chips e meta, 20 em botões com rótulo, 24 em botões só de ícone. Gap ícone/rótulo: 8px em botões, 6px em chips.
`aria-hidden="true"` quando há rótulo visível; `aria-label` no botão quando o ícone está sozinho.
Conjunto nomeado: search, close, chevron-left, chevron-right, star, plus, check, minus, user, mail, lock, eye, alert, external, menu, arrow-down.

---

## 6. Imagem

| Uso | Origem TMDB | Proporção | Regras |
|---|---|---|---|
| Pôster | `image.tmdb.org/t/p/w342` | 2:3 | Exibido a 160/132px. Sem imagem: `.movie-card-placeholder` com o título. |
| Backdrop no hero | `…/w1280` | livre, `cover`, `center 22%` | Véu duplo obrigatório. Sem imagem: só o gradiente. |
| Backdrop no modal | `…/w1280` | 16:7 (corta 6,25% em cima e embaixo) | Sem véu; título fica abaixo em superfície sólida. |
| Miniatura na busca | `…/w342` | 2:3 a 36px, raio 4 | `alt=""` (decorativa). |

Todo `<img>` tem `background: var(--bg-elevated-2)` para não piscar. Texto sobre foto só no hero. Logos de streaming não são usados; provedores aparecem como texto em chip.

---

## 7. Layout e responsividade

- Gutter lateral único: `var(--container-pad)`. Nunca outro valor para alinhar à borda.
- Breakpoints: `760px` (nav reorganiza) e `640px` (cards 132px, grade minmax 128px gap 12px).
- Setas do carrossel só em `@media (hover: hover) and (pointer: fine)`. No toque, rolagem nativa com snap.
- Modal é rota filha (`/filme/:tmdbId`) sobre a página atual; fechar volta a rota.

## 8. Acessibilidade

- `:focus-visible` global: `outline: 2px solid var(--accent); outline-offset: 2px`. Campos trocam por borda âmbar + anel.
- `hero-rise`, `modal-rise` e `shimmer` só em `prefers-reduced-motion: no-preference`.
- Busca: ↑↓ navegam, Enter abre, Esc fecha; item ativo recebe `--accent-soft`.
- Contraste mínimo 4,5:1 para qualquer par novo de texto e fundo. Não use `--text-muted` nem branco sobre `--accent`.

---

## 9. Faça e evite

| Faça | Evite |
|---|---|
| Um `<button>` âmbar por bloco; secundária como `.link-button` ou fantasma | Vários botões âmbar lado a lado |
| Rótulos de seção em mono, caixa alta, tracking 0,08–0,12em, muted | Inter em caixa alta e negrito como rótulo |
| Fraunces só em `h1/h2/h3` e `.nav-brand` | Fraunces em botões, chips ou campos |
| Pôster 2:3; placeholder na mesma proporção | Backdrop 16:9 no lugar do pôster |
| Texto sobre âmbar em `--accent-ink` | `--text-muted` ou `#fff` sobre âmbar |
| `.badge` de gênero só com borda | Gênero preenchido de âmbar (parece filtro ativo) |
| Título sobre foto só com o véu duplo do hero | Texto direto sobre imagem |
| Um nível de elevação por vez | Card dentro de card, sombra em cada nível |
| Usar as classes de `theme.css` | Criar `.btn`, `.card`, `.chip` paralelos |

---

## 10. Voz e texto

Português do Brasil, "você", voz ativa, sem exclamação, sem "Ops", sem pedido de desculpas. Sempre acentuar. Caixa de frase em títulos e botões; caixa alta só em mono.

| Situação | Regra | Exemplos |
|---|---|---|
| Botão | infinitivo ou substantivo curto, sem ponto | Ver detalhes · Criar conta · Enviar link · Remover · Sair |
| Carregando | gerúndio + três pontos | Entrando... · Enviando... · Adicionando... · Buscando... · Carregando... |
| Erro | o que houve + o que fazer | Não foi possível enviar agora. Tente novamente em alguns instantes. |
| Vazio | título curto + próximo passo | Sua lista está vazia / Adicione filmes a partir da busca ou dos streamings para vê-los aqui. |

Vocabulário fixo: **Minha lista** (não Favoritos, Watchlist, Minha Lista) · **Entrar** (não Login) · **Criar conta** (não Cadastrar) · **Sair** (não Logout) · **streaming** (não provedor, plataforma) · **e-mail** (não email) · **Ver detalhes** (não Saiba mais).
Nomes dos serviços: Netflix, Prime Video, Disney+, Max, Globoplay, Apple TV+, Paramount+.

Formatos: ano `2024` · duração `161 min` · nota `★ 7.4` (uma casa, ponto) · separador ` · ` · elenco `Nome como Personagem` · título de carrossel `Em alta na Netflix` · atalhos `↑↓ navegar · ↵ abrir · esc fechar`.

---

## 11. Versões

| Versão | Data | Mudanças |
|---|---|---|
| 1.1.0 | 2026-09-15 | Iconografia, imagem, faça e evite, voz e texto, tokens estendidos (proposta), versionamento. Este arquivo Markdown. |
| 1.0.0 | 2026-09-15 | Documento inicial extraído do site em produção e de `theme.css`. |

Semântico: valor de token alterado ou componente novo sobe a menor; token removido ou renomeado sobe a maior; correção de texto sobe a de correção.
Como mudar: (1) altere `theme.css` primeiro, (2) suba em produção, (3) atualize o bloco de tokens e a tabela acima, (4) meça o contraste de qualquer par novo, (5) componente novo entra com todos os estados.
