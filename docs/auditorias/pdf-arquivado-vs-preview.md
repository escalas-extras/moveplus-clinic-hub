# Relatório — PDF arquivado vs pré-visualização atual

**Data:** 27/06/2026  
**Escopo:** Remoção de logs de investigação + distinção UX entre PDF do storage e PDF regenerado.

---

## 1. Logs temporários removidos

| Removido | Arquivos limpos |
|----------|-----------------|
| `src/lib/pdf-logo-debug.ts` | **Deletado** |
| `[PDF_LOGO_PATH]` | `documentos.tsx`, `pdf.ts`, `header-engine.ts` |
| `[PDF_LOGO_SOURCE]` | `pdf.ts`, `pdf-logo-loader.ts`, `images.ts` |
| `[PDF_LOGO_SIZE]` | `images.ts` |
| `[PDF_HEADER]` | `render.ts` |
| Logs `console.info` storage | `documentos.tsx`, `patient-documents-tab.tsx` |

---

## 2. Implementação UX

### Mensagens padronizadas (`clinical-document-pdf.ts`)

| Ação | Toast |
|------|-------|
| Abrir PDF arquivado | *"Documento arquivado — gerado com o layout vigente na data da emissão."* |
| Pré-visualizar layout atual | *"Pré-visualização — gerada com o layout atual."* |

### Wizard Emissão (`documentos.tsx` passo 4)

- Banner fixo: pré-visualização usa layout **atual**
- Botão renomeado: **"Pré-visualizar com layout atual"**
- **Emitir e arquivar** inalterado (gera + grava blob no storage)

### Documentos arquivados

Componente **`ClinicalDocumentPdfActions`** com dois botões:

1. **Abrir PDF arquivado** → signed URL do Supabase Storage (PDF congelado)
2. **Pré-visualizar com layout atual** → `buildPdf()` com seções do `content` arquivado

Usado em:
- `documentos.tsx` (painel lateral "Documentos do paciente")
- `patient-documents-tab.tsx` (aba documentos no prontuário)

---

## 3. Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/lib/pdf-logo-debug.ts` | Removido |
| `src/lib/pdf.ts` | Logs removidos |
| `src/lib/pdf-logo-loader.ts` | Logs removidos |
| `src/lib/pdf-engine/render.ts` | Logs removidos |
| `src/lib/pdf-engine/header-engine.ts` | Logs removidos |
| `src/lib/pdf-engine/images.ts` | Logs removidos |
| `src/lib/clinical-document-pdf.ts` | **Novo** — helpers arquivado vs preview |
| `src/components/clinical-document-pdf-actions.tsx` | **Novo** — UI dos dois botões |
| `src/routes/_authenticated/app/documentos.tsx` | Banner + botões + componente arquivados |
| `src/components/clinical/patient-documents-tab.tsx` | Dois botões + texto explicativo |

**Não alterado:** banco, migrations, PDFs no storage, conteúdo/cláusulas dos documentos.

---

## 4. Comportamento técnico da pré-visualização arquivada

`previewClinicalDocumentWithCurrentLayout()`:

1. Lê `content.sections` (fallback: parse de `body_text`)
2. Carrega profissional original por `professional_id`
3. Monta `BuildPdfOpts` com `clinicId` da clínica dona
4. Chama `previewPdf()` → engine atual (`header-engine`, `drawLogoBox`, etc.)

O PDF arquivado no storage **não é reescrito**.

---

## 5. Build

```bash
npm run build   # ✅ sucesso
```

---

## 6. Como validar na app

1. **Contrato novo (passo 4):** "Pré-visualizar com layout atual" → toast layout atual → PDF regenerado
2. **Contrato emitido:** "Abrir PDF arquivado" → toast arquivado → blob antigo
3. **Mesmo documento:** "Pré-visualizar com layout atual" → toast layout atual → PDF com engine/header atuais

Se a logo só estiver errada em **Abrir PDF arquivado**, o problema é histórico (blob antigo).  
Se estiver errada em **Pré-visualizar com layout atual**, o problema está no engine (`images.ts`, `tokens.ts`, `header-engine.ts`).
