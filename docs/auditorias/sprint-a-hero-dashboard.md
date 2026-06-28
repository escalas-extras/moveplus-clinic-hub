# Relatório — Sprint A: Hero Dashboard Premium

**Data:** 27/06/2026  
**Escopo:** Homepage premium do Painel Clínico (visual apenas)  
**Build:** `npm run build` — ✅ sucesso

---

## Objetivo

Transformar o Dashboard em homepage SaaS premium mantendo queries, permissões e funcionalidades intactas.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/routes/_authenticated/app/index.tsx` | Hero, KPIs premium, timeline agenda, ações rápidas, próximos atendimentos |
| `src/components/dashboard/DashboardHero.tsx` | **Novo** — banner hero com saudação, clínica, data, indicador do dia |
| `src/components/dashboard/AgendaTimeline.tsx` | **Novo** — agenda do dia em timeline |
| `src/components/dashboard/Sparkline.tsx` | **Novo** — sparklines + helper `sparkFromTrend` |
| `src/components/dashboard/index.ts` | **Novo** — barrel export |
| `src/components/layout/KpiCard.tsx` | Variante `premium`, sparklines, ícones/números maiores |
| `src/components/layout/KpiGrid.tsx` | Grid 3×2 para KPIs maiores (6 indicadores) |
| `src/styles.css` | Estilos hero, timeline, quick actions, upcoming cards |

**Não alterados:** banco, APIs, queries Supabase, permissões, rotas, regras de negócio.

---

## Implementação

### 1. Hero Banner Premium
- Componente `DashboardHero` substitui `PageHeader` no painel
- Saudação dinâmica + nome do usuário + badge da clínica
- Data formatada com ícone
- **Indicador do dia:** atendimentos hoje + hint contextual (semana / reavaliações)
- Gradiente Design Language (`--hero-primary`, `--hero-secondary`)
- CTAs Novo paciente / Agendar preservados

### 2. KPIs Premium
- `variant="premium"` — cards maiores (`min-h-[148px]`), padding ampliado
- Números `text-3xl`, ícones 44×44
- Tendência ↑ ↓ → (delta existente mantido)
- Sparklines em Pacientes e Documentos (derivados de `previous`/`current` — sem nova query)

### 3. Agenda do dia — Timeline
- `AgendaTimeline` substitui tabela
- Horários em bloco destacado + trilha vertical
- Cards por atendimento com status badge
- Link para agenda (mesmo destino anterior)

### 4. Ações rápidas
- Classe `dashboard-quick-action` — sombra, hover lift
- Ícones 48×48 com gradiente de marca
- Grid com gap maior (`gap-3`)

### 5. Refinamentos
- Próximos atendimentos: cards `dashboard-upcoming-card`
- Pendências: hover e bordas alinhadas ao DS
- Espaçamento `space-y-7/8` no AppShell do painel
- Transições 200ms uniformes

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Dashboard parece homepage SaaS premium | ✅ |
| Nenhuma funcionalidade alterada | ✅ |
| Queries/permissões intactas | ✅ |
| `npm run build` | ✅ |

---

## Validação manual sugerida

1. Abrir `/app` — hero, KPIs 3×2, timeline se houver agenda hoje  
2. Clicar KPIs e ações rápidas — mesmas rotas de antes  
3. Clínica nova — banner onboarding ainda aparece  
4. Sem atendimentos hoje — empty state da agenda  
