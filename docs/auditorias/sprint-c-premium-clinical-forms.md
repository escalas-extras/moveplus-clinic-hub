# Sprint C — Premium Clinical Forms

**Data:** 27/06/2026  
**Escopo:** UX/UI de formulários clínicos apenas — sem banco, APIs, queries, validações, builders ou PDFs.  
**Build:** `npm run build` — **sucesso**

---

## Resumo

Criação de primitivos compartilhados de formulário clínico e migração dos fluxos principais para blocos premium (`FormSection`), campos padronizados (`ClinicalField`), labels hierárquicas (`FieldLabel`) e ações consistentes (`FormFooter`).

---

## Formulários impactados

| Módulo | Arquivo | Melhorias |
|--------|---------|-----------|
| **Pacientes** | `patient-form.tsx` | 4 `FormSection` (identificação, endereço, telefones, observações), `FormGrid`, `ClinicalField`, `FormFooter` |
| **Avaliações** | `assessment-wizard.tsx` | `FormHeaderField`, `FieldLabel` compartilhados (removidos helpers locais duplicados) |
| **Evoluções** | `evolution-form.tsx` | `FormHeaderField`, `FieldLabel` compartilhados |
| **Reavaliações** | `ReassessmentWorkspace.tsx` | Herda wizard premium (sem alteração de lógica) |
| **Altas** | `DischargeWizard.tsx`, `discharge-panel.tsx` | `FormSection` nos steps, `ClinicalField` nos campos de texto |
| **Agenda** | `agenda.tsx` | Dialogs novo/editar com `ClinicalField`, `FormGrid`, `FormFooter`, botões premium |
| **Documentos** | `documentos.tsx` | Formulário contratante com `ClinicalField` + `FormGrid`, radio premium |
| **Configurações** | `configuracoes.tsx` | `FormSection`, `ClinicalField`, `InfoCard` preview, `FormFooter` |

---

## Componentes reutilizados / criados

### Criados (`src/components/layout/`)

| Componente | Função |
|------------|--------|
| **ClinicalField** | Label + hint/error/success + required/optional + loading + highlight no focus |
| **FieldLabel** | Hierarquia: obrigatório (*), opcional, estado preenchido |
| **FormHeaderField** | Campo somente leitura no cabeçalho do prontuário |
| **FormSection** | Card premium para agrupar campos relacionados |
| **FormGrid** | Grid responsivo 1/2/3 colunas |
| **FormFooter** | Barra de ações (Salvar, Cancelar, Voltar, etc.) |

### Reutilizados (Sprint B + UI)

- `InfoCard`, `PrimaryActionButton`, `SecondaryActionButton`
- `Input`, `Textarea`, `Select`, `Calendar`, `Command`
- `Checkbox`, `Radio`, `Switch` — tokens premium (`clinical.checkbox`, `clinical.radio`, `clinical.switch`)
- `clinical.uploadZone` — upload de logo
- `Button.loading` — feedback de salvamento

---

## Melhorias visuais

| Área | Entrega |
|------|---------|
| **Layout** | Formulários em blocos `FormSection` em vez de sequência plana de campos |
| **Campos** | Padronização via `ClinicalField` + tokens `fos-field` |
| **Labels** | Obrigatório, opcional, hint, error, success unificados |
| **Navegação** | Grids consistentes, espaçamento `gap-4`, fluxo por seções |
| **Validação visual** | Erro/success elegantes; required não preenchido em destaque |
| **Loading** | Spinner em `ClinicalField` e `Button.loading` |
| **Ações** | `FormFooter` com posicionamento consistente |
| **Microinterações** | Label destaca no focus do campo; upload com hover/focus |
| **Mobile** | Grids responsivos `sm:col-span-2`, dialogs `max-w-lg` |

---

## Impacto esperado na experiência clínica

| Aspecto | Impacto |
|---------|---------|
| **Cadastro de pacientes** | Formulário longo dividido em blocos lógicos — menos fadiga visual |
| **Avaliação / evolução** | Cabeçalhos e labels consistentes entre módulos — leitura mais rápida |
| **Agenda** | Dialogs alinhados ao design system — sensação profissional no dia a dia |
| **Alta e documentos** | Campos de texto e contratante com mesma linguagem visual |
| **Configurações** | Identidade da clínica editável em cards premium |
| **Manutenção** | Um único `ClinicalField` substitui 5+ helpers `Field` locais |

Nenhuma regra de negócio, query ou validação foi alterada — apenas apresentação e composição visual.

---

## Validação

```bash
npm run build
# Exit code: 0
```
