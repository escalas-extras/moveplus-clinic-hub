# Plano Final de Estabilização + UX Premium — FisioOS (APROVADO COM AJUSTES)

4 fases com checkpoint obrigatório. Nada publica automaticamente. Nenhum item é considerado resolvido só porque existe no código — exige validação visual e funcional real.

---

## FASE 1 — Correção definitiva (ordem obrigatória)

### Prioridade 1 — validar antes de qualquer nova implementação

#### 1.1 Logo da clínica (NÃO homologada)
Teste visual real em **Move+**, **Grasiela** e **clínica teste**, navegando Painel → Agenda → Pacientes → Documentos → Biblioteca → Configurações.
Critério: sem piscar, sem quebrar, sem trocar para monograma, sem recarregar visualmente.

#### 1.2 Busca Global (antes de Avatar)
Validar funcionamento real para: owner, profissional, super_admin, super_admin em modo suporte.

#### 1.3 Minha Conta
Não basta existir no código — deve estar visível na interface. Reportar exatamente onde foi renderizado (sidebar acima de Sair + menu do avatar da topbar). Validar para todos os papéis.

#### 1.4 Avatar (somente após Minha Conta visível)
Upload real completo: selecionar → upload `user-avatars` → `profiles.avatar_url` → signed URL → sidebar + topbar atualizam sem logout. Nunca imagem quebrada.

### Prioridade 2 — apenas após 1.1–1.4 homologados

#### 1.5 Biblioteca / PDF
PDF real (nunca print HTML) com branding por clínica (logo, cores, rodapé) em Move+, Grasiela e clínica teste. Validar download e preview.

#### 1.6 Assinaturas
Bloco idêntico para todas as clínicas:
```
Nome do profissional
FISIOTERAPEUTA
CREFITO xxxxx
Razão Social
CNPJ xx.xxx.xxx/xxxx-xx
```

**Checkpoint 1** só é aprovado após validação visual e funcional completa de TODOS os itens 1.1–1.6.

---

## FASE 2 — Congelamento da arquitetura
Após OK explícito da Fase 1. Não mexer mais em: `clinic_id`, provisionamento, RLS, `can_access_clinic`, `can_manage_clinic`, `clinic_members.role`, multi-tenant.

**Checkpoint 2:** confirmação textual do congelamento.

---

## FASE 3 — UX Premium

- Nomenclatura: "Dashboard" → "Painel". Tela principal: "Painel Clínico" / "Resumo operacional da clínica em tempo real".
- Painel: KPIs (Pacientes Ativos, Atendimentos do Mês, Documentos Emitidos, Reavaliações Pendentes — valor, variação, comparação, ícone) + Agenda de Hoje + Atividades Importantes (com ação rápida).
- Menu lateral recolhível: Painel · Agenda · Pacientes · Prontuários (Avaliações/Evoluções/Reavaliações) · Documentos (Emissão/Modelos) · Biblioteca · Gestão (Indicadores/Financeiro/Relatórios) · Configurações.
- Agenda Premium: diária/semanal/mensal estilo Google Calendar, filtros profissional/status, resumo do dia.
- Documentos: Wizard 4 passos (Modelo → Paciente → Visualização → Emitir e Arquivar) com barra de progresso.
- Design System: azul petróleo / verde esmeralda / laranja / vermelho via tokens. Tipografia 32/24/16/14. Cards com altura, sombra e espaçamento consistentes.

**Checkpoint 3:** screenshots das telas-chave para aprovação.

---

## FASE 4 — Auditoria 360° Final
Classificar 🔴/🟡/🟢: Segurança, Multi-tenant, Fluxos clínicos, PDFs, Biblioteca, Agenda, UX, White Label, Provisionamento, Escalabilidade SaaS.
Relatório final com bugs corrigidos, telas/componentes alterados, testes, pendências, validação nas 3 clínicas, confirmação de estabilidade e readiness comercial.

**Sem publicação sem aprovação explícita.**

---

## Início imediato — Fase 1.1 (Logo)
Vou abrir o preview e navegar entre as telas nas 3 clínicas observando a logo. Reporto o resultado real antes de seguir para 1.2.
