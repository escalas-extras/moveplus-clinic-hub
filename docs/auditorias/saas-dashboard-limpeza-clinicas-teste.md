# Limpeza controlada + Dashboard SaaS — clínicas de teste

**Data:** 2026-06-27  
**Escopo:** Admin SaaS (`/app/admin-saas`), flag `is_test`, diagnóstico e ações seguras  
**Build:** `npm run build` — OK

---

## Resumo executivo

Implementação concluída **sem alteração de dados em produção**. Clínicas de teste identificadas permanecem intactas até confirmação explícita no painel.

| Item | Status |
|------|--------|
| Diagnóstico (somente leitura) | ✅ API + UI |
| Flag `is_test` + bloqueio operacional | ✅ Migration |
| Dashboard segmentado (produção/teste/inativas) | ✅ |
| Ações: marcar teste, inativar, reativar, cancelar | ✅ com confirmação |
| Proteção Move+ | ✅ bloqueio em mutações |
| Clínicas de teste inativadas | ⏸ **Pendente confirmação do usuário** |
| Dados clínicos apagados | ❌ Nenhum (por design) |

---

## Parte 1 — Diagnóstico

### Como executar

1. Acesse `/app/admin-saas` como `super_admin`
2. Aba **Painel** → card **Diagnóstico de clínicas**
3. Clique **Executar diagnóstico**

A função `getSaasClinicDiagnostic` consulta via service role (server-side) e retorna:

- Todas as clínicas (`status != deleted`)
- Contagens por clínica: pacientes, documentos, consultas, membros, lançamentos financeiros, recibos
- Segmento (produção / teste / inativa)
- Clínicas Move+ **protegidas**
- Candidatas a teste conhecidas
- Ações recomendadas (somente leitura)

### Clínicas candidatas a teste (nomes configurados)

| Nome |
|------|
| FISIOLIANI |
| ORTHOFISIO |
| Orthoclean |
| GRASIELA OLIVEIRA CRUZ DA SILVA |

### Clínica a preservar

Qualquer variação **Move+**, **Move+ 60+**, `moveplus`, `move60` — bloqueada em todas as mutações destrutivas.

### Script CLI alternativo

`scripts/saas-clinic-diagnostic.ts` — requer `SUPABASE_SERVICE_ROLE_KEY` no `.env` (ausente no ambiente local desta sessão).

---

## Parte 2 — Estratégia segura adotada

**Preferência:** inativação + flag, nunca delete físico.

| Mecanismo | Efeito |
|-----------|--------|
| `clinics.is_test = true` | Exclui das métricas de produção; bloqueia acesso operacional (RLS/função) |
| `clinics.status = inactive` | Bloqueia acesso comercial |
| `clinic_plans.status = suspended` | Suspende plano vigente |
| `clinic.mark_test` em `saas_audit_log` | Auditoria |

**Não alterado:** pacientes, documentos, usuários, dados financeiros, membros.

**Migration:** `supabase/migrations/20260628180000_clinics_is_test_flag.sql`

---

## Parte 3 — Dashboard SaaS

### KPIs (aba Painel)

- Clínicas ativas (produção)
- Trials ativos
- Suspensas / inativas
- MRR + ARR + ticket
- Clínicas de teste
- Planos ativos (contratos trial + pagos, produção)

Métricas **excluem** `is_test` e nomes candidatos a teste.

### Lista (aba Clínicas)

- **Filtro padrão:** segmento = Produção
- Filtros adicionais: status, plano
- Colunas: segmento, trial, última atualização, badge Move+ protegida
- Candidatas a teste sinalizadas

---

## Parte 4 — Ações administrativas

| Ação | Confirmação | Apaga dados? |
|------|-------------|--------------|
| Marcar como teste | Nome exato da clínica | Não |
| Inativar | Dialog de confirmação | Não |
| Suspender | Dialog de confirmação | Não |
| Cancelar assinatura | Dialog de confirmação | Não |
| Reativar | Dialog de confirmação | Não |
| Excluir (soft delete) | Slug + ack documentos | Soft only — **bloqueado em Move+** |

---

## Parte 5 — Clínicas alteradas nesta entrega

**Nenhuma.** A inativação das 4 clínicas candidatas **não foi executada** conforme instrução de aguardar confirmação explícita.

### Próximo passo (após sua confirmação)

Para cada candidata, na aba **Clínicas**:

1. Filtro **Segmento → Teste** (ou buscar pelo nome)
2. Menu ⋮ → **Marcar como teste**
3. Digitar o nome exato e confirmar

Alternativa: **Marcar inativa** ou **Cancelar assinatura** (também com confirmação).

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/20260628180000_clinics_is_test_flag.sql` | Coluna `is_test` + `clinic_has_operational_access` |
| `src/lib/saas/clinic-segmentation.ts` | Segmentação, proteção Move+, nomes teste |
| `src/lib/api/saas-admin.functions.ts` | Dashboard, listagem, diagnóstico, `markClinicAsTest`, proteções |
| `src/routes/_authenticated/app/admin-saas.tsx` | KPIs, filtros, diagnóstico, confirmações |
| `src/integrations/supabase/types.ts` | Tipo `is_test` em `clinics` |
| `scripts/saas-clinic-diagnostic.ts` | Script CLI diagnóstico |
| `docs/auditorias/saas-dashboard-limpeza-clinicas-teste.md` | Este relatório |

---

## Como validar

1. **Build:** `npm run build` — deve passar sem erros
2. **Migration:** aplicar no Supabase (`supabase db push` ou pipeline CI)
3. **Dashboard:** `/app/admin-saas` → aba Painel — KPIs não contam clínicas `is_test`/candidatas
4. **Filtro padrão:** aba Clínicas mostra só produção; teste/inativas em segmentos separados
5. **Diagnóstico:** executar e verificar inventário antes de qualquer ação
6. **Move+:** tentar inativar Move+ — deve retornar erro de proteção
7. **Marcar teste:** após confirmação, candidata some do filtro Produção e aparece em Teste
8. **Auditoria:** aba Auditoria registra `clinic.mark_test`, `clinic.cancel`, etc.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Clínicas de teste fora de “ativas” (após marcar) | ⏸ Aguarda execução |
| Move+ intacta e protegida | ✅ |
| Dashboard diferencia produção/teste/inativas | ✅ |
| Nenhum dado clínico apagado | ✅ |
| Build passa | ✅ |
