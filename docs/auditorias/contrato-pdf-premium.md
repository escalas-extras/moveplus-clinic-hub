# Relatório — Contrato PDF migrado para layout premium

**Data:** 27/06/2026  
**Escopo:** Apresentação/layout do Contrato de Prestação de Serviços — sem alteração de conteúdo jurídico, banco ou dados.

---

## Problema

Contratos gerados em `/app/documentos` (passo 4, preview/regeneração) usavam **layout legacy** (`drawLegacyClinicHeader` + título abaixo do header), enquanto Avaliação já usava **`clinical-premium`** (`drawDocumentHeader` + card documento + logo premium).

---

## Solução

Helper **`withContractPremiumLayout()`** (`document-pdf-layout.ts`) aplica `layout: "clinical-premium"` quando o título ou `doc_type` indica contrato.

### Pipeline contrato (pós-migração)

```
documentos.tsx buildPdfOpts()
  → withContractPremiumLayout()
  → buildPdf() → renderPdf()
  → isClinicalPremium = true
  → drawDocumentHeader(isContract: true)
  → drawLogoBox (Logo Engine)
  → drawDocumentFooter + QR/hash
  → drawContractSignatures (inalterado)
```

Conteúdo das cláusulas (`sections` / merge-tags) **não foi alterado**.

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/document-pdf-layout.ts` | **Novo** — `withContractPremiumLayout`, `isContractPdf` |
| `src/routes/_authenticated/app/documentos.tsx` | `buildPdfOpts()` usa layout premium para contratos |
| `src/lib/clinical-document-pdf.ts` | Regeneração de arquivados também premium |
| `src/lib/pdf-engine/render.ts` | `drawDocumentHeader(..., isContract: true)` no premium |
| `scripts/pdf-fixtures.ts` | Contratos QA com `layout: "clinical-premium"` |
| `scripts/generate-contract-qa.ts` | **Novo** — PDF QA dedicado |
| `scripts/pdf-logo-validation.ts` | Contrato QA premium |
| `scripts/logo-alignment-validation.ts` | Contrato QA premium |

---

## O que permanece igual

- Texto das cláusulas e seções jurídicas
- Assinaturas contratuais (`drawContractSignatures`)
- Paginação, gaps de contrato, reserva QR
- Faixa lateral (`drawLeftBand`) em contratos
- PDFs já arquivados no storage (somente novos/regenerados usam premium)

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Passo 4 não usa layout legacy | ✅ `layout: "clinical-premium"` |
| Mesma identidade visual da Avaliação | ✅ `drawDocumentHeader` + footer + logo box |
| Conteúdo jurídico igual | ✅ Apenas `sections` existentes |
| Logo engine atual | ✅ `loadClinicLogoForPdf` → `drawLogoBox` |
| QR/hash/validação | ✅ Mantidos via `validationHash` |

---

## Build e QA

```bash
npm run build                              # ✅ sucesso
npx tsx scripts/generate-contract-qa.ts    # → pdf-qa/contrato-premium-qa.pdf
```

---

## Validar na app

1. `/app/documentos` → modelo **Contrato** → passo 4 → **Pré-visualizar com layout atual**
2. Header premium com card "Contrato", logo grande, profissional no bloco clínica
3. Comparar visualmente com Avaliação (paciente → Baixar avaliação)

Documentos **Abrir PDF arquivado** continuam mostrando blob histórico até reemitir ou usar **Pré-visualizar com layout atual**.
