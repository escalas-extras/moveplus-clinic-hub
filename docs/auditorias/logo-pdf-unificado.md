# Relatório — Logo Engine unificado em todos os PDFs

**Data:** 27/06/2026  
**Escopo:** Pipeline de logo nos PDFs (sem alteração de banco, migrations ou regra de negócio)

---

## Problema

Logos com **fundo preto**, **matte preto**, PNG com alpha mal tratado ou JPG com fundo opaco apareciam nos cabeçalhos de contratos e documentos jurídicos (layout legacy), porque parte do código ainda embedava a imagem **raw** via `addImage` sem normalização.

---

## Auditoria de pipelines

| Documento | Entrada | Logo Engine | Status |
|-----------|---------|-------------|--------|
| Contratos, declarações, relatórios, TCLE | `buildPdf()` → `loadClinicLogoForPdf()` → `renderPdf()` → `prepareLogoInput()` → `drawLogoOrFallback()` | ✅ | OK |
| PDFs clínicos (avaliação, evolução, alta…) | `buildPdf()` / `clinical-premium` | ✅ | OK |
| Recibos | `buildReceiptPdf()` → `loadClinicLogoForPdf()` → `drawLogoOrFallback()` | ✅ | **Corrigido** (bypass legacy removido) |
| Biblioteca / documentos gerados na app | `buildPdf()` | ✅ | OK |
| Fixtures Node (CI/QA) | `prepareLogoInputNode()` (`scripts/lib/logo-node.ts`) | ✅ | OK |

### Bypasses eliminados

1. **`receipt-pdf.ts`** — removidos `resolveClinicLogoUrl`, `urlToDataUrl` e `doc.addImage` direto; passa a usar `loadClinicLogoForPdf` + `drawLogoOrFallback`.
2. **`drawLogoOrFallback`** — aceita apenas `PreparedLogo | null` (formato PNG); string raw cai em monograma, nunca em `addImage` cru.
3. **`render.ts`** — sempre chama `prepareLogoInput(ctx.logo)` antes do header (legacy e premium).
4. **Fixtures** — `prepareLogoInputNode` em scripts; `@napi-rs/canvas` **fora** do bundle browser (build Vite não quebra).

### O que permanece com `addImage` raw (fora do escopo logo)

- QR code de validação (`footer-engine.ts`) — PNG gerado em runtime, sem matte.
- Assinaturas (`drawSignatureImage`) — fluxo separado de imagem de assinatura.

---

## Arquitetura final

```
clinic_settings.logo_url
  → pdf-logo-loader.loadClinicLogoForPdf()
      → urlToDataUrl(signed URL)
      → prepareLogoForPdf() / normalizeLogoDataUrl() [browser canvas]
          → logo-matte.ts (remove white/black matte, corner flood-fill, alpha fringe)
      → PreparedLogo { dataUrl, width, height, format: "PNG" }
  → drawLogoOrFallback()
      → clearLogoBackdrop (paper)
      → drawContainedImage(PreparedLogo, compressão PNG "NONE")
```

**Node (fixtures):** `scripts/lib/logo-node.ts` + `@napi-rs/canvas` — mesmo `logo-matte.ts`, sem import no app.

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/pdf-logo-loader.ts` | Loader único URL → PreparedLogo |
| `src/lib/pdf.ts` | Usa loader compartilhado |
| `src/lib/receipt-pdf.ts` | Logo engine (fim do bypass legacy) |
| `src/lib/pdf-engine/logo.ts` | Browser-only; matte extraído |
| `src/lib/pdf-engine/logo-matte.ts` | **Novo** — pipeline matte compartilhado |
| `src/lib/pdf-engine/render.ts` | `prepareLogoInput` antes do header |
| `src/lib/pdf-engine/images.ts` | Logo só `PreparedLogo` |
| `src/lib/pdf-engine/header-engine.ts` | Tipos alinhados |
| `scripts/lib/logo-node.ts` | **Novo** — normalização Node |
| `scripts/pdf-logo-validation.ts` | **Novo** — QA matte preta |
| `scripts/pdf-fixtures.ts` | `prepareLogoInputNode` |
| `scripts/pdf-clinical-fixtures.ts` | `prepareLogoInputNode` |

---

## Correções aplicadas

| Sintoma | Correção |
|---------|----------|
| Fundo preto em contratos | Header legacy via `prepareLogoInput` + matte pipeline |
| Matte preto nos cantos | `removeBlackMatte`, `removeDarkEdgeMatte`, flood-fill |
| PNG alpha → franja preta no jsPDF | `sanitizeAlphaFringe` + PNG compressão `"NONE"` |
| JPG com fundo branco | `removeWhiteMatte` + reexport PNG |
| Fallback raw no recibo | Removido; usa `PreparedLogo` |
| `addImage` com formato JPEG/WEBP | Sempre PNG após normalização |

---

## Validação

### Build

```bash
npm run build   # ✅ sucesso
```

### PDFs regenerados

**Logo matte preta sintética** (`pdf-logo-validation/`):

| Arquivo | Tipo |
|---------|------|
| `01-avaliacao-logo-matte-preta.pdf` | Avaliação (clinical-premium) |
| `02-contrato-logo-matte-preta.pdf` | Contrato (legacy header) |
| `03-declaracao-logo-matte-preta.pdf` | Declaração |
| `04-recibo-logo-matte-preta-engine.pdf` | Recibo (layout engine) |

**Fixtures gerais** (`pdf-fixtures/`): contratos, relatórios, logos PNG/JPG/grande/pequena — 14 PDFs.

**Fixtures clínicos** (`pdf-clinical-fixtures/`): 6 PDFs incl. avaliação longa e logo transparente.

> Recibo nativo (`buildReceiptPdf`) requer Supabase em runtime; em Node local gera aviso e usa equivalente engine (04).

---

## Conclusão

Todos os PDFs de produção passam pelo **mesmo Logo Engine** (`loadClinicLogoForPdf` → matte → `PreparedLogo` → `drawLogoOrFallback`). Não há fallback para imagem original no cabeçalho: falha de normalização → monograma. O bypass legacy do recibo foi eliminado; contratos jurídicos usam o header legacy com logo já normalizada.
