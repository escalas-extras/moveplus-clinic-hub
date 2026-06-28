# HOTFIX — Logo inteligente na Sidebar (Branding)

**Data:** 27/06/2026  
**Escopo:** Ajuste visual da logo na sidebar — sem alteração de banco, APIs, PDFs ou regras de negócio.

---

## Problema

Logos enviadas pelos usuários apareciam pequenas demais no bloco de branding da sidebar. O container tinha espaço (248×72 px), mas a imagem usava `max-w-full max-h-full w-auto h-auto`, o que **não força expansão** — logos com resolução menor ou proporção horizontal ficavam centradas porém diminutas dentro da faixa branca.

---

## Causa raiz

1. **Dimensionamento passivo:** `object-contain` limitava o tamanho máximo, mas não ocupava 85–90% da largura disponível.
2. **Container fixo baixo (72 px):** logos quadradas/verticais ficavam comprimidas; horizontais não aproveitavam a largura.
3. **Sem detecção de proporção:** horizontal, quadrada e vertical recebiam o mesmo tratamento.
4. **Variantes implícitas:** `sidebar-banner` / `mark` / `fullWidth` sem estratégia de fit distinta.

---

## Solução

### 1. Utilitário `src/lib/logo-aspect.ts`

- `classifyLogoAspect()` — ratio ≥ 1.25 → horizontal; ≤ 0.85 → vertical; demais → quadrada.
- `logoFitMetrics()` — padding, % largura, cap de altura por variante.
- `computeLogoImageStyle()` — calcula `width`/`height` explícitos para escalar a logo **para cima** dentro do container.
- `sidebarBrandContainerHeight()` — altura dinâmica do bloco: horizontal 76 px, quadrada 88 px, vertical 96 px.

### 2. `LogoBox` — variantes explícitas

| Variante | Uso | Comportamento |
|----------|-----|---------------|
| `sidebar-brand` | Sidebar expandida | Largura 100%; horizontal → 88% da largura útil; quadrada → até 88 px altura; vertical → altura limitada, max-width 78% |
| `sidebar-mark` | Sidebar colapsada | 48×48 px; fit proporcional ~90% |
| `inline` | Topbar mobile | 48 px; horizontal → 92% largura |
| `document` | Upload / preview config | 96 px; fit inteligente igual sidebar |

- `ResizeObserver` recalcula ao redimensionar a sidebar.
- `object-contain` + dimensões calculadas — sem corte, sem distorção.
- Compatibilidade: `size="sidebar-banner"`, `size="mark"`, `fullWidth` mapeiam para as novas variantes.

### 3. `ClinicLogo`

- Variantes renomeadas: `sidebar-brand`, `sidebar-mark`, `inline`, `document`.
- Aliases legados: `banner` → `sidebar-brand`, `mark` → `sidebar-mark`.
- Tamanhos fixos (`sm`–`xl`) preservados para auth e configurações.

### 4. `AppShell` — bloco de branding

- Variantes explícitas no identity block.
- Padding ajustado (`py-4`, `px-3`) — mais espaço útil sem espremer.
- `overflow-hidden` + `max-w-[52px]` no modo colapsado.
- Transição suave de altura via CSS.

---

## Arquivos alterados

```
src/lib/logo-aspect.ts          (novo)
src/components/logo-box.tsx
src/components/clinic-logo.tsx
src/components/app-shell.tsx
src/components/logo-uploader.tsx
src/styles.css
docs/auditorias/hotfix-sidebar-logo-branding.md
```

**Não alterados:** PDF engine, `pdf-logo-loader`, banco, APIs, `branding.ts` queries.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Logo maior e mais legível | ✅ Escala ativa até 88% largura / 88 px altura |
| Sem corte | ✅ `object-contain` |
| Sem distorção | ✅ Proporção preservada |
| Melhor uso do espaço branco | ✅ Container altura adaptativa |
| Marcas horizontais e quadradas | ✅ Fit distinto por aspect ratio |
| `npm run build` | ✅ Sucesso |

---

## Validação funcional

| Cenário | Resultado esperado |
|---------|-------------------|
| Logo horizontal wide | Ocupa ~88% da largura do bloco; altura ≤ 76 px container |
| Logo quadrada | Altura até 88 px; centralizada |
| Logo vertical | Altura até 88 px; largura ≤ 78% do container |
| Sidebar colapsada | Mark 48 px com fit proporcional |
| Sem logo (monograma) | Fallback gradiente inalterado |
| Upload config | Variante `document` com fit inteligente |
| Auth / config preview | Tamanhos fixos `xl`/`lg` inalterados |

---

## Referência rápida — proporções

```
horizontal  ratio ≥ 1.25
quadrada    0.85 < ratio < 1.25
vertical    ratio ≤ 0.85
```
