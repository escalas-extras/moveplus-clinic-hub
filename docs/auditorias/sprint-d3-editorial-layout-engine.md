# Sprint D3 — Editorial Layout Engine

Relatório de implementação. Data: 27/06/2026.

## Objetivo

Transformar o **Histórico Clínico Integrado** em documento editorial premium: composição inteligente de páginas (70–90% de ocupação), densidade tipográfica maior, panorama em dashboard, cards compactos — **sem alterar** banco, migrations, APIs, builders, DDS ou demais PDFs.

## Arquivos criados

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/dossier/layout-composer.ts` | **Layout Composer** — reordena seções, remove quebras forçadas, injeta dashboard, funde objetivos |
| `src/lib/dossier/section-estimates.ts` | `estimatedHeight` por tipo de conteúdo e seção |
| `docs/auditorias/sprint-d3-editorial-layout-engine.md` | Este relatório |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/dossier/assemble-dossier.ts` | Pipeline raw → `composeEditorialLayout()` → índice pós-composição |
| `src/lib/dossier/sections/*.ts` | `layout.estimatedHeight`, remoção de `pageBreakBefore` |
| `src/lib/clinical-dossier-pdf.ts` | `documentVersion: "D3"`, `layoutStats` iniciais |
| `src/lib/pdf-engine/types.ts` | `layout` em `PdfBlock`, `dashboard` em `PdfContent`, `dossier.layoutStats` |
| `src/lib/pdf-engine/render.ts` | Modo **editorial** em `measureBlock` / `compose`, `drawDashboard`, timeline compacta, fill ratio |

## Nova arquitetura — Layout Composer

```
Section builders (estimatedHeight)
        ↓
assembleDossier() — blocos brutos
        ↓
composeEditorialLayout()
  · strip pageBreakBefore
  · Panorama → dashboard 3 colunas
  · Objetivos ≤3 → merge no dashboard
  · Objetivos >3 → após comparativos
  · stats: páginas estimadas antes/depois
        ↓
buildIndexEntries(blocks finais)
        ↓
renderClinicalDossierPdf()
  · measureBlock(..., editorial=true) — tipografia compacta
  · compose(..., mode="editorial") — empacota por altura real
  · computeLayoutFillRatio() → layoutStats.avgFillRatio
```

### Duas camadas de composição

1. **Composer (dossier)** — decisões editoriais de ordem e agrupamento lógico (panorama, objetivos, comparativos).
2. **Compose editorial (render)** — paginação física: mede átomos, evita título órfão (headroom 3 linhas), ignora `pageBreakBefore`, gap 6 pt.

## Regras de composição implementadas

| Regra | Implementação |
|-------|---------------|
| Seções pequenas na mesma página | `compose(..., "editorial")` empacota até `bottomY` |
| Panorama dashboard 2–3 colunas | `kind: "dashboard"`, 12 KPIs em grid 3×4 |
| Objetivos poucos → panorama | ≤3 badges fundidos no dashboard |
| Objetivos muitos → seção própria | Após Panorama comparativo |
| Comparativos compactos | Sem `pageBreakBefore`; fluxo contínuo |
| Timeline compacta | 24 pt/item, linha vertical, cards menores |
| Documentos em cards | `badge` com tipo, qty, emissão, hash |
| Conclusão institucional | Página dedicada: resumo, stats, profissional, QR, rodapé |
| Título + conteúdo juntos | Headroom editorial antes de quebrar |

## Métricas (modelo de estimativa)

Valores calculados em **tempo de montagem** (`layout-composer`) e refinados em **tempo de render** (`layoutStats`).

| Métrica | Fonte | Descrição |
|---------|-------|-----------|
| `estimatedPagesBefore` | Composer | Simula 1 seção = 1 página (`pageBreakBefore`) |
| `estimatedPagesAfter` | Composer | Simula empacotamento por `estimatedHeight` (680 pt úteis) |
| `contentPages` | Render | Páginas de conteúdo após medição real |
| `avgFillRatio` | Render | Média de `contentH / usableHeight` por página (meta 0,70–0,90) |
| `forcedBreaksRemoved` | Composer | Contagem de `pageBreakBefore` eliminados |

### Redução esperada

Com casos típicos (anamnese + EVA + evoluções + comparativos + documentos):

- **Antes (D2):** ~1 seção por página → 12–18 páginas de conteúdo
- **Depois (D3):** empacotamento editorial → **−30% a −40%** páginas de conteúdo
- **Quebras removidas:** 6–8 `pageBreakBefore` por dossiê completo

> `layoutStats` é preenchido em `opts.dossier` após o render; inspecionar via debugger ou log temporário ao gerar um dossiê real para valores exatos por paciente.

## Componentes reorganizados

| Seção | Mudança visual |
|-------|----------------|
| Identificação | Card compacto, `estimatedHeight: 420` |
| Panorama do caso | Lista vertical → **dashboard 3 colunas** |
| Objetivos (≤3) | Integrados ao dashboard |
| Panorama comparativo | Fluxo contínuo, sem página dedicada |
| Linha do tempo | Vertical compacta (24 pt/evento) |
| Documentos emitidos | Cards badge (não tabela) |
| Anamnese / EVA / Escalas | Compartilham página quando couber |
| Conclusão | Stats mais densos (24 pt/linha), assinatura + QR + mensagem institucional |

## Melhorias visuais

- Barra de título: 26 pt (vs 32 pt)
- Gap entre blocos: 6 pt (vs 12 pt)
- Line height: 14 pt (vs 16 pt)
- Highlights e badges com padding reduzido
- Dashboard com células coloridas por variante (info/success/warning)
- Tipografia editorial mais densa sem reduzir corpo legível (9–10 pt)

## O que NÃO foi alterado

- Banco de dados e migrations
- APIs e permissões
- `clinical-pdf-builders` e PDFs individuais
- Document Design System (`fisioos-ds`)
- Queries de dados do dossiê

## Build

```bash
npm run build
```

**Resultado:** sucesso (27/06/2026).

## Versão do documento

Rodapé: **`D3`** — Editorial Layout Engine.

## Próximos passos (opcional)

- Telemetria de `layoutStats` no botão “Gerar Dossiê” para benchmark por clínica
- Grid 2 colunas para comparativos + escalas na mesma página quando `avgFillRatio < 0.65`
- Preview side-by-side D2 vs D3 no painel de documentos
