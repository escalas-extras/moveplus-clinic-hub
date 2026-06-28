# Relatório — Sidebar Premium FisioOS (Branding UI)

**Data:** 27/06/2026  
**Escopo:** Visual/estrutura da Sidebar e AppShell  
**Build:** `npm run build` — ✅ sucesso

---

## Objetivo

Elevar a percepção visual do produto redesenhand o AppShell como **Clinical Command Center**, com branding superior, logo integral e navegação reorganizada por contexto.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/app-shell.tsx` | Sidebar premium, agrupamento de menus, identity block, footer de usuário, mobile overlay, touch targets |
| `src/components/logo-box.tsx` | Tamanhos `sidebar-banner` (248×72) e `mark` (44×44), suporte `fullWidth`, banner horizontal |
| `src/components/clinic-logo.tsx` | Variantes `banner` / `mark` / `inline` — logo não mais forçada em quadrado pequeno |
| `src/styles.css` | `.sidebar-identity-glow`, refinamento barra ativa (3 px), ícone ativo com `--sidebar-primary` |

**Não alterados (conforme regras):** banco, migrations, APIs, rotas, regras de negócio, PDFs, módulos internos.

---

## Implementação

### 1. Branding superior premium

- **Identity block** dedicado no topo da sidebar (visível desktop e drawer mobile).
- Logo em faixa horizontal **`sidebar-banner`** (248×72 pt lógicos, `fullWidth`, `object-contain`).
- Estado colapsado usa **`mark`** (44×44) — monograma/ícone, sem espremer logo wide.
- Nome da clínica, slogan e badge *Powered by FisioOS* alinhados abaixo da logo.
- Mobile topbar: logo `inline` + nome + slogan (sem crop).

### 2. Clinical Command Center — agrupamentos

| Zona | Itens |
|------|-------|
| **Visão Geral** | Painel, Indicadores |
| **Atendimento** | Agenda, Pacientes |
| **Prontuário** | Avaliações, Evoluções, Reavaliações, Altas |
| **Gestão** | Emissão, Modelos, Biblioteca, Financeiro, Recibos, Relatórios |
| **Sistema** | Home Care, Marketing, Diferenciais, Profissionais, Usuários, Configurações |

Rotas, permissões (`adminOnly`, `feature`, `superAdminOnly`) e filtros de plano **preservados**.

### 3. Navegação refinada

- Largura expandida: **280 px** | colapsada: **72 px**.
- Item ativo: fundo `sidebar-accent`, barra lateral 3 px `--sidebar-primary`, ícone accent.
- Hover suave, tipografia 13.5 px medium/semibold.
- Touch targets **≥ 44 px** (`min-h-[44px]`, botões mobile `h-11`).
- Tooltips no modo colapsado.

### 4. Rodapé da sidebar

- Card compacto: avatar, nome, **papel** (Proprietário, Administrador, Profissional…).
- Link **Configurações** (admins) com chevron.
- Botão **Sair** discreto.
- Modo colapsado: avatar + config + sair com tooltips.

### 5. Responsividade

- Drawer mobile 280 px com overlay escuro (`backdrop-blur`).
- `overflow-x-hidden` + `overscroll-contain` na nav — sem overflow horizontal.
- Identity block visível no drawer (antes só `lg:flex`).

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Sidebar parece SaaS premium | ✅ |
| Logo inteira, sem corte | ✅ (`object-contain`, banner horizontal) |
| Logo não comprimida | ✅ (container dedicado por variante) |
| Menu mais organizado | ✅ (5 zonas contextuais) |
| Funcionalidades intactas | ✅ (mesmas rotas e filtros) |
| `npm run build` | ✅ |

---

## Validação manual sugerida

1. Sidebar expandida — logo horizontal e vertical.
2. Recolher menu — monograma centralizado.
3. Mobile — abrir drawer, verificar logo e touch targets.
4. Navegar Painel, Pacientes, Configurações — estados ativos.
5. Usuário admin vs profissional — link Configurações condicional.

---

## Referência

Design Language Fase 1: `docs/design-language/FISIOOS_DESIGN_LANGUAGE.md` (§10 Sidebar).
