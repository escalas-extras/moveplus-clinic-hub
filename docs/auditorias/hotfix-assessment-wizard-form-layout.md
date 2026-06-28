# HOTFIX BLOQUEANTE — Assessment Wizard + Logo Sidebar

**Data:** 27/06/2026  
**Escopo:** Layout de formulários clínicos e branding da sidebar. Sem alteração de banco, APIs, fluxo clínico ou PDFs.

---

## 1. Assessment Wizard — causa real

### Problema visual confirmado
No modal **"Editar avaliação"**, os textareas da anamnese apareciam como blocos estreitos dentro do card, sem ocupar a largura útil.

### Causa raiz (não era apenas `clinical.field`)

O hotfix anterior em `clinical.field` (`block w-full`) **não resolvia** porque:

1. **Auto-grow agressivo no `Textarea`** (`src/components/ui/textarea.tsx`):
   - `useLayoutEffect` rodava em todo render e definia `height: auto` via inline style.
   - `overflow-hidden` + `resize-none` impediam resize manual.
   - O cálculo de altura ocorria **antes** do layout final do modal/grid, fixando dimensões intrínsecas estreitas.
   - **`width: 100%` não era forçada** no inline style durante o resize.

2. **`InfoCard` body sem contenção de largura**:
   - O wrapper dos filhos não propagava `w-full min-w-0` para `textarea`/`input`.

3. **`AssessmentWizard` sem classes de largura**:
   - Textareas usavam só `rounded-xl` / `mt-1.5`, sem `w-full min-w-0 max-w-full`.
   - Células de grid (`sm:grid-cols-2`) sem `min-w-0` nos filhos — colunas encolhiam.

4. **`ClinicalDialogBody`** sem regras de stretch para campos longos.

### Correções aplicadas

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/textarea.tsx` | Auto-grow **opt-in** (`autoGrow` prop); default: `width:100%` inline, `resize-y`, sem `overflow-hidden` |
| `src/components/layout/clinical-classes.ts` | Token textarea: `w-full min-w-0 resize-y leading-relaxed min-h-[5.5rem]` |
| `src/components/layout/InfoCard.tsx` | Body `fos-info-card__body w-full min-w-0` + seletores filhos |
| `src/components/layout/ClinicalDialog.tsx` | Body com `min-w-0 w-full` + stretch de textareas |
| `src/components/assessment-wizard.tsx` | `ASSESSMENT_TEXTAREA` constante; grids/células com `min-w-0 w-full`; todos os campos longos |
| `src/components/evolution-form.tsx` | Helper de campo com `w-full min-w-0` |
| `src/styles.css` | Regras globais `textarea.fos-field` em cards/modais + grid `min-w-0` |

### Campos corrigidos no wizard

- Queixa principal, HMA, HMP  
- Antecedentes pessoais/familiares  
- Medicamentos, Hábitos de vida  
- Diagnóstico clínico  
- Objetivos, Condutas, Recursos terapêuticos  
- Campos multiline via helper `Field()` (exame físico)  
- Evolução (form compartilhado)  
- Alta (via `ClinicalField` + CSS global)

### Comportamento do Textarea (pós-fix)

- `width: 100%` (classe + inline style)
- `min-height: 5.5rem`
- `resize: vertical`
- `line-height: 1.625`
- Contraste `#eef3f6` + borda (token `fos-field`)
- Padding `py-3 px-3.5`

---

## 2. Logo Sidebar — causa real

### Problema
Logo ainda pequena no card branco da sidebar, mesmo após hotfix anterior.

### Causa raiz

1. **Imagem sem dimensões até `onLoad`**: antes da detecção de aspect ratio, a `<img>` renderizava no tamanho intrínseco (pequeno).
2. **Padding excessivo** (16px lateral + px-2 interno) reduzia área útil.
3. **Container horizontal baixo** (76px) limitava `maxHeight` de logos wide.
4. **Faltava fallback CSS** para garantir 75–85% de largura antes/depois do JS.

### Correções

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/logo-aspect.ts` | Container maior (88/96/104px); largura horizontal 85%; padding reduzido; `minWidth` 75% |
| `src/components/logo-box.tsx` | CSS fallback `w-[85%] max-w-[85%]`; padding interno menor; altura default 88px |
| `src/styles.css` | Regras `[data-logo-aspect]` por proporção com `!important` seguro |

---

## 3. Validação visual (descrição)

### Modal "Editar avaliação"
1. Abrir prontuário → editar avaliação existente (modo Wizard).
2. Navegar até **Anamnese**.
3. **Esperado:** cada textarea ocupa 100% da largura interna do InfoCard (borda a borda do padding do card).
4. Campos em grid 2 colunas (Antecedentes, Medicamentos) ocupam 50% cada em `sm+`, sem encolher.
5. Textarea redimensionável verticalmente; texto legível com line-height confortável.
6. Modal mantém largura grande (`ClinicalDialogContent`); footer sticky do wizard preservado.

### Sidebar expandida
1. Logo horizontal ocupa ~**85%** da largura útil do card branco.
2. Logo quadrada usa até **96px** de altura.
3. Sem corte, sem distorção (`object-contain`).
4. Monograma fallback inalterado quando sem logo.

### Build
```
npm run build — ✅ sucesso
```

---

## 4. Arquivos alterados

```
src/components/ui/textarea.tsx
src/components/layout/clinical-classes.ts
src/components/layout/InfoCard.tsx
src/components/layout/ClinicalDialog.tsx
src/components/assessment-wizard.tsx
src/components/evolution-form.tsx
src/lib/logo-aspect.ts
src/components/logo-box.tsx
src/styles.css
docs/auditorias/hotfix-assessment-wizard-form-layout.md
```

---

## 5. O que não foi alterado

- Banco / migrations / APIs / queries  
- Regras de negócio e fluxo clínico  
- PDFs e documentos  
- Lógica de persistência do Assessment Wizard
