# Auditoria UX — FisioOS (somente leitura)

Análise baseada em `app-shell`, rotas principais, design system (`styles.css`), componentes clínicos e padrões de interação. Nenhum arquivo foi alterado.

---

## Síntese executiva

O FisioOS tem **base visual premium sólida** (tokens, sidebar escura, painel operacional rico, wizard de documentos) e **atende bem o fluxo centrado no paciente**. Os maiores gaps vs. referências (Linear, Notion, WebPT) estão em **nomenclatura duplicada**, **listagens clínicas que não executam ações**, **inconsistência entre telas** e **mobile/tabelas**.

---

## Classificação por dimensão

### Fluxo das telas — **ALTO**

**Pontos fortes**
- Hub natural: **Painel → Paciente → Prontuário** (avaliação/evolução/documentos).
- **Documentos** com wizard em 4 passos (Modelo → Paciente → Visualização → Emitir) — fluxo claro, próximo ao Stripe em intenção.
- **Agenda** com views dia/semana/mês e prefill de slot ao clicar.

**Problemas**
- **Avaliações / Evoluções / Reavaliações** no menu são **índices read-only** que redirecionam ao paciente — fluxo indireto (3–5 cliques para registrar).
- **Dois “Painéis”**: `/app` (operacional) e `/app/dashboard-clinico` (indicadores), ambos com título “Painel Clínico” — desorienta.
- **Financeiro + Recibos** no menu sem relação visual clara (recibos de paciente vs. Extra Flow).

**Comparativo**
- **WebPT / SimplePractice**: ações partem do paciente ou da agenda — similar no prontuário, mas SP costuma permitir “nova evolução” direto da listagem.
- **Notion**: FisioOS é mais guiado (melhor para clínica), menos flexível.

---

### Navegação — **ALTO**

**Pontos fortes**
- Sidebar agrupada (Principal, Prontuários, Documentos, Gestão, Sistema).
- **Busca global ⌘K** (inspirada em Linear/Raycast).
- Sidebar recolhível; filtro por plano/feature.

**Problemas**
- **15+ itens** para admin — carga cognitiva alta vs. **Linear** (nav enxuta).
- **Sistema** mistura Home Care, Marketing, Diferenciais — baixa frequência no mesmo nível que Agenda.
- Sino de notificações **sem ação aparente** — affordance vazia.
- **Reavaliações** no menu vs. pendências no painel — duplicação parcial de propósito.

---

### Número de cliques — **ALTO**

| Tarefa | Cliques típicos | Referência |
|--------|-----------------|------------|
| Nova avaliação | Menu → Pacientes → Paciente → Nova avaliação → Wizard (7 passos) | **4–6+** vs. SimplePractice ~2–3 |
| Nova evolução | Idem via prontuário | **4+** |
| Emitir documento | Documentos → 4 passos wizard | **~6–8** — aceitável (Stripe-like) |
| Agendar | Painel “Agendar” ou Agenda → dialog | **2–3** — bom |
| Ver reavaliação atrasada | Painel KPI → Reavaliações → Abrir paciente | **3** — não inicia reavaliação |

---

### Consistência visual — **ALTO**

**Pontos fortes**
- Design system documentado em `styles.css` (Inter, escala 32/24/16/14, paleta petróleo/esmeralda).
- Painel operacional e **Pacientes** usam layout premium (`PageHeader`, `InfoCard`).
- Badges de status (rascunho/assinada) consistentes entre listagens.

**Problemas**
- **Headers heterogêneos**: `text-[2rem]` (avaliações), `text-2xl font-bold` (biblioteca), `PageHeader` (recibos/pacientes), `p-6 max-w-5xl` (reavaliações).
- **Financeiro** ainda usa padrão tabular antigo vs. painel premium.
- Botões primários alternam inline `style={{ background: brand.primaryColor }}` e classes `bg-primary`.

**Comparativo**
- **Stripe / Linear**: consistência quase total — FisioOS está ~70% alinhado, com telas “de gerações diferentes”.

---

### Hierarquia das informações — **MÉDIO**

**Pontos fortes**
- Painel: KPIs → Agenda hoje → Atividades — ordem correta para operação.
- Wizard de avaliação: 7 etapas numeradas com progresso.
- Reavaliações: triagem Atrasadas / A vencer / Concluídas.

**Problemas**
- Prontuário do paciente concentra **muitas tabs** (timeline, avaliações, evoluções, documentos, alta…) — risco de sobrecarga.
- Listagens clínicas mostram status mas **não priorizam pendências** (rascunhos no topo).

---

### Layout — **MÉDIO**

- Grid responsivo no painel e indicadores — bom.
- Documentos wizard ocupa bem a largura.
- **Reavaliações** limitada a `max-w-5xl` — sensação de tela “secundária”.
- Prontuário: layout denso, muitos botões por linha (Ver/Baixar/Imprimir/Assinar).

---

### Responsividade — **ALTO**

**Pontos fortes**
- Top bar mobile + drawer sidebar.
- Colunas de tabela ocultas progressivamente (`hidden md:table-cell`).

**Problemas**
- Tabelas dominantes **sem transformação em cards** no mobile — scroll horizontal provável.
- Agenda semana/mês provavelmente apertada em telas pequenas (grid temporal).
- Busca ⌘K escondida em breakpoint `< xl` no desktop — só ícone.

---

### Acessibilidade — **ALTO**

**Pontos fortes**
- `aria-label` em menu mobile, busca, agenda nav.
- EVA com `role="slider"` e `aria-valuetext`.
- Form components com `aria-invalid`.

**Problemas**
- Status por **cor + badge** sem texto alternativo consistente.
- Tabelas sem padrão robusto de cabeçalho/escopo.
- Foco em wizard longo não auditado (ordem de tab, skip links).
- Notificações (Bell) sem `aria-label` explícito no desktop.

**Comparativo**
- **Stripe** investe pesado em a11y — FisioOS está no básico funcional, não compliance-ready.

---

### Experiência mobile — **ALTO**

- Shell mobile funcional, mas **fluxos clínicos profundos** (wizard 7 passos, formulários longos) são difíceis em telas pequenas.
- Sem gestos ou atalhos mobile (swipe entre dias na agenda).
- Profissional em campo (home care) teria fricção alta vs. **SimplePractice mobile app**.

---

### Dashboard (Painel `/app`) — **MÉDIO**

**Pontos fortes**
- KPIs com delta vs. mês anterior.
- Onboarding para clínica nova.
- Agenda do dia + fila de atividades (rascunhos, evoluções sem assinatura).

**Problemas**
- Nome colide com **Indicadores** (`dashboard-clinico`).
- KPI “Reavaliações pendentes” leva a listagem, não à ação clínica.

**Comparativo**
- **Notion**: menos métricas, mais flexível — FisioOS é mais operacional (positivo para clínica).
- **WebPT**: dashboards clínicos mais maduros e drill-down.

---

### Agenda — **MÉDIO**

**Pontos fortes**
- Dia/semana/mês, filtros prof/status, status visual claro.
- Dropdown de ações por agendamento (confirmar, cancelar, editar).
- Mensagens de erro traduzidas.

**Problemas**
- Arquivo monolítico (~770 linhas) — manutenção/UX difícil.
- Falta drag-and-drop / resize (Google Calendar, WebPT).
- Link fraco entre agendamento concluído → evolução do dia.

---

### Avaliação — **ALTO**

**Pontos fortes**
- **AssessmentWizard** de 7 passos — profundidade clínica superior a apps genéricos.
- Detecção de perfis clínicos, EVA dedicado, autosave implícito via mutations.

**Problemas**
- Wizard longo — curva de aprendizado alta.
- Listagem global **não cria** avaliação — só consulta.
- Duplicidade wizard vs. `AssessmentForm` “classic” no paciente — confusão para usuário.

**Comparativo**
- **WebPT**: formulários especializados similares, com templates por especialidade.
- **SimplePractice**: fluxos mais curtos, menos campos por tela.

---

### Evolução — **MÉDIO**

- Formulário rico no prontuário (sinais vitais, EVA, dor).
- Listagem global espelha avaliações — mesma limitação de fluxo indireto.
- Múltiplos botões PDF por linha — poluição visual.

---

### Reavaliação — **MÉDIO**

- Triagem por urgência é boa prática clínica.
- Botão “Abrir” paciente **não abre wizard de reavaliação** — clique extra manual.
- Visual inconsistente com resto do app.

---

### Biblioteca — **MÉDIO**

- Tabs por tipo, favoritos, categorias coloridas, preview em dialog, export PDF.
- Header e cards menos premium que painel/pacientes.
- Sem “enviar ao paciente” ou vínculo direto ao prontuário (vs. valor clínico potencial).

**Comparativo**
- **Notion**: edição e organização superiores — FisioOS é consumo, não authoring.

---

### Documentos — **BAIXO** (relativamente maduro)

- Wizard 4 passos alinhado ao plano aprovado.
- Preview, validação de profissional, contratante/responsável.
- Hash + upload — fluxo completo.

**Melhorias menores**
- Pré-seleção via URL (`?patient=&template=`) — bom, mas pouco discoverável.
- Passo 3 “Visualização” poderia ser side-by-side PDF real (já parcialmente via preview).

**Comparativo**
- **Stripe**: clareza de steps similar.
- **WebPT**: integração documento-prontuário mais automática.

---

## Matriz resumida

| Dimensão | Classificação |
|----------|---------------|
| Fluxo das telas | **ALTO** |
| Navegação | **ALTO** |
| Número de cliques | **ALTO** |
| Consistência visual | **ALTO** |
| Hierarquia | **MÉDIO** |
| Layout | **MÉDIO** |
| Responsividade | **ALTO** |
| Acessibilidade | **ALTO** |
| Mobile | **ALTO** |
| Dashboard | **MÉDIO** |
| Agenda | **MÉDIO** |
| Avaliação | **ALTO** |
| Evolução | **MÉDIO** |
| Reavaliação | **MÉDIO** |
| Biblioteca | **MÉDIO** |
| Documentos | **BAIXO** |

Itens **CRÍTICOS** transversais:
1. **Duplicidade “Painel Clínico”** (`/app` vs `/app/dashboard-clinico`).
2. **Listagens de Prontuários sem ação direta** — fricção sistemática vs. WebPT/SimplePractice.
3. **Mobile + tabelas densas** — risco operacional para equipe em movimento.

---

## Comparativo rápido com referências

| Referência | Onde FisioOS ganha | Onde FisioOS perde |
|------------|-------------------|-------------------|
| **Notion** | Estrutura clínica, menos caos | Flexibilidade, edição livre |
| **Linear** | Busca ⌘K, visual limpo parcial | Nav mínima, keyboard-first total |
| **Stripe** | Wizard documentos, feedback toast | Consistência pixel-perfect global |
| **Raycast** | Busca global multi-entidade | Command palette profunda (ações, não só links) |
| **WebPT** | Wizard avaliação, prontuário rico | Agenda EMR, fluxos integrados agenda→nota |
| **SimplePractice** | White-label, paciente central | Mobile, poucos cliques, billing UX |

---

# Plano de melhorias (sem implementação)

## Fase 1 — Crítico (0–4 semanas)

1. **Renomear e diferenciar painéis**
   - `/app` → “Painel Operacional”
   - `/app/dashboard-clinico` → “Indicadores Clínicos”
   - Breadcrumbs ou subtitle fixo em cada um.

2. **Ações primárias nas listagens de Prontuários**
   - Avaliações / Evoluções / Reavaliações: botão “Registrar” + atalho contextual (paciente recente / busca).
   - Reavaliações atrasadas: “Iniciar reavaliação” abrindo wizard no paciente.

3. **Padrão mobile para listas**
   - Substituir tabelas por **cards empilhados** abaixo de `sm`/`md`.
   - Manter tabela só em desktop.

4. **Unificar shell de página**
   - Adotar `PageHeader` + `PageSection` em todas as rotas (biblioteca, financeiro, reavaliações, avaliações).

## Fase 2 — Alto (1–2 meses)

5. **Reduzir cliques no prontuário**
   - FAB ou barra de ações fixa no paciente: Nova evolução | Nova avaliação | Emitir documento.
   - Deep links da agenda: “Registrar evolução” pós-atendimento.

6. **Command palette expandida (estilo Raycast)**
   - Além de navegar: “Nova evolução para [paciente]”, “Agendar”, “Emitir contrato”.

7. **Consolidar navegação Gestão**
   - Submenu ou hub “Financeiro” (Lançamentos, Recibos, Relatórios) — menos itens na sidebar.

8. **Wizard de avaliação**
   - Modo compacto (campos essenciais) vs. completo (geriátrico).
   - Remover ou esconder “modo classic” para usuários finais.

9. **Agenda**
   - CTA pós-“Realizado”: criar evolução.
   - Melhorar legibilidade mobile na view semana.

## Fase 3 — Médio (2–4 meses)

10. **Hierarquia no prontuário**
    - Tab “Resumo” default com pendências (rascunhos, reavaliação, próxima sessão).
    - Agrupar ações PDF em menu “⋯” por item.

11. **Biblioteca**
    - Visual alinhado ao painel premium.
    - Ação “Anexar ao paciente” / gerar PDF personalizado com 1 clique.

12. **Acessibilidade**
    - Auditoria WCAG 2.1 AA em fluxos críticos (wizard, agenda, forms).
    - Status sempre com texto, não só cor.

13. **Notificações**
    - Implementar ou remover sino até existir conteúdo — evitar affordance morta.

14. **Indicadores clínicos**
    - Drill-down clicável (gráfico → lista de pacientes filtrada).

## Fase 4 — Baixo / evolutivo

15. Atalhos de teclado documentados (? overlay estilo Linear).  
16. Tema escuro coerente (tokens existem parcialmente).  
17. Personalização de sidebar (itens favoritos).  
18. PWA / layout otimizado para tablet na sala de atendimento.

---

## Conclusão

O FisioOS já transmite **identidade premium de saúde** e supera referências genéricas em **profundidade clínica** (avaliação, documentos PDF). Os gaps principais são **operacionais**: nomes duplicados, listagens passivas, inconsistência entre telas novas e antigas, e **mobile clínico** ainda não no nível de SimplePractice/WebPT.

Nenhum arquivo foi alterado nesta análise.