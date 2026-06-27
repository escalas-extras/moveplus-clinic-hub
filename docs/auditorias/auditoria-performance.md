# Auditoria de performance — FisioOS (somente leitura)

Análise baseada no código, build Nitro/Vite e migrations Supabase. Nenhum arquivo foi alterado.

---

## Síntese executiva

O FisioOS tem **boas bases multi-tenant** (RLS, `clinic_id` nas queries, índices por clínica) e **alguns padrões inteligentes** (painel com `Promise.all`, busca global com limites, cache local de branding/avatar). Os gargalos principais estão em **bundle pesado (jsPDF/recharts)**, **QueryClient sem defaults**, **ausência de lazy loading de rotas**, **refetch agressivo de contexto global** e **queries sem paginação real**.

---

## Classificação por dimensão

### React — **ALTO**

**Pontos fortes**
- Hooks modernos; filtros locais com `useMemo` em listagens.
- Radix Tabs desmonta conteúdo inativo (não mantém tudo montado).

**Problemas**
- **Zero `React.memo`** em todo o `src/` — listas grandes re-renderizam com o pai.
- Componentes monolíticos: `assessment-wizard.tsx` (~970 linhas), `agenda.tsx` (~770), `admin-saas.tsx` (~90 kB no build).
- Página paciente (`pacientes/$id`) dispara **3 queries pesadas no mount** (patient `select("*")`, evolutions, assessments com joins) independente da tab ativa.
- `evolutions.data?.filter` dentro de `.map` de avaliações — O(n×m) por render.

---

### TanStack Router — **ALTO**

**Pontos fortes**
- `scrollRestoration: true`.
- Rotas tipadas; `validateSearch` em documentos.

**Problemas**
- **Nenhum lazy loading**: `routeTree.gen.ts` importa **todas** as rotas estaticamente.
- `defaultPreloadStaleTime: 0` — preload invalida imediatamente.
- `ssr: false` no layout autenticado — OK para SPA, mas sem benefício de SSR para first paint.
- Chunk de rota paciente `$id`: **~257 kB** (maior rota isolada no build).

**Comparativo**: Linear/Stripe usam code-splitting agressivo por rota — FisioOS carrega muito upfront.

---

### React Query — **CRÍTICO**

**Pontos fortes**
- `queryClient.clear()` no auth change — correto para multi-tenant/segurança.
- Algumas queries tunadas: avatar (50 min stale), global search (10 s), wizard catálogo (5 min).

**Problemas**
- `QueryClient` criado **sem defaults** em `router.tsx` → `staleTime: 0` global.
- `useActiveClinic`: `staleTime: 0`, **`refetchOnMount: "always"`** — roda em quase toda tela + server fn extra.
- `useBranding`: `staleTime: 0`, `refetchOnMount: true` — refetch de settings + signed URL logo a cada mount.
- Maioria das telas **refetch on window focus** (default) — navegação entre abas do browser dispara rede em massa.
- **Biblioteca** usa `useEffect` + `useState`, **fora do React Query** — sem cache/dedup.

---

### React Hook Form — **MÉDIO**

- Usado em agenda, financeiro, wizard — adequado.
- Wizard com muitos campos + `Controller` — re-renders por step não isolados por memo.
- Sem impacto crítico isolado; contribui em formulários longos (avaliação).

---

### Renderizações — **ALTO**

- AppShell + SupportBanner + branding loading causam cascata em toda navegação.
- Dashboard painel: 1 query agregada (bom), mas KPI cards re-renderizam juntos.
- Documentos: **8+ queries** paralelas quando step ≥ 2 (patient, assessment, scales, discharge, clinic, professional…).
- Charts (Recharts) em dashboard e scales-panel — re-render custoso.

---

### Memoização — **ALTO**

- `useMemo`/`useCallback` pontuais (~15 arquivos).
- **Nenhum `React.memo`** em rows de tabela, KPI cards, NavItem.
- Oportunidade clara em listagens de 200+ linhas (avaliações, evoluções, financeiro).

---

### Lazy Loading — **CRÍTICO**

| Área | Estado |
|------|--------|
| Rotas | **Não** — imports estáticos |
| jsPDF / QRCode | Import estático em `pdf.ts`, `receipt-pdf.ts`, puxado para chunks de paciente/documentos |
| Recharts | Import estático em dashboard + scales |
| AssessmentWizard | Import estático no paciente |
| admin-saas | ~92 kB sempre no grafo de dependências |

---

### Bundle — **CRÍTICO**

Módulos pesados no build (server chunks indicam dependências client-side):

| Biblioteca | Tamanho (aprox.) |
|------------|------------------|
| `@tanstack/react-router` | ~656 kB |
| `recharts` | ~570 kB |
| `jspdf` | ~477 kB |
| `canvg` + `html2canvas` | ~330 + ~318 kB (cadeia jsPDF) |
| `@supabase/auth-js` | ~301 kB |
| `lodash` | ~163 kB |
| `qrcode` | ~77 kB |
| `date-fns` | ~105 kB |
| `zod` | ~100 kB |

Rotas grandes: `pacientes/$id` 257 kB, `admin-saas` 92 kB, `documentos` 51 kB, `agenda` 50 kB.

Fonte Google Inter carregada externamente — OK com preconnect, mas render-blocking parcial.

---

### Supabase — **MÉDIO**

- Client singleton via Proxy — bom.
- Auth persist + autoRefresh — padrão.
- Queries majoritariamente filtradas por `clinic_id`.
- Alguns `select("*")` desnecessários (pacientes list, documentos patient full row).
- Global search: **6 queries paralelas** por keystroke (debounced 220 ms) — aceitável com limites 6–20.

---

### Queries — **ALTO**

**Boas**
- Painel (`index.tsx`): 1 `queryFn` com `Promise.all` de counts — eficiente.
- Limites hardcoded previnem explosão total: `.limit(200)` listagens, `.limit(500)` extras.

**Problemáticas**
- Timeline paciente: **sem limit** em assessments/evolutions — cresce com histórico.
- Reavaliações: carrega **todos** os registros de `reassessment_schedule`.
- Biblioteca: `select("*")` de **todo** conteúdo ativo.
- Relatórios financeiros: `select("*")` no intervalo de datas sem limit.
- Documentos emitidos: query sem paginação visível.

---

### Índices — **MÉDIO**

**Presentes (bom)**
- `clinic_id` em tabelas principais (patients, assessments, evolutions, appointments, receipts…).
- `idx_assess_status`, `idx_evo_data`, `idx_appt_patient`, GIN em `library_contents.tags`.
- `idx_patients_nome` para busca.

**Possíveis gaps**
- Falta índice composto explícito `(clinic_id, data DESC)` em assessments/evolutions (pode usar index scan + sort).
- Busca `ilike` em nomes — sem trigram/GIN para texto; degrada com escala.
- Tabelas `pagamentos/extras/recibos` (Extra Flow) ausentes nos types locais — índices não auditáveis aqui.

---

### Cache — **ALTO**

**Pontos fortes**
- `persistent-cache.ts` (localStorage TTL) para branding, avatar, logo signed URLs.
- Global search cache 10 s.

**Problemas**
- React Query default cache curto + refetch agressivo anula benefícios.
- `loadClinicLogo` chama `invalidateSignedClinicLogoUrl` **antes** de cada PDF — força novo signed URL + fetch data URL.
- Biblioteca sem cache React Query.
- Branding `staleTime: 0` contradiz `pcSet` 24 h — refetch mesmo com cache local quente.

---

### Paginação — **ALTO**

- Apenas **limites fixos** (200, 500), não cursor/infinite scroll.
- Sem UI “carregar mais” — dados truncados silenciosamente.
- Clínicas grandes perdem visibilidade ou pagam custo de fetch grande.

---

### Uploads — **MÉDIO**

- Avatar/logo: upload direto Supabase Storage, `upsert: true` — simples e OK.
- PDFs: `upload` síncrono após geração client-side — bloqueia UI até concluir.
- Sem progress indicator para arquivos grandes.
- Signed URLs: TTL 300 s (docs) vs 3600 s (avatar) — re-fetch frequente em listagens de documentos.

---

### PDFs — **CRÍTICO**

- Geração **100% client-side** — bloqueia main thread (jsPDF + medição + compose até 3×).
- Logo fetch + canvas matte removal por PDF.
- Lote de recibos: loop sequencial `await downloadReceiptPdf` — N× custo completo.
- Assessment PDF pode incluir **todas evoluções** — documentos enormes.
- jsPDF + dependências (~800 kB+ gzip ~200 kB) no grafo — impacto em TTI.

---

### Multi-tenant — **MÉDIO**

**Pontos fortes**
- `clinic_id` em query keys na maioria das telas.
- RLS tenant-aware; auth clear no logout.
- Branding/PDF resolvem clínica do documento, não só a logada.

**Riscos**
- Timeline `patient_discharges` filtra só `patient_id` (RLS deve proteger).
- `library_favorites` fetch sem filtro explícito de clínica no código.
- `useActiveClinic` refetch constante multiplica chamadas RPC por sessão.

---

### Escalabilidade — **CRÍTICO**

| Eixo | Limite prático atual |
|------|----------------------|
| Clínicas / usuários | OK com RLS + índices por clinic |
| Pacientes por clínica | Listagem sem paginação — degrada |
| Histórico clínico longo | Timeline + PDF assessment sem cap |
| Bundle inicial | Pesado para conexões lentas |
| Concurrent users | Client-side PDF compete por CPU do browser |
| SaaS admin | `admin-saas` monolítico no bundle graph |

---

## Matriz resumida

| Dimensão | Classificação |
|----------|---------------|
| React | **ALTO** |
| TanStack Router | **ALTO** |
| React Query | **CRÍTICO** |
| React Hook Form | **MÉDIO** |
| Renderizações | **ALTO** |
| Memoização | **ALTO** |
| Lazy Loading | **CRÍTICO** |
| Bundle | **CRÍTICO** |
| Supabase | **MÉDIO** |
| Queries | **ALTO** |
| Índices | **MÉDIO** |
| Cache | **ALTO** |
| Paginação | **ALTO** |
| Uploads | **MÉDIO** |
| PDFs | **CRÍTICO** |
| Multi-tenant | **MÉDIO** |
| Escalabilidade | **CRÍTICO** |

---

# Plano de melhorias (sem implementação)

## Fase 1 — Crítico (impacto imediato)

1. **Configurar `QueryClient` global**
   - Defaults: `staleTime: 60_000`, `gcTime: 300_000`, `refetchOnWindowFocus: false` (ou só em dados críticos).
   - Exceções: auth, active clinic (stale 30–60 s, sem `always`).

2. **Lazy load de rotas**
   - `React.lazy` + `Suspense` para: `admin-saas`, `pacientes/$id`, `documentos`, `agenda`, `assessment-wizard`.
   - Meta: reduzir bundle inicial em 40%+.

3. **Lazy load de PDF**
   - Dynamic import de `buildPdf` / `jspdf` / `qrcode` só no clique “Baixar/Emitir”.
   - Separar `receipt-pdf` do chunk principal.

4. **Otimizar contexto global**
   - `useActiveClinic`: `staleTime: 60s`, remover `refetchOnMount: "always"`.
   - `useBranding`: `staleTime: 5–15 min`; confiar em `pcGet` como `placeholderData`.

5. **Cap em queries unbounded**
   - Timeline, reavaliações, biblioteca: limit + paginação cursor.
   - Assessment PDF: evoluções opcionais/limitadas.

## Fase 2 — Alto (1–2 meses)

6. **Paginação real**
   - Listagens 200+ com infinite scroll ou páginas (pacientes, avaliações, evoluções, financeiro).
   - API pattern: `.range(from, to)` + count.

7. **Memoização de listas**
   - `React.memo` em rows; extrair `AssessmentRow`, `EvolutionRow`.
   - Pré-computar `linked evolutions` map no fetch, não no render.

8. **Recharts on-demand**
   - Lazy import só em `dashboard-clinico` e `scales-panel`.
   - Considerar charts leves (CSS) para KPIs simples.

9. **Cache de logo para PDF**
   - Não invalidar signed URL a cada `buildPdf`; cache por path TTL alinhado ao signed URL.

10. **Biblioteca → React Query**
    - Migrar `useEffect` para `useQuery` com staleTime; paginar conteúdo.

11. **PDF batch**
    - Web Worker ou fila sequencial com cache de `PdfRenderCtx` compartilhado.
    - Progress UI para lote de recibos.

## Fase 3 — Médio (2–4 meses)

12. **Índices de busca**
    - `pg_trgm` + GIN em `patients.nome_completo`, `clinical_documents.title` para `ilike`.

13. **Índices compostos**
    - `(clinic_id, data DESC)` em assessments, evolutions, appointments.

14. **Uploads**
    - Progress bar; compressão de imagens antes de logo/avatar upload.

15. **Prefetch seletivo**
    - TanStack Router preload só para rotas adjacentes (paciente → prontuário), com staleTime > 0.

16. **Virtualização**
    - `@tanstack/react-virtual` em tabelas longas (agenda semana, listagens).

## Fase 4 — Baixo / evolutivo

17. Service Worker para cache de assets estáticos.  
18. Server-side PDF generation (edge function) para documentos grandes — tira carga do browser.  
19. Métricas RUM (Web Vitals, query timing) por clínica.  
20. Audit de bundle periódico no CI (`rollup-plugin-visualizer`).

---

## Conclusão

A arquitetura multi-tenant e o uso de Supabase estão **sólidos para escala moderada**. Os riscos de performance concentram-se em **estratégia de cache/refetch**, **bundle monolítico** (jsPDF + Recharts + rotas estáticas) e **queries sem paginação real** em históricos clínicos longos. Priorizar Fase 1 costuma reduzir latência percebida e uso de rede em **30–50%** sem mudar regras de negócio.

Nenhum arquivo foi alterado nesta análise.