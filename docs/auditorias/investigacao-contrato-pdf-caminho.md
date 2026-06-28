# Investigação — Caminho real do Contrato PDF

**Modo:** investigação (sem correção visual)  
**Data:** 27/06/2026

---

## 1. Botão real que gera o Contrato (Emissão de Documentos)

| Etapa | Arquivo | Função / componente |
|-------|---------|---------------------|
| UI | `src/routes/_authenticated/app/documentos.tsx` | `DocumentosPage` |
| Botão preview | `"Abrir PDF"` → `previewPdf(buildPdfOpts())` | linha ~670 |
| Botão emitir | `"Emitir e arquivar"` → `emit.mutate()` → `buildPdf(opts)` | linha ~289 |
| Wrapper Supabase | `src/lib/pdf.ts` | `buildPdf()` |
| Loader logo | `src/lib/pdf-logo-loader.ts` | `loadClinicLogoForPdf()` |
| Renderizador | `src/lib/pdf-engine/render.ts` | `renderPdf()` |
| Header contrato | `src/lib/pdf-engine/header-engine.ts` | `drawLegacyClinicHeader()` → `drawClinicBrandingBlock()` |
| Desenho logo | `src/lib/pdf-engine/images.ts` | `computeLogoBoxRect()` + `drawLogoBox()` |
| Tokens tamanho | `src/lib/pdf-engine/tokens.ts` | `PDF_LOGO` |

**Contrato NÃO usa:**
- `clinical-premium` (avaliação usa; contrato em `/app/documentos` não passa `layout`)
- HTML / `window.print()` / jsPDF separado
- `receipt-pdf.ts`
- Template HTML — corpo vem de `renderTemplateSections()` (merge-tags), cabeçalho é jsPDF engine

**Barrel:** `src/lib/pdf-engine.ts` apenas reexporta `./pdf-engine/index` — **não há engine paralelo antigo**.

---

## 2. Detecção contrato vs premium

Em `render.ts`:

```typescript
const isContract = /contrato/i.test(opts.title || "");
const isClinicalPremium = opts.layout === "clinical-premium";
```

- **Contrato em documentos:** `title = template.name` (ex.: "Contrato de Prestação…") → `isContract=true`, `isClinicalPremium=false` → **`drawLegacyClinicHeader`**
- **Avaliação em pacientes:** `buildAssessmentPdfOpts()` define `layout: "clinical-premium"` → **`drawDocumentHeader`**

Ambos passam pelo mesmo `drawClinicBrandingBlock` → `drawLogoBox`.

---

## 3. Caminho alternativo (hipótese forte para “alterações sem efeito”)

| Ação | Caminho | Regenera PDF? |
|------|---------|---------------|
| **Abrir PDF** (wizard passo 4) | `previewPdf` → `buildPdf` | ✅ Sim |
| **Emitir e arquivar** | `buildPdf` → upload storage → download blob | ✅ Sim (download imediato) |
| **Abrir** documento arquivado (prontuário / lista emitidos) | `createSignedUrl(pdf_url)` → nova aba | ❌ **PDF congelado no storage** |

Arquivos do caminho storage (sem logs de logo engine):
- `src/components/clinical/patient-documents-tab.tsx`
- `src/routes/_authenticated/app/documentos.tsx` (lista `emitted`)

Se o usuário abre um contrato **já emitido antes das correções**, vê o PDF antigo — **não passa por `header-engine.ts`**.

---

## 4. Logs temporários adicionados (DEV)

Helper: `src/lib/pdf-logo-debug.ts` (`PDF_LOGO_DEBUG_MARK`)

| Tag | Onde | O que mostra |
|-----|------|--------------|
| `[PDF_LOGO_PATH]` | documentos.tsx, pdf.ts, header-engine.ts | origem UI → buildPdf → drawLogoBox |
| `[PDF_LOGO_SOURCE]` | pdf.ts, pdf-logo-loader.ts, images.ts | prepared / null / fallback-monograma |
| `[PDF_LOGO_SIZE]` | images.ts | boxW/H, drawW/H final (fitRect) |
| `[PDF_HEADER]` | render.ts | legacy vs premium |
| `[PDF_LOGO_PATH] TEMP: … storage` | patient-documents-tab.tsx | aviso PDF não regenerado |

Ativos quando `import.meta.env.DEV === true` ou `VITE_PDF_LOGO_DEBUG=true`.

### Como validar na aplicação

1. `npm run dev`
2. Abrir DevTools → Console
3. `/app/documentos` → modelo Contrato → passo 4 → **Abrir PDF**
4. Sequência esperada:

```
[PDF_LOGO_PATH] { origin: "documentos.tsx Abrir PDF", fn: "previewPdf → buildPdf", ... }
[PDF_LOGO_PATH] { origin: "pdf.ts buildPdf", fn: "renderPdf", ... }
[PDF_LOGO_SOURCE] { origin: "pdf-logo-loader...", kind: "prepared" | ... }
[PDF_HEADER] { header: "legacy:drawLegacyClinicHeader", isContract: true, ... }
[PDF_LOGO_PATH] { origin: "header-engine.ts drawClinicBrandingBlock", fn: "drawLogoBox", ... }
[PDF_LOGO_SIZE] { boxW: 124, boxH: 118, drawW: ..., drawH: ..., tokens: {...} }
```

5. Se abrir contrato arquivado → só log `storage signed URL (PDF NÃO regenerado)`.

---

## 5. Por que alterações anteriores podem não ter surtido efeito

| Causa | Explicação |
|-------|------------|
| **PDF arquivado** | Visualização de documentos emitidos usa blob antigo no Supabase Storage |
| **Logo não normalizada** | Se `prepareLogoForPdf` falhar → monograma (logs `[PDF_LOGO_SOURCE] kind: fallback-monograma`) |
| **Dimensões naturals pequenas** | `[PDF_LOGO_SIZE] drawW/drawH` mostram tamanho real desenhado vs box |
| **Confusão sidebar vs PDF** | Sidebar usa `LogoBox` React; PDF usa `drawLogoBox` — pipelines independentes |
| **Build não recarregado** | Dev server precisa rebuild após mudanças em tokens |

**Conclusão técnica:** O contrato clicado em **“Abrir PDF”** ou **emitido agora** **usa sim** `header-engine.ts`, `images.ts`, `tokens.ts` e `pdf.ts`. Correções visuais futuras devem focar nesses arquivos **se os logs confirmarem esse caminho**. Se só aparecer log de storage, o problema é visualização de PDF histórico.

---

## 6. Arquivo(s) a corrigir (após confirmar logs)

| Prioridade | Arquivo | Quando |
|------------|---------|--------|
| 1 | `src/lib/pdf-engine/images.ts` | Se `[PDF_LOGO_SIZE] drawW/drawH` << box |
| 2 | `src/lib/pdf-engine/tokens.ts` | Se box correto mas draw pequeno por inset/tokens |
| 3 | `src/lib/pdf-engine/header-engine.ts` | Se alinhamento vertical texto/logo |
| 4 | `src/lib/pdf-logo-loader.ts` + `logo.ts` | Se `[PDF_LOGO_SOURCE]` = normalize-failed |
| 5 | Fluxo storage | Se usuário só abre PDFs antigos — precisa reemitir ou regenerar |

---

## 7. Build

```bash
npm run build   # ✅ sucesso (com logs temporários)
```

## 8. Remoção dos logs

Arquivos marcados com investigação:
- `src/lib/pdf-logo-debug.ts` (remover inteiro)
- `src/lib/pdf.ts`
- `src/lib/pdf-logo-loader.ts`
- `src/lib/pdf-engine/render.ts`
- `src/lib/pdf-engine/header-engine.ts`
- `src/lib/pdf-engine/images.ts`
- `src/routes/_authenticated/app/documentos.tsx`
- `src/components/clinical/patient-documents-tab.tsx`
