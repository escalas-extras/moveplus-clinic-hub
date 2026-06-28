# Sprint UX-06 — Dashboard Premium V2

Relatório de entrega. Data: 2026-06-27.

## Objetivo

Transformar `/app` em Home Premium comercial — impacto visual, operação diária e ação rápida.

## Build

`npm run build` — **aprovado** (exit 0).

## Escopo respeitado

**Nenhuma alteração** em banco, migrations, permissões, Core Clínico ou PDFs.  
Query do painel ajustada apenas para exibir receita do mês e recebíveis vencidos (visual).

---

## Nova hierarquia (primeira dobra)

```
HomeHeroV2 (saudação + data + resumo do dia + CTAs)
    ↓
OperationalCardsGrid (6 cards acionáveis)
    ↓
Atenção agora | Acesso rápido
```

Em ~5 segundos o usuário vê: atendimentos hoje, pendências, financeiro e próxima ação.

---

## Componentes criados

| Componente | Função |
|------------|--------|
| `HomeHeroV2` | Hero compacto — saudação, chips do dia, ações |
| `OperationalCard` | Card acionável com valor, contexto, tendência |
| `OperationalCardsGrid` | Grid responsivo 2→3→6 colunas |
| `AttentionList` | Seção “Atenção agora” com prioridades |
| `QuickActionCard` | Chips discretos de acesso rápido |

---

## Cards operacionais

| Card | Navega para |
|------|-------------|
| Agenda de hoje | `/app/agenda` |
| Pacientes ativos | `/app/pacientes` |
| Reavaliações | `/app/reavaliacoes` |
| Financeiro do mês | `/app/financeiro` |
| Documentos recentes | `/app/documentos` |
| Pendências clínicas | `/app/documentos` |

---

## Atenção agora (prioridades)

- Atendimentos do dia (até 3)
- Reavaliações vencidas
- Documentos pendentes
- Recebimentos vencidos
- Evoluções sem assinatura

Estado vazio elegante quando não há pendências.

---

## Arquivos alterados

| Arquivo |
|---------|
| `src/routes/_authenticated/app/index.tsx` |
| `src/components/dashboard/HomeHeroV2.tsx` *(novo)* |
| `src/components/dashboard/OperationalCard.tsx` *(novo)* |
| `src/components/dashboard/AttentionList.tsx` *(novo)* |
| `src/components/dashboard/QuickActionCard.tsx` *(novo)* |
| `src/components/dashboard/index.ts` |
| `src/styles.css` |

---

## Removido da Home (redução de espaço morto)

- Grid KPI 6 colunas com sparklines
- Dupla seção Agenda do dia + Próximos atendimentos
- Pacientes recentes
- Card grande de ações rápidas + lista de pendências separada

Conteúdo consolidado nos novos componentes reutilizáveis.
