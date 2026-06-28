# Relatório — Alinhamento e dimensionamento da logo

**Data:** 27/06/2026  
**Escopo:** Renderização visual da logo (UI + PDF). Sem alteração de banco, APIs ou regra de negócio.

---

## Problema

A logo era exibida com **`object-cover`** na sidebar (cortando imagens horizontais/verticais), tamanhos inconsistentes entre sidebar, configurações e login, e posicionamento fixo no topo do cabeçalho PDF legacy (sem centralização vertical na área reservada).

---

## Solução: helpers únicos

### UI — `LogoBox` (`src/components/logo-box.tsx`)

| Variante | Área fixa | Uso |
|----------|-----------|-----|
| `sm` | 36×36 px | Sidebar colapsada / mobile |
| `md` | 44×44 px | Sidebar expandida |
| `lg` | 64×64 px | Pré-visualização identidade |
| `xl` | 72×72 px | Login / auth |
| `upload` | 96×96 px | Upload de logo |

Comportamento:
- `object-contain` + flex center
- Área fixa, proporção preservada
- Suporta quadrada, horizontal, vertical
- Fallback via prop `fallback`

### UI — `ClinicLogo` (refatorado)

Encapsula `LogoBox` + monograma de fallback. Usado em:
- `app-shell.tsx` (sidebar + mobile header)
- `configuracoes.tsx` (pré-visualização identidade)
- `auth.tsx` (login)

### PDF — `drawLogoBox` + `computeLogoBoxRect` (`src/lib/pdf-engine/images.ts`)

| Token | Valor |
|-------|-------|
| `PDF_LOGO.boxW` | 86 pt |
| `PDF_LOGO.boxH` | 78 pt |
| `PDF_LOGO.padding` | 14 pt |

Comportamento:
- `fitRect` — object-contain (mesma lógica do CSS)
- `computeLogoBoxRect` — centraliza verticalmente no container do cabeçalho
- Monograma centralizado no box quando logo ausente
- Mesmo Logo Engine (`PreparedLogo` PNG) em legacy e premium

---

## Alterações por área

### Aplicação

| Arquivo | Mudança |
|---------|---------|
| `logo-box.tsx` | **Novo** — componente base |
| `clinic-logo.tsx` | `object-cover` → `LogoBox` + `object-contain` |
| `app-shell.tsx` | Alinhamento vertical logo + nome da clínica |
| `configuracoes.tsx` | Preview usa `ClinicLogo` size `lg` (igual sidebar) |
| `logo-uploader.tsx` | Preview usa `LogoBox` size `upload` |
| `auth.tsx` | `ClinicLogo` size `xl` (remove `LogoMark` ad hoc) |

### PDFs

| Arquivo | Mudança |
|---------|---------|
| `header-engine.ts` | `computeLogoBoxRect` + `drawLogoBox` (legacy + premium) |
| `receipt-pdf.ts` | Mesmos tokens `PDF_LOGO` + centralização |
| `images.ts` | `drawLogoBox`, `computeLogoBoxRect`; monograma centrado no box |
| `index.ts` | Export dos novos helpers |

Legacy e premium compartilham `drawClinicBrandingBlock` → **mesma área e alinhamento**.

---

## Testes executados

### Build

```bash
npm run build   # ✅ sucesso
```

### PDFs — formatos variados (`pdf-logo-alignment/`)

Script: `npx tsx scripts/logo-alignment-validation.ts`

| Formato | Contrato (legacy) | Avaliação (premium) |
|---------|-------------------|---------------------|
| Quadrada | ✅ | ✅ |
| Horizontal | ✅ | ✅ |
| Vertical | ✅ | ✅ |
| PNG transparente | ✅ | ✅ |
| JPG | ⚠ crash Node (@napi-rs) | — |

> JPG em produção usa canvas do browser (normalização OK). Crash limitado ao script Node no Windows.

### UI (manual)

- Sidebar expandida/colapsada — área fixa, sem crop
- Configurações — preview alinhado ao padrão sidebar
- Login — `ClinicLogo` xl com contain

---

## Antes → Depois

| Contexto | Antes | Depois |
|----------|-------|--------|
| Sidebar | `object-cover` (crop) | `object-contain` em área fixa |
| Config preview | `h-16 w-auto` ad hoc | `ClinicLogo` lg (64×64) |
| PDF legacy | `logoY = cardY + 18` fixo | Centralizado em `cardH` |
| PDF recibo | Box 76×76 ad hoc | `PDF_LOGO` 86×78 padronizado |
| Monograma PDF | Canto superior esquerdo | Centrado no box |

---

## Conclusão

Logo padronizada em **um componente UI** (`LogoBox` / `ClinicLogo`) e **um helper PDF** (`drawLogoBox`). Proporção preservada, centralização vertical nos cabeçalhos, áreas fixas equivalentes entre sidebar (44px) e PDF (86×78 pt). Nenhuma migration, API ou regra de negócio alterada.
