# Fase Final — Acabamento do Core Clínico

**Projeto:** FisioOS (`moveplus-clinic-hub`)  
**Data:** 27/06/2026  
**Escopo:** Core Clínico completo (Dashboard, Agenda, Pacientes, Avaliações, Evoluções, Reavaliações, Altas, Documentos, PDFs clínicos)  
**Restrições:** sem migrations, banco, APIs, regras de negócio ou funcionalidades novas  
**Build:** `npm run build` — **OK**

---

## Declaração oficial

**O Core Clínico do FisioOS está concluído e pronto para entrar em fase de expansão** (Financeiro, SaaS e Backoffice).

Não há pendências críticas bloqueantes. Itens restantes são melhorias incrementais de médio prazo (documentados abaixo).

---

## Ajustes realizados

### Visual e UX

| Área | Ajuste |
|------|--------|
| `PageHeader` / `EmptyState` | Cores white-label via tokens `primary` (removido emerald fixo) |
| Tabelas | `ClinicalDataTable` em Pacientes e Painel (agenda do dia) |
| Hover de linhas | Padronizado `hover:bg-primary/[0.03]` |
| Reavaliações / Altas | `SelectableListRow` compartilhado; touch targets 44px nos filtros |
| Evoluções | Sidebar oculta quando lista vazia; grid alinhado (320px); labels “Sem assinatura” unificados |
| Documentos | Cards dos passos 3–4 alinhados com `clinical.card` |
| Agenda | `SearchField` padronizado |
| Navegação | **Altas** adicionada ao menu Prontuários |
| Status agendamento | Módulo compartilhado `appointment-status.ts` (Painel + Agenda) |
| Indicadores | KPIs e gráficos usam `useBranding()` (cores da clínica) |
| Pacientes | Import `Skeleton` corrigido (bug de runtime) |

### White Label

| Área | Ajuste |
|------|--------|
| Dashboard clínico | KPIs e gráficos Recharts com `brand.primaryColor` / `brand.secondaryColor` |
| Componentes layout | Eyebrow e ícones de empty state seguem `--primary` |
| PDF header | Subtítulo fixo “Fisioterapia” (não duplica razão social) |
| PDF logo | `clearLogoBackdrop()` aplicado antes do desenho |
| PDF paleta | Cores da clínica via `applyClinicPalette` (já existente) |

### PDFs e impressão

| Área | Ajuste |
|------|--------|
| Reserva de espaço | Assinatura + QR reservados na composição (evita overlap) |
| QR Code | Posicionado à esquerda, acima do rodapé; fallback com hash completo |
| Rodapé | Removida versão interna `v8B.1` dos PDFs clínicos |
| Data emissão | Card usa `referenceValue` clínico (data da avaliação/alta/sessão) |
| Páginas 2+ | Cabeçalho compacto (`drawCompactRunningHeader`) com clínica + paciente |
| Seções clínicas | Títulos sem ícone de contrato; sem underline de contrato |
| CREFITO | `formatProfessionalRegistry()` unificado — Avaliação, Evolução, Alta |
| Evolução / Alta | Linha “Registro” nos grids de identificação |
| Assinatura | Exibe profissão + CREFITO formatado |
| Checks | Labels de bloco renderizados (Apresentação, Inspeção, etc.) |
| Ficha geriátrica | Subseções com label mesmo sem parágrafo de texto |
| Compare-table | Zebra com altura dinâmica; trends com palavras (melhorou/piorou/estável) |
| Checkbox | Marcação com “X” em preto (impressão P&B) |

---

## Arquivos alterados

### Novos
```
src/components/layout/SelectableListRow.tsx
src/lib/appointment-status.ts
docs/auditorias/fase-final-core-clinico.md
```

### Modificados
```
src/components/layout/PageHeader.tsx
src/components/layout/EmptyState.tsx
src/components/layout/index.ts
src/components/app-shell.tsx
src/lib/appointment-status.ts
src/lib/pdf-builders-shared.ts
src/lib/clinical-pdf-builders.ts
src/lib/pdf-engine/header-engine.ts
src/lib/pdf-engine/footer-engine.ts
src/lib/pdf-engine/images.ts
src/lib/pdf-engine/render.ts
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

## Problemas encontrados

| # | Problema | Severidade |
|---|----------|------------|
| 1 | PDF: assinatura/QR sobrepostos ao conteúdo | Crítico |
| 2 | PDF: cabeçalho só na página 1 | Alto |
| 3 | PDF: ícone de contrato em seções clínicas | Médio |
| 4 | PDF: CREFITO inconsistente entre header/grid/assinatura | Médio |
| 5 | PDF: labels de checks e subseções geriátricas omitidos | Médio |
| 6 | PDF: versão interna exposta ao paciente | Baixo |
| 7 | UI: emerald hardcoded vs white-label | Médio |
| 8 | UI: Altas inacessível no menu | Alto |
| 9 | UI: `Skeleton` não importado em Pacientes | Alto (bug) |
| 10 | UI: status agendamento divergente Painel/Agenda | Médio |
| 11 | UI: labels evolução “Rascunho” vs “Sem assinatura” | Baixo |
| 12 | UI: duplicação ScheduleRowItem / PatientRow | Baixo |
| 13 | Impressão P&B: checks e trends só por cor | Médio |

---

## Problemas corrigidos

Todos os 13 problemas acima foram endereçados nesta fase, exceto itens de médio prazo listados em “Pendentes não críticos”.

---

## Itens pendentes (não críticos)

| # | Item | Motivo |
|---|------|--------|
| 1 | Vista card mobile para tabelas | Esforço médio; scroll contido já mitiga |
| 2 | Cabeçalho repetido em tabelas compare multi-página | Requer split de átomos compare-table |
| 3 | Modo EVA dedicado P&B (hachuras) | Melhoria visual incremental |
| 4 | `applyClinicPalette` sem mutação global | Refatoração de concorrência |
| 5 | Virtualização listas >200 itens | Performance futura |
| 6 | Migrar Financeiro/Biblioteca para layout premium | Fora do Core Clínico |
| 7 | Agenda: touch targets em botões semana/mês | Baixa frequência |

Nenhum item acima bloqueia expansão para Financeiro, SaaS ou Backoffice.

---

## Checklist de validação

| Item | Status |
|------|--------|
| Auditoria visual (alinhamentos, tipografia, grids, responsividade) | ✅ |
| UX (labels, feedback, redundâncias) | ✅ |
| White label (logo, nome, cores, CREFITO nos PDFs) | ✅ |
| Impressão A4 multipágina (margens, header/footer, QR, hash) | ✅ |
| PDFs Avaliação, Evolução, Reavaliação, Alta | ✅ |
| Performance (deduplicação leve) | ✅ |
| `npm run build` | ✅ |

---

## Próxima fase recomendada

1. **Financeiro + Recibos** — layout premium + white label
2. **SaaS / Admin** — consolidar admin-saas e planos
3. **Backoffice** — profissionais, usuários, configurações avançadas

O núcleo clínico (prontuário, documentos, indicadores operacionais) está **congelado para feature work** até conclusão das fases de expansão.
