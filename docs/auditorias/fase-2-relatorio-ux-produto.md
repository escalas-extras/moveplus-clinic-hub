# Fase 2 — Relatório de Auditoria UX e Produto

**Projeto:** FisioOS (`moveplus-clinic-hub`)  
**Data:** 27/06/2026  
**Escopo:** Dashboard, Agenda, Pacientes, Avaliações, Evoluções, Reavaliações, Altas, Documentos  
**Restrições respeitadas:** sem migrations, banco, APIs ou alteração de regras de negócio  
**Build:** `npm run build` — **OK**

---

## Resumo executivo

A Fase 2 elevou a consistência visual e de estados entre os módulos clínicos principais, introduziu componentes compartilhados reutilizáveis e padronizou tratamento de erro/loading/empty em toda a superfície auditada. O produto passa de ~70% de alinhamento visual premium para ~85%, com gaps restantes concentrados em mobile (tabelas), fluxos indiretos de listagens clínicas e módulos fora do escopo (Financeiro, Biblioteca).

**Nota geral do produto: 7,8 / 10**

---

## Problemas encontrados

### Consistência visual

| # | Problema | Módulos afetados |
|---|----------|------------------|
| 1 | Headers heterogêneos (`text-2xl`, `PageHeader`, títulos inline) | Dashboard clínico, Documentos, listagens antigas |
| 2 | Cards com bordas/sombras diferentes (`Card` shadcn vs `clinical.card`) | Documentos, Dashboard clínico |
| 3 | KPIs locais duplicados (`Kpi` inline) vs `KpiCard`/`KpiGrid` | Dashboard clínico |
| 4 | Tabelas sem wrapper — risco de scroll horizontal na página | Avaliações, Evoluções |
| 5 | Links para prontuário inconsistentes (estilo, área de toque) | Avaliações, Evoluções |
| 6 | Dois rótulos “Painel Clínico” (`/app` vs `/app/dashboard-clinico`) | Dashboard |

### UX e estados

| # | Problema | Módulos afetados |
|---|----------|------------------|
| 7 | Queries sem estado de erro visível — falha silenciosa | Todos os módulos auditados |
| 8 | Empty states ad hoc (texto simples “Sem dados”) | Dashboard clínico |
| 9 | Listagens clínicas (Avaliações/Evoluções) redirecionam ao paciente — fluxo indireto | Avaliações, Evoluções |
| 10 | Documentos: passos 1–2 sem `SearchField`/`EmptyState` padronizados | Documentos |
| 11 | Ícone `Search` importado mas não utilizado | Documentos |

### Componentização

| # | Problema |
|---|----------|
| 12 | Duplicação de padrão erro/retry em cada rota |
| 13 | Duplicação de wrapper de tabela com overflow |
| 14 | Duplicação de link para prontuário |
| 15 | Dois `AppShell`: global (`app-shell.tsx`) vs página clínica (`layout/AppShell.tsx`) — propósitos distintos, nomenclatura confusa |

### Performance

| # | Problema | Severidade |
|---|----------|------------|
| 16 | Altas: `statsQ` dispara N queries por paciente (amostra 40) | Média |
| 17 | Painel: query única com 15+ subconsultas paralelas — aceitável, mas pesada | Baixa |
| 18 | Listagens sem virtualização (>200 rows) | Baixa |

### Acessibilidade e mobile

| # | Problema |
|---|----------|
| 19 | Links/botões de lista com altura < 44px em alguns contextos |
| 20 | Tabelas em mobile dependem de scroll horizontal (`ClinicalDataTable`) |
| 21 | Botões de filtro pequenos (`size="sm"`) em Reavaliações |

### White label

| # | Problema |
|---|----------|
| 22 | Painel operacional aplica `brand.primaryColor` nos CTAs — correto |
| 23 | Dashboard clínico e listagens usam tokens fixos — parcialmente alinhado |
| 24 | PDFs já migrados para engine premium (Sprint 8A/8B) — fora do escopo desta fase |

---

## Problemas corrigidos

### Componentes compartilhados criados

| Componente | Arquivo | Função |
|------------|---------|--------|
| `QueryErrorState` | `src/components/layout/QueryErrorState.tsx` | Erro padronizado com retry e `role="alert"` |
| `ClinicalDataTable` | `src/components/layout/ClinicalDataTable.tsx` | Scroll horizontal contido em tabelas |
| `PatientRecordLink` | `src/components/layout/PatientRecordLink.tsx` | Link para prontuário (min 44px, focus ring) |

Exportados em `src/components/layout/index.ts`.

### Alterações por módulo

| Módulo | Correções aplicadas |
|--------|---------------------|
| **Dashboard (`/app`)** | `QueryErrorState` no query principal |
| **Dashboard clínico** | Migração completa para `AppShell` + `PageHeader` (“Indicadores Clínicos”), `KpiGrid`/`KpiCard`, `PageSection`, `EmptyState` nos gráficos, `QueryErrorState`, remoção de `Kpi` local |
| **Agenda** | `QueryErrorState` na query de appointments |
| **Pacientes** | `QueryErrorState` com retry duplo (lista + KPIs) |
| **Avaliações** | `AppShell`, `PageHeader`, `ClinicalDataTable`, `PatientRecordLink`, `QueryErrorState`, `EmptyState` |
| **Evoluções** | Idem Avaliações + link na timeline |
| **Reavaliações** | `QueryErrorState` |
| **Altas** | `QueryErrorState` (pending + discharges) |
| **Documentos** | `AppShell clinical` + `PageHeader`, cards `clinical.card`, `SearchField`/`EmptyState` nos passos, fechamento JSX corrigido, import `Search` removido |

### Build

- `npm run build` executado com sucesso após todas as alterações.

---

## Nota por módulo

| Módulo | Nota | Comentário |
|--------|------|------------|
| Dashboard operacional | **8,2** | Premium, white label nos CTAs; query pesada mas UX sólida |
| Dashboard clínico | **7,5** | Agora alinhado visualmente; gráficos ainda básicos |
| Agenda | **8,0** | Views completas, KPIs do dia; mobile da grade ainda denso |
| Pacientes | **8,5** | Referência de layout split + filtros; falta vista card mobile na tabela |
| Avaliações | **7,5** | Listagem padronizada; fluxo indireto permanece |
| Evoluções | **7,5** | Idem Avaliações |
| Reavaliações | **8,0** | Split layout premium; filtros poderiam ser tabs |
| Altas | **8,0** | Workspace premium; stats query pode ser otimizada |
| Documentos | **7,8** | Wizard claro; passos 1–2 melhorados; preview modal básico |

---

## Oportunidades futuras (fora do escopo desta fase)

1. **Vista card em mobile** para tabelas clínicas (Avaliações, Evoluções, Pacientes) — eliminar scroll horizontal perceptível.
2. **Ação direta nas listagens** — “Nova avaliação” / “Nova evolução” sem passar pelo prontuário (requer decisão de produto).
3. **Renomear navegação** — “Painel” vs “Indicadores Clínicos” para eliminar ambiguidade.
4. **Unificar nomenclatura AppShell** — `ClinicalPageShell` vs `AppLayout` para evitar confusão de imports.
5. **Migrar Financeiro, Biblioteca, Configurações** para o design system premium.
6. **Virtualização** (`@tanstack/react-virtual`) em listas >100 itens.
7. **Otimizar `statsQ` em Altas** — agregar via RPC ou view materializada (requer backend).
8. **Notificações** — implementar painel do sino ou remover affordance vazia.
9. **Skeleton por seção** em vez de página inteira onde queries são independentes.
10. **Testes visuais** (Chromatic/Playwright) para regressão de layout.

---

## Melhorias restantes — backlog priorizado

### P0 — Impacto alto, esforço baixo/médio

| # | Item | Módulo |
|---|------|--------|
| 1 | Vista card responsiva substituindo tabela em `<md` | Avaliações, Evoluções, Pacientes |
| 2 | Renomear item de menu “Dashboard clínico” → “Indicadores” | Navegação |
| 3 | Aumentar touch targets dos filtros (`min-h-[44px]`) | Reavaliações, Altas |
| 4 | `QueryErrorState` nos módulos fora do escopo (Financeiro, Recibos) | Gestão |

### P1 — Impacto alto, esforço médio

| # | Item | Módulo |
|---|------|--------|
| 5 | Ação rápida “Abrir prontuário” + CTA secundário na listagem | Avaliações, Evoluções |
| 6 | Migrar Financeiro para `AppShell` + `PageHeader` | Financeiro |
| 7 | Consolidar botões primários — sempre `PrimaryActionButton` + brand | Global |
| 8 | Lazy load de gráficos Recharts (code splitting) | Dashboard clínico |

### P2 — Impacto médio, esforço alto

| # | Item | Módulo |
|---|------|--------|
| 9 | Virtualização de listas longas | Pacientes, Agenda |
| 10 | Reduzir cliques para registrar avaliação/evolução | Fluxo clínico |
| 11 | Renomear/refatorar dual AppShell | Arquitetura UI |
| 12 | Agregação server-side de KPIs de altas | Altas (backend) |

---

## Arquivos alterados nesta fase

```
src/components/layout/QueryErrorState.tsx      (novo)
src/components/layout/ClinicalDataTable.tsx    (novo)
src/components/layout/PatientRecordLink.tsx    (novo)
src/components/layout/index.ts                 (exports)
src/routes/_authenticated/app/index.tsx
src/routes/_authenticated/app/dashboard-clinico.tsx
src/routes/_authenticated/app/agenda.tsx
src/routes/_authenticated/app/pacientes/index.tsx
src/routes/_authenticated/app/avaliacoes.tsx
src/routes/_authenticated/app/evolucoes.tsx
src/routes/_authenticated/app/reavaliacoes.tsx
src/routes/_authenticated/app/altas.tsx
src/routes/_authenticated/app/documentos.tsx
```

---

## Conclusão

A Fase 2 cumpriu o objetivo de **elevar o padrão visual e de UX** sem introduzir funcionalidades novas nem alterar backend. Os módulos clínicos principais agora compartilham:

- Layout de página (`AppShell clinical` + `PageHeader`)
- Estados de loading (`ClinicalSkeleton`)
- Estados vazios (`EmptyState`)
- Estados de erro (`QueryErrorState`)
- Tabelas contidas (`ClinicalDataTable`)
- Links de prontuário acessíveis (`PatientRecordLink`)

O produto está **pronto para beta ampliado** com ressalvas em mobile e fluxos indiretos de registro clínico — itens documentados no backlog P0/P1 para a próxima iteração.
