# Sprint D2 — Refinamento do Histórico Clínico Integrado

Relatório de implementação. Data: 27/06/2026.

## Objetivo

Transformar o dossiê em **Histórico Clínico Integrado** institucional: sem redundâncias, índice dinâmico, seções condicionais, documentos agrupados, linha do tempo, panorama do caso e conclusão formal — preparado para evoluções futuras de consolidação clínica.

## Arquivos criados

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/dossier/types.ts` | Tipos do domínio dossiê (`DossierContext`, metadados de conclusão) |
| `src/lib/dossier/utils.ts` | Sanitização de blocos, filtro de conteúdo vazio |
| `src/lib/dossier/assemble-dossier.ts` | Orquestrador modular |
| `src/lib/dossier/index-builder.ts` | `IndexBuilder` — índice só com seções renderizadas |
| `src/lib/dossier/sections/identification-section.ts` | `IdentificationSection` |
| `src/lib/dossier/sections/timeline-section.ts` | `TimelineSection` |
| `src/lib/dossier/sections/clinical-summary-section.ts` | `ClinicalSummarySection` |
| `src/lib/dossier/sections/comparative-section.ts` | `ComparativeSection` |
| `src/lib/dossier/sections/objectives-section.ts` | `ObjectivesSection` |
| `src/lib/dossier/sections/documents-section.ts` | `DocumentsSection` |
| `src/lib/dossier/sections/case-panorama-section.ts` | Panorama do caso + estatísticas |
| `src/lib/dossier/sections/conclusion-section.ts` | `ConclusionSection` / metadados |
| `src/lib/dossier/sections/signature-section.ts` | `SignatureSection` (metadados) |
| `docs/auditorias/sprint-d2-historico-clinico-integrado.md` | Este relatório |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/clinical-dossier-pdf.ts` | Thin wrapper → `assembleDossier` |
| `src/lib/pdf-engine/types.ts` | `timeline`, `includeInIndex`, `indexLabel`, metadados de conclusão |
| `src/lib/pdf-engine/render.ts` | Timeline visual, índice dinâmico, página **Conclusão do tratamento**, badges multilinha |

## Componentes criados (dossiê)

- `IdentificationSection`
- `TimelineSection`
- `ClinicalSummarySection`
- `ComparativeSection`
- `ObjectivesSection`
- `DocumentsSection`
- `CasePanoramaSection` (Panorama do caso)
- `ConclusionSection` + `SignatureSection`
- `IndexBuilder`

## Componentes reutilizados (inalterados)

- `clinical-pdf-builders` — blocos clínicos brutos (filtrados pelo sanitizer)
- `compare-utils` — panorama comparativo e objetivos
- `discharge-utils` — alta via builder existente
- `pdf-engine` — composição, paginação, QR/hash, white label
- `generate-dossier-button` — UI “Gerar Dossiê”
- `buildPdf` / `downloadPdf`

## Seções removidas / suprimidas

| Antes | Depois |
|-------|--------|
| Identificação duplicada (paciente + avaliação) | **Uma** seção Identificação unificada |
| Diagnóstico vazio (`—`) | Não renderiza, fora do índice |
| HMA, HMP, Hábitos, Antecedentes vazios | Filtrados dentro de Anamnese |
| Objetivos e plano terapêutico (avaliação) | Removido do PDF (consolidado em Objetivos terapêuticos) |
| Objetivos duplicados na alta | Removidos quando seção de objetivos existe |
| Listagem de todas as versões de documentos | Agrupamento por tipo |
| Encerramento institucional genérico | Substituído por **Conclusão do tratamento** |

## Seções adicionadas

1. **Linha do tempo do tratamento** — timeline vertical institucional
2. **Panorama do caso** — página-resumo com KPIs clínicos
3. **Resumo do caso** — slot `caseSummary` (não renderiza se vazio)
4. **Conclusão do tratamento** — última página com resumo, totais, profissional, QR/hash

## Duplicidades eliminadas

- Nome, sexo, profissão, telefone, nascimento não repetem nos blocos dos builders
- Grids de identificação dos builders (`identificationGrid`, alta, evolução) removidos pelo sanitizer
- Índice deduplica rótulos (`Set` por label normalizado)
- Documentos: uma entrada por **tipo**, não por versão

## Melhorias visuais

- Cabeçalho: documento · paciente · seção (`indexLabel` quando aplicável)
- Rodapé: clínica · página · data de emissão
- Cards semânticos (sucesso / informação / atenção / neutro)
- Timeline com marcadores e conectores verticais
- Badges multilinha (quantidade, emissão, hash)
- Quebra de página em grandes seções
- Versão do template: **D2**

## Preparação para funcionalidades futuras

| Slot | Uso futuro |
|------|------------|
| `ClinicalDossierInput.caseSummary` | Resumo consolidado do caso |
| `ClinicalDossierInput.professionalNotes` | Considerações do fisioterapeuta na conclusão |
| `DossierPanoramaStats` | Base para alertas e indicadores |
| `assembleDossier()` | Ponto único para injetar narrativa/evolução consolidada |
| Seções modulares | Extensão sem alterar builders ou Core |

Nenhuma menção a tecnologia/IA na interface ou no PDF.

## Build

```bash
npm run build
```

**Resultado:** sucesso (exit code 0).

## Validação visual

Validação recomendada manualmente na ficha do paciente (**Gerar Dossiê**):

1. Capa: **HISTÓRICO CLÍNICO INTEGRADO**
2. Índice: apenas seções com conteúdo + Conclusão do tratamento
3. Identificação única com dados clínicos iniciais
4. Ausência de “Diagnóstico” vazio
5. Documentos agrupados por tipo (quantidade / última emissão / hash)
6. Linha do tempo (≥ 2 eventos)
7. Panorama do caso
8. Conclusão com profissional, QR e rodapé institucional

## Ordem das seções no documento

1. Capa  
2. Índice  
3. Identificação  
4. Avaliação inicial (subseções sanitizadas)  
5. Linha do tempo do tratamento  
6. Resumo do caso *(se houver)*  
7. Panorama do caso  
8. Evoluções  
9. Reavaliações  
10. Panorama comparativo *(se aplicável)*  
11. Objetivos terapêuticos *(se aplicável)*  
12. Alta fisioterapêutica *(se aplicável)*  
13. Documentos emitidos *(agrupados)*  
14. Conclusão do tratamento  

## Limitações D2

- Índice longo ainda trunca em uma página de TOC
- Resumo do caso só aparece se `caseSummary` for informado externamente
- Considerações do profissional: fallback em `observacoes` da alta
- Timeline exige ≥ 2 eventos clínicos
- Índice multi-página não implementado
