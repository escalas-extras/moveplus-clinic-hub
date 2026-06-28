# Sprint B — Premium Components Design System

**Data:** 27/06/2026  
**Escopo:** Camada visual apenas — sem banco, APIs, queries, rotas, builders ou PDFs de conteúdo.  
**Build:** `npm run build` — **sucesso**

---

## Resumo

Elevação dos componentes reutilizáveis do FisioOS para padrão SaaS Premium: profundidade, hierarquia tipográfica, estados de formulário (focus, hover, disabled, error, success), microinterações discretas e tokens globais unificados em `clinical-classes.ts` + `styles.css`.

---

## Componentes alterados

### Layout (`src/components/layout/`)

| Componente | Melhorias |
|------------|-----------|
| **InfoCard** | Card institucional: barra accent, header elegante, divisor gradiente, `variant="highlight"`, `hoverable`, memo |
| **KpiCard** | Número dominante, label secundária, tendência visual, sparkline integrada, fade-in (`fos-animate-in`), memo |
| **KpiGrid** | Espaçamento alinhado ao grid premium |
| **PageSection** | Módulo institucional com header/body separados, label "Módulo", memo |
| **PageHeader** | Tipografia e espaçamento refinados |
| **PageActions** | `OutlineActionButton`, `GhostActionButton`, `DangerActionButton`, `data-fos-btn` |
| **EmptyState** | Ícone gradiente, título, descrição, CTA via `PrimaryActionButton`, memo |
| **StatusBadge** | Dot indicator; variantes: `status`, sucesso, erro, alerta, info, neutro; memo |
| **ClinicalSkeleton** | Shimmer premium, formas arredondadas, memo |
| **ClinicalDataTable** | Wrapper `fos-table-wrap` + scroll, head premium, memo |
| **FilterField** | Labels premium, estados hint / error / success |
| **clinical-classes.ts** | Tokens Sprint B completos |
| **index.ts** | Exports dos novos botões de ação |

### UI base (`src/components/ui/`)

| Componente | Melhorias |
|------------|-----------|
| **Button** | Variantes primário, secundário, outline, ghost, danger; prop `loading` com spinner; `data-fos-btn` |
| **Input** | Token `clinical.input` / `fos-field` |
| **Textarea** | Token `clinical.textarea` / `fos-field` |
| **Select** | Trigger com `clinical.select` |
| **Command** | Autocomplete premium: container `fos-command`, input integrado, itens arredondados |
| **Calendar** | DatePicker visual: classe `fos-calendar`, dropdowns com focus ring FisioOS |
| **Skeleton** | Classe `fos-skeleton` com shimmer |
| **Table** | Classes `fos-table`, head/row premium, hover e seleção |
| **Badge** | Linguagem alinhada ao StatusBadge: success, warning, info, neutral, dot opcional |

### Dashboard (consumidor)

| Componente | Melhorias |
|------------|-----------|
| **Sparkline** | Prop `integrated` para largura total no KPI |
| **index.tsx** | InfoCard de onboarding com `variant="highlight"` |

### Tokens globais

| Arquivo | Melhorias |
|---------|-----------|
| **styles.css** | Bloco Sprint B: animações, info-card, page-section, fields (incl. success), empty-state, skeleton, table, command, KPI sparkline; hover global isolado de `[data-fos-btn]`; `prefers-reduced-motion` |

---

## Componentes criados

Nenhum arquivo layout novo. Variantes exportadas em **PageActions**:

- `OutlineActionButton`
- `GhostActionButton`
- `DangerActionButton`

---

## Componentes removidos

Nenhum.

---

## Melhorias visuais (por requisito)

| # | Área | Entrega |
|---|------|---------|
| 1 | **InfoCard** | Profundidade, header, padding ampliado, radius 2xl, sombras, hover, highlight, divisores |
| 2 | **KPI Cards** | Hierarquia, valor dominante, tendência, sparkline integrada, `fos-animate-in` |
| 3 | **PageSection** | Blocos institucionais com cabeçalho gradiente e corpo separado |
| 4 | **Inputs** | Input, Textarea, Select, Calendar (DatePicker), Command (Autocomplete) padronizados via `fos-field`; estados focus, hover, disabled, error (`aria-invalid`), success (`data-success`) |
| 5 | **Botões** | Identidade FisioOS + loading spinner |
| 6 | **Empty States** | Ícone, título, descrição, CTA |
| 7 | **Skeletons** | Shimmer suave, menos blocos quadrados |
| 8 | **Badges** | StatusBadge + ui/badge com linguagem única (6 variantes semânticas) |
| 9 | **Tables** | Header premium, hover de linha, seleção, wrapper responsivo |
| 10 | **Microinterações** | Hover, fade, elevation, focus, transition — discretos |
| 11 | **Performance** | `memo` em componentes de layout pesados; tokens centralizados |

---

## Impacto esperado na aplicação inteira

| Área | Impacto |
|------|---------|
| **Dashboard** | KPIs e cards com percepção premium imediata |
| **Listagens** | Tabelas, empty states e filtros consistentes |
| **Formulários** | Campos com estados claros (incl. sucesso) reduzem fricção |
| **Busca / autocomplete** | Command com visual alinhado ao design system |
| **Agenda** | Calendar dentro de InfoCard com estilo institucional |
| **Ações** | Botões com identidade única e estado loading nativo |
| **Status operacional** | Badges unificados em toda a UI |
| **Carregamento** | Skeletons mais suaves |
| **Manutenção** | Evolução futura via `clinical-classes.ts` sem refatorar telas |

Todas as telas que consomem `@/components/layout` ou `@/components/ui` herdam o novo visual **sem mudança de comportamento, APIs, banco ou rotas**.

---

## Fora de escopo (conforme regras)

- Banco de dados e migrations  
- APIs, queries, permissões, regras de negócio  
- Builders e PDFs  
- Rotas (sem alteração estrutural)

---

## Validação

```bash
npm run build
# Exit code: 0
```
