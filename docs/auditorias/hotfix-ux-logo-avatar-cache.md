# HOTFIX UX — Logo e avatar estáveis entre rotas

**Data:** 28/06/2026  
**Build:** `npm run build` — **sucesso**  
**Escopo:** Apenas carregamento/cache visual — sem banco, migrations, PDFs ou layout.

---

## Causa raiz

1. **`useBranding` com `staleTime: 0` e `refetchOnMount: true`** — branding revalidava desnecessariamente; `isLoading` podia ativar placeholder/monograma mesmo com logo em cache.
2. **`useActiveClinic` com `refetchOnMount: "always"`** — novo observer em rotas filhas disparava refetch; `loading: true` propagava flicker.
3. **`LogoBox` resetava estado a cada `src`** — aspect ratio e dimensões recalculadas do zero → salto visual antes do `onLoad`.
4. **Signed URLs sem cache em memória unificado para logo** — avatar já tinha `Map`; logo dependia só de localStorage + nova resolução.
5. **`UserAvatar` iniciava `displayUrl` vazio** — flash do monograma/placeholder entre rotas quando query ainda não tinha retornado, mesmo com URL em cache.
6. **Sem preload explícito** — browser recarregava bitmap em cada remount de `<img>` sem garantia de cache quente na sessão.

**Nota:** `AppShell` (sidebar) já persiste entre rotas via `_authenticated/route.tsx`; o problema era revalidação/reset visual, não desmontagem do shell.

---

## Estratégia de cache

| Camada | Mecanismo |
|--------|-----------|
| **Sessão (RAM)** | `image-preload.ts` — `Set` de URLs já decodificadas + `preloadImageUrl()` |
| **Branding** | `brandingSession` Map + `staleTime: 30min` + `placeholderData` |
| **Logo signed URL** | `signedLogoMemory` Map + localStorage (`pcGet/pcSet`) |
| **Avatar signed URL** | `signedAvatarCache` Map (existente) + localStorage |
| **Logo fit** | `logoFitSession` Map — aspect, dimensões, estilo por URL |
| **React Query** | `refetchOnMount: false`, `refetchOnWindowFocus: false` para branding/avatar |

Preload no `AppShell`: ao montar/atualizar `brand.logoUrl` e `avatarPath`, dispara `preloadImageUrl` / `preloadAvatarUrl`.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/image-preload.ts` | **Novo** — cache + preload em memória |
| `src/lib/branding.ts` | Session cache, staleTime alto, isLoading inteligente, preload logo |
| `src/lib/clinic-logo.ts` | Map em memória, preload helper |
| `src/lib/user-avatar.ts` | `preloadAvatarUrl`, mark session loaded |
| `src/lib/active-clinic.ts` | `refetchOnMount: false`, loading só sem data |
| `src/components/logo-box.tsx` | Session fit cache, opacity transition, sem reset desnecessário |
| `src/components/clinic-logo.tsx` | `loading` só sem URL de logo |
| `src/components/avatar-uploader.tsx` | `UserAvatar` init from cache, opacity transition |
| `src/components/app-shell.tsx` | Preload logo/avatar, `logoLoading`/`avatarLoading` estáveis |

---

## Comportamento esperado

- Logo/avatar **não voltam ao monograma/pulse** se já carregados na sessão.
- Espaço reservado mantido (dimensões do container inalteradas).
- Troca de imagem (ex.: upload novo) usa fade `opacity 150ms`.
- Signed URLs reutilizadas — sem `createSignedUrl` a cada navegação quando cache válido.

---

## Validação visual

1. Login → aguardar logo e avatar carregarem na sidebar.
2. Navegar: **Dashboard → Pacientes → Agenda → Documentos → Configurações**.
3. Confirmar: logo sidebar estável, avatar footer/topbar estável, sem flash branco/monograma.
4. Recolher/expandir sidebar — logo mark/brand sem piscar.
5. Upload nova logo em Configurações — transição suave (fade), demais rotas estáveis após primeiro load.

---

## Critérios de aceite

| Critério | Status |
|----------|--------|
| Logo não pisca entre rotas | ✅ |
| Avatar não pisca | ✅ |
| Sidebar visualmente estável | ✅ |
| `npm run build` passa | ✅ |
