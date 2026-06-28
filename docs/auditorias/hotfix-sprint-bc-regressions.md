# HOTFIX — Regressões Sprints B e C

**Data:** 27/06/2026  
**Escopo:** Correção exclusiva de regressões funcionais e de layout introduzidas pelo Design System (Sprints B/C). Sem alteração de banco, APIs, queries ou regras de negócio.

---

## Resumo executivo

| Prioridade | Problema | Causa raiz | Status |
|------------|----------|------------|--------|
| P1 | Campos estreitos / texto ultrapassando borda | Token `clinical.field` com `display: flex` em inputs/textareas; wrappers sem `min-w-0`/`w-full` | ✅ Corrigido |
| P2 | Botão "Emitir e arquivar" (etapa 4) inconsistente | `canEmit` habilitava emissão enquanto profissional ainda carregava; botões sem `type="button"` | ✅ Corrigido |
| P3 | Formulários migrados (layout/validação) | Mesmas causas de P1 + gate de profissional em documentos | ✅ Validado |

**Build:** `npm run build` — ✅ sucesso

---

## P1 — Formulários (largura e alinhamento)

### Causa raiz

1. **`clinical.field` com `flex`** (Sprint B): aplicado a `<input>` e `<textarea>`, o `display: flex` impede o comportamento block natural. Em grids CSS (`FormGrid`), os campos encolhiam abaixo da largura da coluna e o texto podia transbordar.
2. **`ClinicalField` sem contenção de largura** (Sprint C): o wrapper `fos-clinical-field__control` não propagava `w-full` / `min-w-0` aos filhos (Input, Textarea, SelectTrigger).
3. **`FormGrid` / `FormSection` sem `min-w-0`**: itens de grid sem `min-width: 0` não encolhem corretamente em layouts flex/grid aninhados (cards InfoCard).

### Correções aplicadas

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/clinical-classes.ts` | `field`: `block w-full min-w-0 max-w-full box-border` (remove `flex`); `select`: mantém `flex` + `w-full min-w-0`; `textarea`: `break-words` |
| `src/components/layout/ClinicalField.tsx` | `w-full min-w-0` no root e no control |
| `src/components/layout/FormGrid.tsx` | `w-full min-w-0` no grid |
| `src/components/layout/FormSection.tsx` | `w-full min-w-0` no container de conteúdo |
| `src/styles.css` | Regras `.fos-clinical-field__control`, `.fos-form-grid`, `.fos-field textarea` (overflow-wrap), body do InfoCard em form sections |

### Formulários afetados (validação visual)

- `patient-form.tsx` — identificação, endereço, telefones, observações
- `documentos.tsx` — contratante (FormGrid + ClinicalField)
- `configuracoes.tsx` — campos longos (CREFITO, endereço)
- `agenda.tsx` — dialogs de agendamento
- `assessment-wizard.tsx`, `evolution-form.tsx` — FieldLabel / FormHeaderField (herdam tokens de input)

---

## P2 — Emitir e arquivar (etapa 4)

### Causa raiz

1. **Gate `canEmit` incompleto**: enquanto `useQuery` do profissional responsável estava em loading (`professionalInfo === undefined`), `canEmit` podia ser `true` (condição `professionalInfo && !professionalReady` era falsa). O botão aparecia habilitado, o clique executava `emit.mutate()`, mas a mutation falhava com toast de erro — comportamento percebido como "botão não funciona".
2. **Inconsistência preview vs emit**: preview usava `!professionalReady` (desabilitado durante loading); emit não — UX divergente na mesma etapa.
3. **Botões sem `type="button"`** (Sprint C / layout): risco de submit acidental se algum ancestral `<form>` existir; padrão HTML `submit` em contextos de formulário.

**Nota:** A lógica de emissão (`emit.mutationFn`), callbacks (`onClick={() => emit.mutate()}`), e validação de contratante **não foram alteradas** — apenas o gate de disabled e atributos de botão.

### Correções aplicadas

| Arquivo | Alteração |
|---------|-----------|
| `src/routes/_authenticated/app/documentos.tsx` | `isLoading: professionalLoading` na query; `missing` inclui "Validando profissional…" durante loading; `type="button"` nos botões do wizard; `loading={emit.isPending}` no botão emitir; preview alinhado ao mesmo gate de profissional |

### Comportamento restaurado

- Botão **desabilitado** enquanto profissional carrega ou há pendências (`missing`).
- Botão **habilitado** quando template + paciente + profissional OK (+ contratante se contrato/responsável).
- Clique dispara `emit.mutate()` → PDF → upload → insert → download + toast de sucesso.
- Modo suporte continua bloqueando emissão (`supportMode`).

---

## P3 — Validação de formulários modificados

| Área | Largura | Grid/col-span | Textarea | Obrigatórios | Responsivo |
|------|---------|---------------|----------|--------------|------------|
| Paciente (`patient-form`) | ✅ | ✅ `sm:col-span-2` via CSS existente | ✅ | ✅ asterisco/required | ✅ 1→2 cols |
| Documentos contratante | ✅ | ✅ | ✅ endereço | ✅ | ✅ |
| Configurações | ✅ | ✅ | ✅ | — | ✅ |
| Agenda dialogs | ✅ | ✅ | ✅ observação | ✅ | ✅ |
| Assessment / Evolution | ✅ (tokens) | ✅ | ✅ | — | ✅ |

---

## Arquivos alterados (lista completa)

```
src/components/layout/clinical-classes.ts
src/components/layout/ClinicalField.tsx
src/components/layout/FormGrid.tsx
src/components/layout/FormSection.tsx
src/routes/_authenticated/app/documentos.tsx
src/styles.css
docs/auditorias/hotfix-sprint-bc-regressions.md
```

---

## Validação funcional

| Teste | Resultado |
|-------|-----------|
| `npm run build` | ✅ Compilação sem erros |
| Tokens input/textarea/select | ✅ `block` + `w-full` + `min-w-0` |
| ClinicalField em grid 2 colunas | ✅ Campos ocupam coluna inteira; span-2 em sm+ |
| Textarea contratante/documentos | ✅ Quebra de linha; sem overflow horizontal |
| Emitir — profissional loading | ✅ Botão disabled + pendência listada |
| Emitir — dados completos | ✅ `emit.mutate()` acionável (lógica inalterada) |
| Modo suporte | ✅ Emissão bloqueada (sem regressão) |
| Wizard navegação Voltar/Avançar | ✅ `type="button"` explícito |

---

## O que não foi alterado

- Banco de dados / migrations  
- APIs Supabase / queries  
- Regras de negócio (validação de contratante, tipos de documento, merge tags)  
- Pipeline PDF (`buildPdf`, layouts premium/DS)  
- Dashboard, sidebar, hero (aprovados)
