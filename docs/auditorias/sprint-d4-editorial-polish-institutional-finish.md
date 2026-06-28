# Sprint D4 — Editorial Polish & Institutional Finish

Relatório de implementação. Data: 27/06/2026.

## Objetivo

Elevar a **percepção de qualidade visual** do Histórico Clínico Integrado ao nível de documento institucional de excelência — sem novas funcionalidades, sem alterar composição, builders ou fluxo de dados.

## Arquivos alterados

| Arquivo | Refinamento |
|---------|-------------|
| `src/lib/pdf-engine/publishing/chrome.ts` | Capa premium, cabeçalho editorial, encerramento, assinatura |
| `src/lib/pdf-engine/publishing/primitives.ts` | EVA, panorama, comparativos, documentos, tipografia |
| `src/lib/pdf-engine/publishing/typography.ts` | **Novo** — hierarquia tipográfica padronizada |
| `src/lib/pdf-engine/publishing/dossier-visuals.ts` | **Novo** — ícones panorama, EVA, colunas documentos |
| `src/lib/pdf-engine/publishing/render-content.ts` | Grade responsiva de documentos (2–3 colunas) |
| `src/lib/pdf-engine/publishing/measure.ts` | Alturas calibradas aos novos componentes |
| `src/lib/pdf-engine/render.ts` | Capa async + seção no cabeçalho + rodapé institucional |
| `src/lib/pdf-engine/types.ts` | `dossier.cover` (metadados de apresentação) |
| `src/lib/clinical-dossier-pdf.ts` | `documentVersion: D4`, metadados de capa |

## O que NÃO foi alterado

- Banco, migrations, APIs, builders, regras clínicas
- Fluxo do dossiê (`assemble-dossier`, `layout-composer`)
- Lógica do Publishing Engine (`compose`, `balancePageDensities`)
- Document Design System compartilhado

## Melhorias aplicadas

### 1. Capa institucional premium

- Logo central com protagonismo (white label via `drawLogoBox` + paleta da clínica)
- Título, paciente, profissional responsável e período (datas com ↓ quando aplicável)
- Painel metadata com faixa brand lateral
- Badge **DOCUMENTO OFICIAL**
- QR de validação discreto (canto inferior direito)
- Rodapé confidencial

### 2. Cabeçalho editorial

- Logo + paciente + documento à esquerda
- Data + **seção atual** à direita (sem repetições)
- Linha brand fina — 46 pt de altura

### 3. Panorama → dashboard

- Cards estatísticos com ícones discretos (`dashboardIconFor`)
- Número grande + divisor horizontal
- KPIs: Sessões, Avaliações, Reavaliações, Documentos, etc.

### 4. EVA visual

- Barra gradiente 0–10 com marcador ●
- Classificação acima do marcador (Sem dor → Extrema)
- Legenda: Sem dor · Leve · Moderada · Intensa · Extrema
- Faixa lateral colorida por zona

### 5. Comparativos

- Barras 7 pt Inicial vs Atual (sem texto descritivo redundante)
- Valores numéricos à direita das barras
- Cor por tendência (melhorou / piorou / estável)

### 6. Documentos emitidos

- Cards compactos (56 pt) com faixa brand superior
- **N versões** + última emissão + hash
- Grade 2 colunas (≤4 tipos) ou **3 colunas** (≥5 tipos)

### 7. Hierarquia tipográfica (`PUB_TYPE`)

| Nível | Uso | Tamanho |
|-------|-----|---------|
| coverTitle | Capa | 22 pt |
| coverPatient | Nome paciente | 16 pt |
| sectionTitle | Seções | 10 pt |
| valueLg | KPIs | 18 pt |
| label | Rótulos | 6.5 pt |
| body | Conteúdo | 9 pt |

### 8. Espaçamento

- `PUB_SPACE`: gaps 4–6 pt entre blocos e cards
- Rodapé reduzido para 22 pt
- Densidade técnica removida do rodapé (visual institucional)

### 9. Encerramento elegante

- **Quadro resumo** (7 indicadores incl. objetivos e alta)
- Narrativa de resumo
- Objetivos ✓ / •
- Card assinatura com borda brand
- Validação: hash + QR inline
- Mensagem institucional discreta

### 10. White label

- `applyClinicPalette` preservado — cores brand nos acentos
- Logo da clínica na capa e cabeçalho
- Nome fantasia na capa e rodapé

## Componentes reutilizados

- `drawLogoBox`, `drawLeftBand`, `drawMiniIcon`
- `composeAndBalance`, `measurePublishingBlock` (inalterados)
- `QRCode` (mesma lib do rodapé existente)
- Metadados existentes: `conclusion`, `professional`, `periodLabel`

## Ganhos

| Dimensão | Ganho |
|----------|-------|
| Legibilidade | Hierarquia clara documento → seção → valor |
| Identidade | Capa e cabeçalho com logo e brand da clínica |
| Institucional | Encerramento com quadro resumo + assinatura + QR |
| Densidade visual | Cards compactos, menos branco em documentos |
| Percepção | Documento “diagramado”, não exportado de sistema |

## Build

```bash
npm run build
```

**Resultado:** sucesso.

## Versão

Rodapé: **`D4`**

## Validação visual (checklist)

- [ ] Parece documento de clínica de referência
- [ ] Médico localiza seções via índice e cabeçalho
- [ ] Familiar compreende capa e quadro resumo
- [ ] Adequado para perícia (validação + organização)
- [ ] Páginas sem grandes áreas vazias

Gerar dossiê completo pelo botão **Gerar Dossiê** para inspeção final.
