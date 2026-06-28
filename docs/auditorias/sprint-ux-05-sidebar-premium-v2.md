# Sprint UX-05 — Sidebar Premium V2

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Sidebar definitiva do FisioOS — compacta, elegante e focada em produtividade.

## Build

`npm run build` — **aprovado** (exit 0).

## Escopo respeitado

**Nenhuma alteração** em banco, migrations, regras de negócio, permissões, rotas, queries, Core Clínico ou PDFs.

---

## Largura — antes / depois

| Modo | Antes | Depois |
|------|-------|--------|
| Expandida | ~280px | **228px** |
| Recolhida | ~72px | **60px** |

Constantes em `src/components/sidebar/sidebar-layout.ts` + CSS vars em `:root`.

---

## Componentes criados

| Arquivo | Função |
|---------|--------|
| `sidebar-layout.ts` | Tokens: larguras, alturas, gaps, storage key |
| `AppSidebar.tsx` | Sidebar completa (header, nav scroll, footer) |
| `index.ts` | Barrel export |

---

## Mudanças principais

### Cabeçalho (~40% menor)
- Layout horizontal: logo compacta (32px) + nome + slogan
- Removido banner/logo full-width
- Removido **"Powered by FisioOS"** da sidebar (permanece no login)

### Menu
- Itens `36px` de altura (antes ~44px)
- Grupos com gap reduzido
- Scroll **somente** na lista de módulos
- Header e footer fixos
- Hover/ativo minimalista (estilo Linear/Notion)

### Rodapé compacto
- Avatar + nome + cargo em uma linha
- ⚙ menu dropdown (foto, configurações, sair)
- Sem card grande, sem e-mail visível

### Modo recolhido
- Logo + ícones + tooltips
- Botões expandir/conta via ícones

---

## Arquivos alterados

| Arquivo |
|---------|
| `src/components/app-shell.tsx` |
| `src/components/sidebar/AppSidebar.tsx` *(novo)* |
| `src/components/sidebar/sidebar-layout.ts` *(novo)* |
| `src/components/sidebar/index.ts` *(novo)* |
| `src/lib/logo-aspect.ts` |
| `src/styles.css` |

---

## Compatibilidade

Layout principal usa `flex-1 min-w-0` — Dashboard, Agenda, Pacientes, Financeiro e Documentos adaptam-se automaticamente sem alterações por rota.

---

## Próxima sprint

**UX-06 — Dashboard Premium V2** — usar esta sidebar como base visual do sistema.
