# Relatório — Tamanho e enquadramento visual da logo

**Data:** 27/06/2026  
**Escopo:** Sidebar + cabeçalhos PDF (legacy, premium, contrato, avaliação). Sem banco, APIs ou regra de negócio.

---

## Problema

A correção anterior padronizou o pipeline (`object-contain`, helpers), mas visualmente:
1. **Sidebar** — logo em 36×36 px (`compact`/`sm`) era espremida no flex; área insuficiente para logos horizontais.
2. **PDF** — box 86×78 pt era pequeno; bloco textual fixo em `cardY + 26` desalinhava verticalmente com a logo.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/logo-box.tsx` | Área sidebar **48×48** (`md`) / **44×44** (`sm`); `minWidth`/`minHeight` anti-shrink; padding interno `p-1`; `object-contain` explícito; sem `overflow-hidden` na imagem |
| `src/components/clinic-logo.tsx` | Mantém mapeamento `compact` → sm/md com novos tamanhos |
| `src/components/app-shell.tsx` | Wrapper `shrink-0`; mobile `size="md"` (48px); sidebar `size={collapsed ? "sm" : "md"}` |
| `src/lib/pdf-engine/tokens.ts` | `PDF_LOGO`: **124×118 pt** (antes 86×78); `inset: 3` |
| `src/lib/pdf-engine/images.ts` | `drawLogoBox` aplica inset na área útil da imagem |
| `src/lib/pdf-engine/header-engine.ts` | Divisor alinhado à logo; texto centralizado verticalmente com `logoRect` |
| `src/lib/receipt-pdf.ts` | Mesmos tokens e alinhamento vertical texto/logo |

**Não alterados:** banco, migrations, APIs, pipeline de normalização (`prepareLogoForPdf`).

---

## Correções aplicadas

### Sidebar

| Antes | Depois |
|-------|--------|
| Mobile/colapsada: 36×36 px | Colapsada: **44×44**; expandida/mobile: **48×48** |
| Flex podia comprimir | `shrink-0` + dimensões mínimas fixas |
| `object-cover` (versão antiga) | **`object-contain`** + centralização |

### PDF (contrato, avaliação, legacy, clinical-premium)

| Antes | Depois |
|-------|--------|
| Box 86×78 pt | Box **124×118 pt** (~+44% área) |
| Texto em Y fixo | Y derivado do centro de `logoRect` |
| Divisor full card | Divisor na altura da logo |

Todos usam `drawClinicBrandingBlock` → mesma área em legacy e premium.

---

## Critérios de aceite

| # | Critério | Status |
|---|----------|--------|
| 1 | Sidebar mostra logo inteira, sem corte | ✅ 48×48 + contain + shrink-0 |
| 2 | Contrato — logo maior, alinhada ao nome | ✅ box 124×118 + cy alinhado |
| 3 | Avaliação — logo maior, alinhada | ✅ mesmo header engine (premium) |
| 4 | Nenhum PDF com logo minúscula | ✅ área aumentada |
| 5 | Nenhum PDF com logo cortada | ✅ fitRect / object-contain |

---

## Build

```bash
npm run build   # ✅ sucesso
```

Validação PDF: `npx tsx scripts/logo-alignment-validation.ts` → `pdf-logo-alignment/` (contrato + avaliação, formatos variados).

---

## Resumo

**7 arquivos** alterados, apenas renderização. Sidebar usa **48×48 px** (expandida) com contain e anti-shrink; PDFs usam **124×118 pt** com texto verticalmente alinhado ao bloco da logo.
