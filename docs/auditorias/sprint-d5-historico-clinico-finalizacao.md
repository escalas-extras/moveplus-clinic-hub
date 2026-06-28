# Sprint D5 — Finalização Histórico Clínico Integrado

Relatório técnico. Data: 2026-06-28.

## Objetivo

Refinamento visual, editorial e de consistência do **Histórico Clínico Integrado** — sem novas funcionalidades, sem alteração de banco, builders, regras clínicas ou fluxos.

## Build

`npm run build` — **aprovado**.

## Versão do documento

Rodapé PDF: `vD5` (`clinical-dossier-pdf.ts`).

---

## Alterações realizadas

### 1. Tokens unificados (`typography.ts`)

- `PUB_SPACE.contentPadX` — padding horizontal único (20 pt)
- `PUB_LAYOUT` — dimensões compartilhadas entre medição, composição e render:
  - tipografia de linha (`lineH`, `titleH`, `labelH`)
  - raios (`cardRadius: 5`, `panelRadius: 6`, `badgeRadius: 4`)
  - alturas de blocos (EVA, dashboard, documentos, timeline, assinatura)
  - `titleOrphanLines: 2` — guarda contra títulos órfãos

### 2. Composição / quebras de página (`compose.ts`)

- Título de seção **não fica isolado** no fim da página quando o próximo átomo não cabe
- Guarda de órfãos por bloco: título + primeiro conteúdo permanecem juntos quando possível
- Continuações usam altura de título padronizada (`PUB_LAYOUT.titleH`)
- Blocos inteiros (dashboard, EVA, tabelas) migram para página seguinte antes de quebrar

### 3. Medição alinhada ao render (`measure.ts`)

- Substituído mix `PDF_TYPOGRAPHY` / valores mágicos por `PUB_TYPE` + `PUB_LAYOUT`
- Alturas de átomos sincronizadas com `primitives.ts` (document cards, timeline, compare rows)

### 4. Render editorial (`render-content.ts`)

- 100% dos tamanhos via `PUB_TYPE` / `PUB_LAYOUT` / `PUB_SPACE`
- Bordas `C.hairline` em cards e highlights — **legíveis em P&B**
- Tabelas comparativas com cabeçalho e zebra padronizados
- Document cards: altura 56 pt + gap 5 pt (consistente com measure)

### 5. Primitivos visuais (`primitives.ts`)

- Raios, paddings e gaps unificados
- Cards com stroke (`hairline`) para impressão monocromática
- EVA, objetivos, panorama, documentos e grid com mesma linguagem visual

### 6. Chrome institucional (`chrome.ts`)

- Painéis de resumo e assinatura com `PUB_LAYOUT.panelRadius`
- Caixa de assinatura com borda `ink` reforçada (0,5 pt) — completa em A4/PDF
- Altura mínima de assinatura via `PUB_LAYOUT.signatureMinH`

### 7. Orquestração (`render.ts`, `block-bounds.ts`, `clinical-dossier-pdf.ts`)

- Gap editorial e line-height via tokens D5
- Timeline bounds calibrados (26 pt/item)

---

## O que NÃO foi alterado

| Área | Status |
|------|--------|
| Banco / migrations | Intocado |
| `assemble-dossier`, seções, builders | Intocado |
| Conteúdo clínico, textos, cálculos | Intocado |
| Fluxo UI (Gerar Dossiê) | Intocado |
| Outros PDFs (contrato, recibo, avaliação) | Intocado |

---

## Blocos clínicos — padronização

Todos passam pelo mesmo pipeline editorial (`measure` → `compose` → `render`):

| Bloco | Componente visual |
|-------|-------------------|
| Identificação | Grid cards / grid rows |
| Diagnóstico / Anamnese / Exame | Parágrafos + highlights |
| Escalas | EVA + compare bars/table |
| Plano / Objetivos | Objective badges |
| Evoluções | Evolution blocks |
| Reavaliações | Compare + badges |
| Alta / Histórico | Parágrafos + timeline |
| Panorama | Dashboard KPI cards |
| Documentos | Document cards (2–3 colunas) |
| Conclusão | Página dedicada + assinatura |

---

## Impressão

| Modo | Compatibilidade |
|------|-----------------|
| PDF A4 | ✅ Margens 40 pt, header 46 pt, footer 22 pt |
| Impressão colorida | ✅ Paleta brand + EVA gradient |
| Impressão P&B | ✅ Bordas `hairline`/`ink`, texto `ink`/`meta` |

---

## Arquivos alterados

| Arquivo |
|---------|
| `src/lib/pdf-engine/publishing/typography.ts` |
| `src/lib/pdf-engine/publishing/compose.ts` |
| `src/lib/pdf-engine/publishing/measure.ts` |
| `src/lib/pdf-engine/publishing/render-content.ts` |
| `src/lib/pdf-engine/publishing/primitives.ts` |
| `src/lib/pdf-engine/publishing/chrome.ts` |
| `src/lib/pdf-engine/publishing/block-bounds.ts` |
| `src/lib/pdf-engine/render.ts` |
| `src/lib/clinical-dossier-pdf.ts` |
| `docs/auditorias/sprint-d5-historico-clinico-finalizacao.md` |

---

## Validação recomendada

1. Gerar dossiê de paciente com histórico completo (avaliação + evoluções + reavaliação + alta)
2. Verificar índice, capa e conclusão
3. Conferir que nenhum título de seção aparece sozinho no rodapé da página
4. Imprimir PDF em colorido e em escala de cinza
5. Confirmar rodapé `vD5` nas páginas internas

---

## Veredito

**Módulo apto para congelamento (freeze)** — refinamento visual D5 concluído; build OK; escopo respeitado.
