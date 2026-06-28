# Sprint R1 — Correções Pós Design System

**Data:** 27/06/2026  
**Escopo:** Correções de regressões visuais/UX apenas — sem banco, APIs, queries, rotas ou fluxo clínico.  
**Build:** `npm run build` — **sucesso**

---

## 1. Regressões encontradas

| # | Área | Problema |
|---|------|----------|
| P1 | Campos de formulário | Inputs com `bg-white/95` sobre cards brancos — baixo contraste, sensação “branco sobre branco” |
| P1 | Command/autocomplete | Input transparente dentro do popover |
| P2 | Escalas funcionais | Grid comprimido (`sm:grid-cols-2 gap-2`), labels sobrepostos, EVA com ticks apertados |
| P2 | Clinical tabs | Abas de escalas sem respiro vertical |
| P3 | Modais clínicos | `max-w-lg` / `max-w-3xl` pequenos; scroll no modal inteiro em vez de corpo scrollável |
| P4 | PDF header | Altura fixa (`HEADER_H: 164`); telefone/e-mail/endereço truncados e invadindo layout |
| P5 | PDF logo | Box grande demais; pouco respiro entre logo e bloco textual |

---

## 2. Regressões corrigidas

### Prioridade 1 — Contraste dos campos
- Token `clinical.field` atualizado: fundo `#eef3f6`, borda mais forte, hover/focus premium, texto `slate-900`
- CSS contextual em cards (`fos-surface-card`, `fos-info-card`, `fos-form-section`)
- Command input com mesmo fundo e focus branco

### Prioridade 2 — Escalas funcionais
- `scales-panel.tsx`: grid `fos-scale-form-row`, labels com `word-break`, scroll interno confortável
- `eva-scale.tsx`: labels em 3 colunas responsivas, track mais alto, ticks com espaçamento
- `clinical-tabs.tsx`: tabs com wrap, padding e `mt-4` nos painéis

### Prioridade 3 — Modais premium
- Novo `ClinicalDialogContent` + header/body/footer fixos (`88vh × 90vw`)
- Aplicado em: pacientes (criar/editar/avaliação/evolução), agenda (novo/editar), escalas (aplicar)

### Prioridade 4 — PDF header dinâmico
- `measureDocumentHeaderHeight()` + `computeHeaderLayout()` em `header-engine.ts`
- Contatos com `wrapText` (sem truncar informações)
- `render.ts` usa altura medida para paginação
- Design system: `measureDsHeaderHeight()` + `render-document.ts` atualizado

### Prioridade 5 — Logo PDF
- `PDF_LOGO`: box 118×112, padding 10, inset 4
- Logo centralizada verticalmente no container dinâmico

---

## 3. Arquivos alterados

### UI / Layout
- `src/components/layout/clinical-classes.ts`
- `src/components/layout/ClinicalDialog.tsx` *(novo)*
- `src/components/layout/index.ts`
- `src/components/ui/command.tsx`
- `src/styles.css`

### Formulários / Escalas
- `src/components/clinical/eva-scale.tsx`
- `src/components/clinical/scales-panel.tsx`
- `src/components/clinical/clinical-tabs.tsx`

### Modais (rotas)
- `src/routes/_authenticated/app/pacientes/index.tsx`
- `src/routes/_authenticated/app/pacientes/$id.tsx`
- `src/routes/_authenticated/app/agenda.tsx`

### PDF
- `src/lib/pdf-engine/header-engine.ts`
- `src/lib/pdf-engine/render.ts`
- `src/lib/pdf-engine/tokens.ts`
- `src/lib/pdf-engine/design-system/components/header.ts`
- `src/lib/pdf-engine/design-system/render-document.ts`

---

## 4. Validação visual realizada

| Verificação | Método |
|-------------|--------|
| Build TypeScript/Vite | `npm run build` — exit 0 |
| Tokens de campo | Contraste `#eef3f6` vs card `#ffffff` via CSS dedicado |
| Modais | Estrutura header fixo + body scroll + footer fixo |
| PDF header | Lógica de medição com `wrapText` antes da composição de páginas |
| Escalas | Grid responsivo com classe `fos-scale-form-row` |

*Validação manual recomendada:* cadastro paciente, wizard avaliação (aba Escalas), dialog agenda, emissão PDF contrato com clínica com endereço/e-mail/telefone longos.

---

## 5. Riscos remanescentes

| Risco | Mitigação sugerida |
|-------|-------------------|
| Modais legacy não migrados (MRC, goniometria, biblioteca, global-search) | Migrar para `ClinicalDialogContent` em sprint futura se necessário |
| PDFs com conteúdo extremo (10+ linhas de rodapé legal) | Monitorar altura máxima; hoje expande sem truncar contatos |
| Campos em superfícies não-card (sidebar, fundo escuro) | Verificar contraste em telas auth/admin se reportado |
| `assessment-form` modo clássico ainda usa layout legado | Fora do escopo R1; wizard já usa modais premium |

---

## Impacto

Correções pontuais de regressão — **dashboard, sidebar, hero e componentes aprovados não foram alterados**. Apenas campos, escalas, modais clínicos selecionados e motor de cabeçalho PDF.
