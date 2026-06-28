# Relatório — Contraste Visual Branding UI

**Data:** 27/06/2026  
**Escopo:** Tokens, estilos e composição visual (sem alteração funcional)  
**Build:** `npm run build` — ✅ sucesso

---

## Problema

Após a sidebar premium, a área principal permanecia muito clara/branca, com pouca profundidade e contraste — aparência “lavada”.

## Solução

Reforço de tokens globais alinhados ao Design Language (`#0F4C5C`, `#2BB673`, aurora) + superfícies de card/KPI com bordas e sombras mais presentes.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/styles.css` | Paleta oficial, canvas gradiente, aurora reforçada, sombras teal, sidebar/topbar/cards, utilitários `fos-surface-*` |
| `src/components/app-shell.tsx` | Canvas principal, header com mais presença, labels sidebar |
| `src/components/layout/clinical-classes.ts` | Tokens de card, KPI, input, footer sticky |
| `src/components/layout/KpiCard.tsx` | Faixa accent superior, sombra KPI, valor mais contrastado |
| `src/components/layout/PageSection.tsx` | Superfície `clinical.card`, header de seção tintado |
| `src/components/layout/InfoCard.tsx` | Superfície compartilhada, texto secundário `slate-600` |
| `src/components/layout/PageHeader.tsx` | Descrições com contraste elevado |
| `src/components/layout/AppShell.tsx` | Painel de conteúdo com borda/sombra (não branco flat) |

**Não alterados:** banco, APIs, rotas, PDFs, lógica de negócio.

---

## Detalhes por área

### 1. Background
- Gradiente `--fos-canvas` (teal/verde/cinza quente) + aurora com opacidade maior
- `body` deixa de depender de branco puro; base `#dfe9ec`
- Módulos clínicos: véu tintado (68%) em vez de branco 90%

### 2. Cards & KPIs
- `--fos-card-border`, `--fos-card-shadow`, `--fos-kpi-shadow`
- Classe `.fos-surface-card` / `.fos-surface-kpi`
- KPIs: barra gradiente no topo, glow accent, números `slate-900`

### 3. Sidebar
- Gradiente vertical escuro + sombra lateral
- Item ativo: gradiente verde + borda glow + barra `#2BB673 → #3d9eb8`
- Labels de grupo `.sidebar-nav-group-label` mais legíveis
- Divisores `.sidebar-group-divider` com mais contraste

### 4. Header superior
- `glass-topbar` mais opaco (88%), borda e sombra inferior
- Metadados em `slate-500` (melhor legibilidade)

### 5. Tipografia
- `--muted-foreground` → `#475569` (`--fos-ink-soft`)
- Descrições em PageHeader, InfoCard, PageSection: `text-slate-600`

### 6. Paleta
- Primária: `#0F4C5C`
- Secundária / sidebar accent: `#2BB673`
- Accent: `#3d9eb8`
- Neutros quentes no fundo

---

## Resultado esperado

| Antes | Depois |
|-------|--------|
| Branco dominante | Canvas com profundidade e aurora perceptível |
| Cards quase flush | Cards elevados, bordas visíveis |
| KPIs discretos | KPIs com presença e faixa de marca |
| Sidebar ok, conteúdo fraco | Contraste sidebar ↔ área principal reforçado |
| Texto secundário pálido | Leitura confortável em metadados |

---

## Validação sugerida

1. Painel clínico — KPIs e cards sobre fundo gradiente  
2. Pacientes / Agenda — PageSection e InfoCard  
3. Sidebar — item ativo e labels de grupo  
4. Header desktop — separação visual do conteúdo  
5. Mobile — topbar + drawer (sem overflow)
