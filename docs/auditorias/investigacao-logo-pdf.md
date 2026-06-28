# Investigação — Logo com fundo preto nos PDFs clínicos

**Data:** 27/06/2026  
**Escopo:** Pipeline logo → PDF clínico (Avaliação, Evolução, Reavaliação, Alta)  
**Build:** `npm run build` — OK  
**Validação:** `npx tsx scripts/pdf-clinical-fixtures.ts` — `01-avaliacao-longa.pdf` regenerado

---

## Resumo da causa raiz

O fundo preto **não é introduzido pelo layout do PDF** (`drawDocumentHeader`, `clearLogoBackdrop`, faixa branca do header). Ele vem **do bitmap embedado** via `doc.addImage()` quando:

1. A imagem no storage já traz **matte preto opaco** (JPEG ou PNG exportado incorretamente), **e**
2. A normalização em `normalizeLogoDataUrl()` **não remove** esse matte, **ou**
3. A normalização **falha / é ignorada** e a logo **original** é embedada mesmo assim.

---

## 1. Qual arquivo de logo está sendo carregado?

| Etapa | Fonte | Arquivo |
|-------|--------|---------|
| Banco | `clinic_settings.logo_url` | Path Supabase (`clinic-logos/…` ou `documents/…`) ou URL externa |
| Resolução | `loadClinicLogo()` em `src/lib/pdf.ts` | Signed URL fresh (cache persistente invalidado) |
| Download | `urlToDataUrl()` em `src/lib/pdf-engine/logo.ts` | Data URL com `content-type` do storage (PNG/JPEG/WebP) |
| App (UI) | `resolveClinicLogoUrl()` em `src/lib/clinic-logo.ts` | **Mesmo path**, mas URL assinada cacheada 50 min — **não passa por normalização** |

A UI exibe a URL assinada diretamente (`<img src>`). O PDF baixa bytes, converte para data URL e normaliza no canvas.

---

## 2. `prepareLogoForPdf()` em todos os builders?

| Fluxo | `prepareLogoForPdf`? | Observação |
|-------|----------------------|------------|
| **Produção** `buildPdf()` → `loadClinicLogo()` | ✅ 1× | Após `urlToDataUrl` |
| **Produção** `renderPdf()` | ✅ 1× (se string) | Ignorado se já `PreparedLogo` |
| **Fixtures Node** `renderPdf()` direto | ⚠️ Retorna `null` | Sem `document`/canvas — **sem normalização** |
| **Builders clínicos** (`clinical-pdf-builders.ts`) | N/A | Não tocam logo; delegam a `buildPdf` |

**Antes da correção:** `loadClinicLogo` descartava `PreparedLogo` e devolvia só `dataUrl` string; `renderPdf` re-normalizava. Em falha, fallback embedava **JPEG/PNG original** (`prepared ?? raw`).

**Depois da correção:** `loadClinicLogo` retorna `PreparedLogo | null`; `renderPdf` **nunca** embeda string crua — se normalização falhar, usa monograma.

---

## 3. `drawDocumentHeader()` usa imagem normalizada?

Sim, **obrigatoriamente** quando `PreparedLogo` chega ao render:

```
drawDocumentHeader → drawClinicBrandingBlock → drawLogoOrFallback → drawContainedImage
```

- `PreparedLogo` → `format: "PNG"` fixo, compressão `"NONE"` (preserva alpha).
- String crua **não é mais fallback** após correção.

`clearLogoBackdrop()` pinta branco **atrás** da logo — não remove matte **dentro** do bitmap.

---

## 4. Fluxos usando logo original (sem normalização)

| Fluxo | Usava original? | Status pós-fix |
|-------|-----------------|----------------|
| `buildPdf` falha normalização → fallback `raw` | ✅ **Sim — bug** | Corrigido → monograma |
| `normalizeLogoDataUrl` catch → cache fallback raw | ✅ **Sim — bug** | Corrigido → `null` |
| Node/fixtures `renderPdf(logo: dataUrl)` | ✅ Sem canvas | Esperado; monograma se null |
| `receipt-pdf.ts` | ✅ Caminho paralelo | Fora do escopo clínico |

---

## 5. Transparência PNG preservada?

| Ponto | Antes | Depois |
|-------|-------|--------|
| Canvas export | `toDataURL("image/png")` | Igual |
| Pixels alpha=0 com RGB preto | Não limpos → jsPDF pode mostrar preto | `sanitizeAlphaFringe()` zera RGB |
| `addImage` compressão | `"FAST"` | `"NONE"` para PNG |
| Matte preto opaco | Remoção parcial (cantos brancos falhavam) | `removeCornerBackground` + limiares ampliados |

---

## 6. Comparativo: App × Banco × PDF × Render

| Camada | O que o usuário vê | Fundo preto? |
|--------|-------------------|--------------|
| **App** (`ClinicLogo`) | URL assinada original | Só se o **arquivo** tiver matte (browser `<img>` respeita alpha PNG) |
| **Banco/Storage** | Bytes do upload | Fonte do problema se JPEG+preto ou PNG matte |
| **PDF (data URL pós-normalize)** | PNG canvas | Deve ser transparente após fix |
| **PDF renderizado (jsPDF)** | Bitmap embedado | Preto se normalização falhou ou alpha mal interpretado |

**Discrepância típica:** Logo PNG com cantos **brancos** e fundo **preto interno** — na app parece OK (fundo branco da página); no PDF o retângulo preto opaco aparece sobre o header branco.

---

## Onde o fundo preto era introduzido (ordem de probabilidade)

1. **`normalizeLogoDataUrl` — matte removal insuficiente** (causa principal em browser)  
   - `removeBlackMatte` exigia 3/4 cantos escuros — logos com cantos brancos **não acionavam**.  
   - `removeDarkEdgeMatte` só remove preto **conectado à borda** — preto interno isolado por padding branco permanecia.

2. **Fallback para imagem original** (`prepared?.dataUrl ?? raw` e cache de fallback no catch)  
   - Embedava JPEG/PNG **sem passar pelo canvas** → matte preto integral no PDF.

3. **`sanitizeAlphaFringe` ausente**  
   - Pixels transparentes com RGB=(0,0,0) → jsPDF renderiza como preto visível.

4. **Compressão `"FAST"` no PNG**  
   - Pode degradar canal alpha em alguns viewers.

5. **Node/fixtures**  
   - `isBrowserCanvasAvailable() === false` → logo original embedada (QA local apenas).

---

## Correções implementadas

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdf-engine/logo.ts` | `removeCornerBackground`, `sanitizeAlphaFringe`, ordem matte, limiares, sem cache de fallback, Node→`null` |
| `src/lib/pdf-engine/images.ts` | PNG embed com compressão `"NONE"` |
| `src/lib/pdf-engine/render.ts` | Não faz fallback para string crua |
| `src/lib/pdf-engine/types.ts` | `PdfRenderCtx.logo` aceita `PreparedLogo` |
| `src/lib/pdf.ts` | `loadClinicLogo` retorna `PreparedLogo \| null` |

---

## Validação

```bash
npm run build
npx tsx scripts/pdf-clinical-fixtures.ts
```

Saída: `pdf-clinical-fixtures/01-avaliacao-longa.pdf` (sem logo — monograma se Node).

**Validação completa com logo da clínica:** gerar Avaliação no browser (`buildPdf` via prontuário) — único ambiente onde a normalização canvas executa.

---

## Recomendações futuras (fora deste fix)

- Upload guideline: PNG transparente, sem matte preto/branco.
- Opcional: `sharp` ou `@napi-rs/canvas` em fixtures Node para QA automatizado de logo.
- Unificar `receipt-pdf.ts` no mesmo pipeline `prepareLogoForPdf`.
