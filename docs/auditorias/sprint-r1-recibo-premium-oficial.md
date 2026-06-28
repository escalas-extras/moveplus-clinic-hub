# Sprint R1 — Recibo Premium Oficial

**Data:** 27/06/2026  
**Versão congelada:** `RECEIPT_LAYOUT_VERSION = "R1"`  
**Build:** `npm run build` — **sucesso**

---

## 1. Objetivo

Transformar o recibo no documento mais elegante do FisioOS: layout institucional, white label automático e dois modos de impressão (A4 integral e econômico 2×A5).

---

## 2. Entregas

### Layout congelado (`premium-renderer.ts`)

| Área | Implementação |
|------|----------------|
| **Modo A4** | 1 recibo por página, tipografia confortável |
| **Modo econômico** | 2 recibos A5 na mesma A4, linha de corte tracejada, slots independentes |
| **Cabeçalho** | Faixa primária/accent, logo ampliada, zona exclusiva do selo (108×72 pt), informações da clínica limitadas a `infoMaxX` |
| **Selo** | Maior, cantos arredondados, faixa accent inferior, numeração centralizada |
| **Corpo** | Parágrafo com valor por extenso, hierarquia clara |
| **Card premium** | Fundo surface, cantos arredondados, divisórias, ícones alinhados, labels pequenas, valores em bold |
| **Assinatura** | Box institucional com linha, nome, profissão e CREFITO |
| **Rodapé** | Logo mini, nome, CNPJ, versão R1 — discreto |
| **Cancelado** | Carimbo diagonal sem quebrar layout |
| **White label** | `primary_color`, `secondary_color`, logo, nome, slogan (`rodape_institucional`), CNPJ, contatos |

### API pública (`src/lib/receipt-pdf/`)

- `buildReceiptPdf` — recibo único
- `buildReceiptsBatchPdf` — lote (econômico: 2 por folha)
- `downloadReceiptPdf` / `previewReceiptPdf` / `printReceiptPdf`
- `downloadReceiptsBatchPdf` / `previewReceiptsBatchPdf` / `printReceiptsBatchPdf`
- `getStoredReceiptPrintMode` / `storeReceiptPrintMode` — persistência em `localStorage`
- Compatibilidade: `@/lib/receipt-pdf` reexporta o módulo novo

### UI — configuração de impressão

- Componente `ReceiptPrintModeSelector` (`src/components/receipt-print-mode.tsx`)
- **Financeiro → Recibos:** seletor na aba + diálogo “Emitir recibo”
- **Recibos Extra Flow:** seletor no topo; lote usa PDF único com agrupamento econômico

---

## 3. Arquivos

| Arquivo | Papel |
|---------|--------|
| `src/lib/receipt-pdf/types.ts` | Tipos R1, versão congelada, print mode |
| `src/lib/receipt-pdf/extenso.ts` | Valor por extenso |
| `src/lib/receipt-pdf/premium-renderer.ts` | Renderer congelado R1 |
| `src/lib/receipt-pdf/index.ts` | Orquestração + batch |
| `src/lib/receipt-pdf.ts` | Reexport de compatibilidade |
| `src/components/receipt-print-mode.tsx` | UI radio impressão |
| `src/routes/_authenticated/app/financeiro.tsx` | Integração recibos clínicos |
| `src/routes/_authenticated/app/recibos.tsx` | Lote Extra Flow |

**Não alterados:** banco, migrations, APIs, builders clínicos, DDS, dossiê PDF.

---

## 4. Congelamento

- Layout e renderer isolados em `premium-renderer.ts` — **não reutilizam** o Publishing Engine do dossiê.
- Constante `RECEIPT_LAYOUT_VERSION = "R1"` — alterações futuras exigem nova versão (R2+).
- Renderer dedicado permanece estável após aprovação desta sprint.

---

## 5. Test plan

- [ ] Emitir recibo em **Financeiro → Recibos** (modo A4) — selo sem sobreposição, card premium, assinatura
- [ ] Alternar para **2 recibos por folha** — linha de corte, dois recibos independentes
- [ ] Reimprimir lote em **Recibos Extra Flow** — um PDF com N páginas (econômico: ⌈N/2⌉)
- [ ] Clínica com cores/logo customizados — white label sem quebra
- [ ] Recibo cancelado — carimbo visível
- [ ] Preferência de impressão persiste após reload

---

## 6. Próximos passos (opcional)

- Preview visual side-by-side A4 vs econômico no diálogo
- Selo com numeração sequencial automática na reimpressão em lote mista
