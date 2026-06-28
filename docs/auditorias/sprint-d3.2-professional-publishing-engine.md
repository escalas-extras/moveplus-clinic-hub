# Sprint D3.2 — Professional Publishing Engine

Relatório de implementação. Data: 27/06/2026.

## Objetivo

Elevar o Histórico Clínico Integrado de “layout inteligente” (D3) para **documento diagramado por designer editorial** — ritmo visual, blocos com limites de altura, balanceamento de densidade, primitivos visuais (barras, EVA, timeline, cards) e chrome institucional refinado.

**Diretriz central:** páginas por **composição editorial**, nunca por seção.

## Arquitetura — Professional Publishing Engine

```
src/lib/pdf-engine/publishing/
├── block-bounds.ts    — min / ideal / max por tipo de bloco
├── compose.ts         — composição + balanceamento de densidade (65–90%)
├── measure.ts         — medição editorial adaptativa
├── primitives.ts      — EVA, barras, timeline, cards, dashboard
├── render-content.ts  — renderização de átomos editoriais
├── chrome.ts          — capa, índice, cabeçalho, rodapé, conclusão, assinatura
└── index.ts
```

### Pipeline

```
Section builders (min/ideal/max)
        ↓
Layout Composer (D3) — ordem + dashboard
        ↓
measurePublishingBlock() — átomos adaptativos
        ↓
composeAndBalance() — empacota + rebalanceia páginas < 65%
        ↓
renderPublishingPageContent() + chrome editorial
        ↓
layoutStats.pageDensities[] + avgFillRatio
```

## Princípios editoriais implementados

| # | Princípio | Implementação |
|---|-----------|---------------|
| 1 | Ritmo visual | Título + linha brand (20 pt), gap 5 pt |
| 2 | Blocos inteligentes | `layout.minHeight / idealHeight / maxHeight` |
| 3 | Balanceamento | `balancePageDensities()` — meta 75–90% |
| 4 | Densidade por página | Rodapé: `Densidade 83%` + `pageDensities[]` |
| 5 | Cards adaptativos | Altura = conteúdo (badge, objective, document-card) |
| 6 | Tabelas inteligentes | ≤4 células grid → cards; ≤3 linhas compare → barras |
| 7 | Mini dashboard | Barras SVG (jsPDF) em Sessões, Documentos, Objetivos |
| 8 | Timeline | ● + linha vertical contínua, sem setas excessivas |
| 9 | EVA visual | `0━━━━━━10` + marcador ● |
| 10 | Comparativos | Barras Inicial vs Atual por métrica numérica |
| 11 | Objetivos | Badge ✓ Alcançado / • Em andamento |
| 12 | Documentos | Cards 2 colunas (tipo, qty, emissão, hash) |
| 13 | Rodapé | 24 pt — clínica · página · versão · densidade |
| 14 | Cabeçalho | Logo → Paciente → Documento → Data |
| 15 | Assinatura | Card institucional com linha de assinatura |
| 16 | Qualidade | Rebalanceamento automático se densidade < 65% |

## Novos tipos de conteúdo (`PdfContent`)

- `objective` — badge com status achieved/pending/progress
- `document-cards` — grid de cards documentais
- `compare-bars` — comparativo visual Inicial/Atual
- `dashboard.items[].barValue / barMax` — mini gráficos

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdf-engine/types.ts` | Novos kinds + `layoutStats.pageDensities` |
| `src/lib/pdf-engine/render.ts` | Dossiê usa publishing engine |
| `src/lib/pdf-engine/index.ts` | Exporta API publishing |
| `src/lib/dossier/sections/*.ts` | Objetivos, documentos, comparativos visuais |
| `src/lib/dossier/layout-composer.ts` | Dashboard com bar charts |
| `src/lib/clinical-dossier-pdf.ts` | `documentVersion: D3.2` |

## O que NÃO foi alterado

- Banco, migrations, APIs, builders individuais
- Document Design System (`fisioos-ds`)
- PDFs clínicos individuais (avaliação, evolução, etc.)
- Motor legacy (`renderPageContent` permanece para demais PDFs)

## Extensibilidade

O módulo `publishing/` está pronto para ser adotado por outros documentos FisioOS via:

```typescript
import { measurePublishingBlock, composeAndBalance, renderPublishingPageContent } from "@/lib/pdf-engine";
```

Basta passar `blocks` pelo pipeline publishing no branch de render desejado — sem alterar builders ou DDS.

## Build

```bash
npm run build
```

**Resultado:** sucesso (27/06/2026).

## Versão do documento

Rodapé: **`D3.2`** — Professional Publishing Engine.

## Meta visual

> *"Isso não parece um PDF exportado de sistema — parece um documento institucional produzido por uma clínica de alto padrão."*

Validação: gerar dossiê completo e inspecionar densidade no rodapé (meta 75–90% por página de conteúdo).
