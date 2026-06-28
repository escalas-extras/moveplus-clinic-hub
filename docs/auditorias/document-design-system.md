# FisioOS Document Design System

Motor de layout reutilizável para todos os documentos PDF do FisioOS. Separa **estrutura**, **tema**, **componentes** e **renderização** — mudanças visuais futuras não exigem alterar builders de conteúdo.

## Objetivo

Substituir layouts ad hoc por um padrão institucional premium, white-label e pronto para impressão (A4, P&B, PDF digital). O piloto inicial aplica-se **somente ao Contrato**; demais documentos clínicos permanecem em `clinical-premium`.

## Arquitetura

```
BuildPdfOpts (dados + sections)
        │
        ▼
   renderPdf()                    ← ponto único de entrada
        │
        ├── layout: "fisioos-ds" ──► renderFisioosDsDocument()
        ├── layout: "clinical-premium" ──► motor clínico existente
        └── layout: "legacy" ──► motor legado
```

### Camadas

| Camada | Responsabilidade | Arquivos |
|--------|------------------|----------|
| **Tokens** | Tipografia, espaçamento, cores base, grid A4 | `design-system/tokens.ts` |
| **Theme** | White label — cores da clínica, mix de bordas | `design-system/theme.ts` |
| **Types** | Contratos TypeScript do DS | `design-system/types.ts` |
| **Components** | Header, Footer, SectionCard, Signature, Badge, InfoGrid… | `design-system/components/` |
| **Engine** | Paginação, orquestração, páginas | `design-system/render-document.ts` |

### Fluxo do Contrato

1. `documentos.tsx` / `clinical-document-pdf.ts` montam `BuildPdfOpts` (conteúdo jurídico inalterado).
2. `withContractPremiumLayout()` injeta `layout: "fisioos-ds"`.
3. `renderPdf()` delega para `renderFisioosDsDocument()`.
4. O motor cria `DocumentTheme` via `createDocumentTheme(clinic)`.
5. Renderiza header premium, section cards, assinaturas, rodapé e QR.

## Layout ID

```ts
export const DS_LAYOUT_ID = "fisioos-ds";
```

Contratos: `fisioos-ds`  
Avaliação, Evolução, Reavaliação, Alta, Declarações, Recibos: **inalterados** (`clinical-premium` ou `legacy`).

## Tokens

### Tipografia (`DS_TYPOGRAPHY`)

Escala fixa — nunca usar tamanhos arbitrários fora dela:

- `docTitle`, `docSubtitle` — título do documento
- `sectionTitle` — título de seção (SectionCard)
- `label`, `body`, `caption` — metadados e conteúdo
- `footer`, `footerSmall` — rodapé institucional
- `sigName`, `sigRole` — assinaturas

### Espaçamento (`DS_SPACING`)

- Margem A4: 44 pt
- Header: 178 pt | Footer: 48 pt
- Section gap: 14 pt | Line height: 14 pt
- Área de assinatura contrato: 200 pt
- QR: 42 pt

### Cores (`DS_COLORS_BASE`)

`primary`, `secondary`, `surface`, `surfaceAlt`, `muted`, `border`, `borderSoft`, `ink`, `paper`, `success`, `warning`, `danger`.

Sobrescritas por `clinic.primary_color` e `clinic.secondary_color` (hex) em `createDocumentTheme()`.

## Componentes

| Componente | Função |
|------------|--------|
| `drawDsHeader` | Logo + clínica (esq.) + card documento (dir.) |
| `drawDsRunningHeader` | Faixa compacta páginas 2+ |
| `drawSectionCard` | Seção com faixa superior, padding, bordas arredondadas |
| `drawDsSignatureArea` | Local/data + blocos contratante/contratada/testemunhas |
| `drawDsFooter` | Confidencialidade, paginação, referência de validação |
| `drawDsValidationQr` | QR + texto amigável (não técnico) |
| `drawDsBadge` | Status visual (success/warning/danger/neutral) |
| `drawDsInfoGrid` | Grid label/valor reutilizável |
| `drawDsDivider` | Separador sutil |

Componentes futuros (CompareTable, Timeline, Checklist, PatientCard, ProfessionalCard) podem ser adicionados em `components/` sem alterar builders.

## White Label

`createDocumentTheme(clinic)` aceita:

- `primary_color`, `secondary_color` — paleta derivada
- Logo via `prepareLogoInput()` + `drawLogoBox()` (mesmo pipeline da UI)
- Nome, CNPJ, endereço, telefone, email no header

O grid e ritmo vertical permanecem estáveis; apenas cores e branding mudam.

## Impressão

- Formato A4 (595×842 pt)
- Contraste adequado para P&B (bordas e texto não dependem só de cor)
- Margens e footer reservados para paginação e QR na última página

## QA

```bash
npm run build
npx tsx scripts/generate-contract-qa.ts
```

Saída: `pdf-qa/contrato-fisioos-ds-qa.pdf`

## Migração futura

Para migrar outro documento (ex.: Avaliação):

1. Mapear `blocks`/`sections` para componentes DS (SectionCard, InfoGrid, etc.).
2. Estender `renderFisioosDsDocument()` ou criar `renderClinicalDsDocument()` reutilizando componentes.
3. Alterar apenas `layout` no builder — **sem** mudar conteúdo ou APIs.

## Princípio

> Builders produzem **dados**. O Document Design System produz **apresentação**.

Essa separação garante que o FisioOS evolua visualmente como um SaaS premium sem reescrever a lógica jurídica ou clínica.
