# Sprint D1 — Dossiê Clínico Inteligente v1

Relatório de implementação. Data: 27/06/2026.

## Objetivo

PDF único consolidando automaticamente toda a documentação clínica existente do paciente, com capa premium, índice navegável, white label e validação (QR + hash) no mesmo padrão dos demais documentos.

## Arquitetura utilizada

```
Paciente ($id.tsx)
    └── GenerateDossierButton
            ├── Supabase (read-only): discharges, clinical_documents, assessment_goals
            ├── buildClinicalDossierPdfOpts (clinical-dossier-pdf.ts)
            │       ├── clinical-pdf-builders (assessment, evolution, reassessment, discharge)
            │       └── compare-utils (panorama comparativo)
            └── buildPdf → renderPdf
                    └── renderClinicalDossierPdf (pdf-engine/render.ts)
                            ├── Página 1: capa premium (logo white label + branding)
                            ├── Página 2: índice com links internos jsPDF
                            └── Páginas 3+: composição clinical-premium existente
                                    ├── measureBlock / compose / renderPageContent
                                    ├── drawDocumentFooter (rodapé institucional)
                                    └── drawValidationQr + hash fallback
```

**Fluxo em duas fases (índice):**

1. Medição e composição dos blocos (`compose`) determinam em qual página lógica cada seção inicia.
2. O índice na página 2 recebe links (`textWithLink` → `pageNumber`) apontando para `página PDF = 2 + índice lógico + 1`.

**Restrições respeitadas:** nenhuma migration, alteração de banco, API ou regra de negócio. Geração 100% client-side, on-demand.

## Componentes reutilizados

| Módulo | Uso no dossiê |
|--------|----------------|
| `clinical-pdf-builders.ts` | `buildAssessmentPdfOpts`, `buildEvolutionPdfOpts`, `buildReassessmentPdfOpts`, `buildDischargePdfOpts` — blocos clínicos sem duplicação |
| `pdf-engine/render.ts` | `measureBlock`, `compose`, `renderPageContent`, `drawCompactRunningHeader`, `drawLeftBand` |
| `pdf-engine/footer-engine.ts` | Rodapé institucional, QR de validação, hash fallback |
| `pdf-engine/header-engine.ts` | Cabeçalho compacto nas páginas de conteúdo |
| `pdf-engine/tokens.ts` | Paleta white label (`applyClinicPalette`), tipografia, espaçamento |
| `pdf-engine/images.ts` | `drawLogoBox` na capa |
| `compare-utils.ts` | `pickComparisonTriplet`, `buildMetricCompares`, `buildEvolutionSummary` |
| `pdf.ts` | `buildPdf`, `downloadPdf`, resolução de branding por `clinic_id` |

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/clinical-dossier-pdf.ts` | Agregador: monta `BuildPdfOpts` com todos os blocos do dossiê |
| `src/components/clinical/generate-dossier-button.tsx` | Botão "Gerar Dossiê" com fetch complementar e download |
| `docs/auditorias/sprint-d1-dossie-clinico.md` | Este relatório |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdf-engine/types.ts` | Campos `dossier` e `skipProfessionalValidation` em `BuildPdfOpts` |
| `src/lib/pdf-engine/render.ts` | `renderClinicalDossierPdf`, capa, índice, links internos |
| `src/lib/pdf.ts` | Respeita `skipProfessionalValidation` na validação de profissional |
| `src/routes/_authenticated/app/pacientes/$id.tsx` | Botão "Gerar Dossiê" no cabeçalho do paciente |

## Conteúdo do PDF v1.1 (Histórico Clínico Integrado)

1. **Capa institucional** — logo centralizado, título *HISTÓRICO CLÍNICO INTEGRADO*, paciente, data
2. **Índice** — links internos + encerramento institucional
3. **Cabeçalho discreto** em cada página: documento · paciente · seção atual
4. **Rodapé discreto**: clínica · página · data de geração
5. **Seções com quebra de página** nas grandes divisões (avaliação, evoluções, reavaliações, etc.)
6. **Cards semânticos** (badges/highlight) em vez de tabelas onde a leitura é melhor
7. **Cores com significado**: sucesso, atenção, informação, neutro
8. **Encerramento institucional** — resumo do tratamento, totais, mensagem da clínica, QR de validação

Botão na UI permanece **Gerar Dossiê**; arquivo salvo como `Histórico_Clinico_Integrado.pdf`.

## Build

```bash
npm run build
```

**Resultado:** sucesso (exit code 0).

## Limitações da versão 1

| Limitação | Detalhe |
|-----------|---------|
| Sem persistência | Dossiê não é salvo em `clinical_documents` nem no storage; geração sob demanda apenas |
| Documentos emitidos | Listagem/resumo — não faz merge de PDFs arquivados no bucket |
| Índice longo | Seções que excedem uma página de índice não continuam na TOC (corte na v1) |
| Profissional | Quando não há profissional com registro válido, assinatura é omitida (`hideSignature`); QR/hash permanecem |
| Validação online | Hash é gerado localmente; dossiê v1 não registra hash no banco (diferente de documentos emitidos via wizard) |
| Reavaliações duplicadas | Blocos de reavaliação podem repetir conteúdo já presente na avaliação inicial dependendo dos dados — comportamento herdado dos builders |
| Layout | Usa `clinical-premium` (blocks), não `fisioos-ds` (sections), por compatibilidade com compare-table/eva/evolutions |

## Próximos passos sugeridos (fora do escopo D1)

- Opção de preview antes do download
- Arquivar dossiê em `clinical_documents` com hash persistido
- Índice multi-página e bookmarks PDF/A
- Merge opcional de PDFs do storage na seção "Documentos emitidos"
