# FisioOS Design Language — Fase 1 (Branding)

> **Status:** Especificação · Fase 1 — Branding  
> **Escopo:** Linguagem visual oficial da plataforma  
> **Implementação:** Nenhuma nesta fase — documento normativo para todas as fases futuras

Este documento define a identidade visual do FisioOS. Ele **não altera** banco, APIs, fluxos, builders ou lógica de PDFs. Serve como fonte única de verdade para designers, desenvolvedores e parceiros white label.

---

## Sumário

1. [Identidade da marca](#1-identidade-da-marca)
2. [Tipografia](#2-tipografia)
3. [Espaçamentos](#3-espaçamentos)
4. [Bordas](#4-bordas)
5. [Sombras](#5-sombras)
6. [Cores](#6-cores)
7. [Ícones](#7-ícones)
8. [Componentes](#8-componentes)
9. [White Label](#9-white-label)
10. [Sidebar — Redesign conceitual](#10-sidebar--redesign-conceitual)
11. [PDFs — Princípios visuais](#11-pdfs--princípios-visuais)
12. [Guia de identidade visual](#guia-de-identidade-visual)
13. [Guia de componentes](#guia-de-componentes)
14. [Guia de documentos](#guia-de-documentos)
15. [Roadmap da implementação visual](#roadmap-da-implementação-visual)

---

## 1. Identidade da marca

### Posicionamento

**FisioOS** é o sistema operacional para clínicas de fisioterapia — uma plataforma SaaS premium que une gestão clínica, documentação profissional e identidade institucional em um único ecossistema.

| Dimensão | Definição |
|----------|-----------|
| **Categoria** | HealthTech B2B · SaaS clínico |
| **Público** | Clínicas, consultórios e redes de fisioterapia |
| **Promessa** | Transformar atendimentos em resultados mensuráveis, com documentação impecável |
| **Diferencial** | Software que *parece* clínica de alto padrão — não planilha disfarçada |

### Personalidade

| Traço | Expressão visual |
|-------|------------------|
| **Institucional** | Layouts estruturados, hierarquia clara, ausência de ruído |
| **Humano** | Tipografia legível, espaço generoso, linguagem acolhedora |
| **Preciso** | Alinhamentos rigorosos, números tabulares, estados explícitos |
| **Confiável** | Paleta sóbria, feedback consistente, validação e rastreabilidade visíveis |
| **Moderno** | Superfícies leves, micro-interações sutis, sensação de produto 2025+ |

### Tom visual

- **Clean, não minimalista vazio** — cada elemento tem função clínica ou operacional.
- **Premium, não luxo** — qualidade de hospital privado moderno, não hotel cinco estrelas.
- **Tecnológico, não frio** — acentos em verde saúde e teal transmitem vitalidade sem infantilizar.
- **Profissional, não burocrático** — documentos e telas devem inspirar confiança, não fadiga.

### Tagline oficial

> **FisioOS** — *Sistema operacional para clínicas de fisioterapia*

Tagline alternativa (marketing): *Transformando atendimentos em resultados.*

### Referências de inspiração (direção, não cópia)

Apple Health · Linear · Notion · documentos médicos premium contemporâneos · dashboards SaaS B2B de alta densidade informacional.

---

## 2. Tipografia

### Famílias

| Token | Família | Uso |
|-------|---------|-----|
| `--font-display` | Inter, SF Pro Display, system-ui | Títulos, KPIs, números hero |
| `--font-sans` | Inter, SF Pro Text, system-ui | Corpo, labels, UI geral |
| PDF (engine) | Helvetica | Renderização jsPDF — espelha proporções da UI |

**Regra:** Nunca misturar mais de duas famílias na mesma tela. Serifas são proibidas na UI.

### Escala UI (plataforma)

Base: **16 px** (`1rem`). Escala em ratio ~1.25 (Major Third simplificado).

| Token | Tamanho | Line-height | Peso | Uso |
|-------|---------|-------------|------|-----|
| `display-xl` | 32 px / 2rem | 1.15 | 600 | Título de página (h1) |
| `display-lg` | 24 px / 1.5rem | 1.25 | 600 | Título de seção (h2) |
| `heading-md` | 20 px / 1.25rem | 1.30 | 600 | Subseção (h3) |
| `heading-sm` | 18 px / 1.125rem | 1.35 | 600 | Card title, modal title |
| `body-lg` | 16 px / 1rem | 1.50 | 400 | Corpo principal |
| `body-md` | 14 px / 0.875rem | 1.45 | 400 | Metadados, descrições |
| `body-sm` | 12 px / 0.75rem | 1.40 | 400 | Captions, hints |
| `label` | 11 px / 0.6875rem | 1.30 | 600 | Labels uppercase em formulários |
| `kpi-hero` | 36–48 px | 0.95 | 700 | Números de destaque (tabular nums) |

### Pesos permitidos

| Peso | Uso |
|------|-----|
| 400 Regular | Corpo, parágrafos, valores neutros |
| 500 Medium | Labels secundários, nav items |
| 600 Semibold | Títulos, botões, ênfase |
| 700 Bold | KPIs, alertas críticos (uso restrito) |

**Proibido:** 300 Light (baixo contraste), 800+ (peso visual excessivo).

### Letter-spacing

| Contexto | Valor |
|----------|-------|
| Títulos display | `-0.025em` |
| KPIs / números | `-0.035em` + `font-feature-settings: "tnum", "lnum"` |
| Labels uppercase | `+0.06em` |
| Corpo | `0` (padrão) |

### Tipografia em documentos (PDF)

Escala separada em pontos (pt) — ver [Guia de documentos](#guia-de-documentos). **Nunca** reutilizar px da UI diretamente em PDF; usar tokens `DS_TYPOGRAPHY`.

---

## 3. Espaçamentos

### Escala oficial (base 4 px)

| Token | Valor | Uso típico |
|-------|-------|------------|
| `space-0` | 0 | Reset |
| `space-1` | 4 px | Gap mínimo interno |
| `space-2` | 8 px | Ícone + texto, chips |
| `space-3` | 12 px | Padding compacto |
| `space-4` | 16 px | Padding padrão de input |
| `space-5` | 20 px | Gap entre elementos de card |
| `space-6` | 24 px | Padding de card |
| `space-8` | 32 px | Gap entre seções |
| `space-10` | 40 px | Margem de página (mobile) |
| `space-12` | 48 px | Respiro entre blocos principais |
| `space-16` | 64 px | Hero sections, empty states |

**Regra:** Usar apenas múltiplos de 4 px. Valores ímpares (ex.: 13 px) são proibidos.

### Grid da plataforma

| Breakpoint | Colunas | Gutter | Margem lateral | Max-width conteúdo |
|------------|---------|--------|----------------|-------------------|
| `< sm` (mobile) | 4 | 16 px | 16 px | 100% |
| `sm–lg` (tablet) | 8 | 20 px | 24 px | 100% |
| `≥ lg` (desktop) | 12 | 24 px | 32 px | 1280 px (app shell) |
| `≥ xl` | 12 | 32 px | 40 px | 1440 px |

### Ritmo vertical

- **Entre seções de página:** `space-8` (32 px) mínimo.
- **Entre card e card:** `space-6` (24 px).
- **Dentro de card:** `space-5` (20 px) padding horizontal, `space-4` vertical para densidade clínica.
- **Header de página → conteúdo:** `space-6` (24 px).

### Margens e paddings por superfície

| Superfície | Padding | Notas |
|------------|---------|-------|
| Card padrão | 24 px | `rounded-2xl` |
| Card compacto (lista) | 16 px | Linhas densas |
| Modal | 24–32 px | Header fixo + body scroll |
| Sidebar item | 10 px 12 px | Altura mínima 40 px |
| Input | 12 px 16 px | Altura 44 px (`h-11`) |
| Page shell | 24 px (mobile) / 32 px (desktop) | Via `PageSection` |

---

## 4. Bordas

### Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 8 px | Badges, chips pequenos |
| `--radius-md` | 12 px | Inputs, botões |
| `--radius-lg` | 16 px | Cards secundários |
| `--radius-xl` | 20 px | **Cards principais** (base `--radius`) |
| `--radius-2xl` | 28 px | Modais, painéis hero |
| `--radius-full` | 9999 px | Avatares, pills |

**Regra:** Cards de conteúdo clínico usam sempre `radius-xl` (20 px). Inputs e botões usam `radius-md` (12 px).

### Espessuras

| Token | Valor | Uso |
|-------|-------|-----|
| `border-hairline` | 0.5 px | Separadores internos, divisores |
| `border-default` | 1 px | Cards, inputs, sidebar |
| `border-strong` | 1.5 px | Focus ring externo, estados ativos |
| `border-accent` | 2 px | Indicador lateral sidebar ativa |
| `border-brand-bar` | 4–5 px | Faixa institucional em PDF header |

### Estilo de borda

- Cor padrão: `--border` (`oklch(0.92 0.008 250)` ≈ `#E2E8F0`).
- Opacidade em sidebar escura: `rgba(255,255,255,0.12)`.
- **Nunca** borda preta pura (`#000`). Sempre derivada da paleta `--fos-ink` com opacidade.

---

## 5. Sombras

Sombras transmitem **elevação hierárquica**, não decoração. Usar com moderação.

| Token | Definição | Uso |
|-------|-----------|-----|
| `shadow-none` | — | Elementos flush, sidebar |
| `shadow-xs` | `0 1px 2px rgba(15,76,92,0.06)` | Inputs em repouso |
| `shadow-soft` | `--shadow-soft` (multi-camada + inset highlight) | Cards padrão |
| `shadow-lift` | `--shadow-lift` | Cards hover, dropdowns |
| `shadow-glow` | `--shadow-glow` (accent tint) | CTAs hero, onboarding |
| `shadow-modal` | `0 32px 64px -24px rgba(15,76,92,0.32)` | Modais, popovers |
| `shadow-sticky` | `0 -8px 24px -12px rgba(15,23,42,0.15)` | Footer sticky de wizard |

### Glassmorphism (uso restrito)

Utilitários `glass`, `glass-strong`, `glass-card` — aplicar **somente** em:

- Topbar mobile
- Overlays flutuantes
- Painéis sobre background aurora

**Proibido** em listas densas, tabelas clínicas e formulários longos (prejudica legibilidade).

---

## 6. Cores

### Paleta institucional FisioOS (default)

| Token | HEX | OKLCH (ref.) | Semântica |
|-------|-----|--------------|-----------|
| `--fos-primary` | `#0F4C5C` | `oklch(0.40 0.06 200)` | Marca, ações primárias, sidebar accent |
| `--fos-primary-soft` | `#1B4965` | — | Hover, variantes UI |
| `--fos-secondary` | `#2BB673` | `oklch(0.70 0.16 162)` | Saúde, sucesso clínico, progresso |
| `--fos-accent` | `#00A6A6` | — | Indicador ativo sidebar, links |
| `--fos-accent-blue` | `#4F9CF9` | — | Destaques tecnológicos, charts |
| `--fos-bg` | `#F6F8FB` | — | Fundo da aplicação |
| `--fos-bg-deep` | `#EEF2F6` | — | Superfícies alternativas |
| `--fos-ink` | `#1D2939` | — | Texto principal |
| `--fos-ink-soft` | `#64748B` | — | Texto secundário |
| `--fos-sidebar-bg` | `#082436` | — | Sidebar institucional |

### Cores semânticas

| Token | HEX | Uso |
|-------|-----|-----|
| `success` | `#059669` | Confirmações, status positivo |
| `warning` | `#F59E0B` | Alertas, pendências |
| `danger` / `destructive` | `#DC2626` | Erros, exclusões |
| `info` | `#4F9CF9` | Informação neutra |

### Superfícies

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `--fos-bg` | Body |
| `card` | `#FFFFFF` | Cards sobre aurora |
| `muted` | `#F1F5F9` | Backgrounds de input |
| `popover` | `#FFFFFF` | Dropdowns, tooltips |

### Aurora (background ambiente)

Gradientes radiais sutis (`--fos-aurora`) combinando primary, secondary e accent com opacidade ≤ 26%. Fixo no body — **não animar agressivamente**.

### Contraste mínimo (WCAG 2.1 AA)

| Par | Ratio mínimo |
|-----|--------------|
| Texto corpo sobre `background` | 4.5:1 |
| Texto grande (≥18 px) sobre `background` | 3:1 |
| Texto sobre `primary` (botão) | 4.5:1 |
| Ícones interativos | 3:1 |

### Dark mode (fase futura)

Tokens dark já esboçados em `styles.css`. Ativação prevista na Fase 4 do roadmap — manter paridade semântica, não paridade hex.

---

## 7. Ícones

### Biblioteca oficial

**Lucide React** — stroke-based, consistência com Linear/Notion.

### Tamanhos

| Contexto | Tamanho | Stroke |
|----------|---------|--------|
| Inline (label) | 14 px | 1.75 |
| Nav sidebar | 18 px | 1.75 |
| Botão icon | 16–20 px | 2 |
| Empty state hero | 48 px | 1.5 |
| KPI accent | 20 px | 2 |

### Regras

- **Cor:** Herdar `currentColor` ou `--muted-foreground`; nunca multicolor inline.
- **Preenchimento:** Proibido (exceto logos e ilustrações de empty state).
- **Pares semânticos:** Usar ícones clínicos reconhecíveis (`Stethoscope`, `ClipboardList`, `Activity`) — evitar metáforas genéricas (`Box`, `Folder`).
- **PDF:** Ícones mini via `drawMiniIcon` no motor legado; DS usa tipografia e faixas coloridas preferencialmente.

---

## 8. Componentes

Padrões normativos para cada superfície. Implementação futura deve convergir para estes specs.

### Header (topbar)

| Propriedade | Especificação |
|-------------|---------------|
| Altura | 64 px (desktop) / 64 px (mobile fixed) |
| Background | `glass-topbar` (mobile) / transparente sobre conteúdo (desktop) |
| Conteúdo | Busca global (⌘K) · Notificações · Avatar · Nome clínica |
| Logo | `ClinicLogo` 48×48 — `object-contain`, nunca crop |
| Tipografia nome | `heading-sm`, cor `primaryColor` white label |

### Sidebar

Ver [Seção 10 — Redesign conceitual](#10-sidebar--redesign-conceitual).

### Cards

| Variante | Spec |
|----------|------|
| **Padrão** | `rounded-2xl`, border `slate-200/80`, bg white, `shadow-soft` |
| **Info** | + faixa superior 4 px `primary` |
| **KPI** | Número `kpi-hero`, label `body-sm`, trend badge |
| **Interativo** | Hover `shadow-lift`, cursor pointer, focus ring |
| **Compacto** | Padding 16 px, radius `lg` |

### Botões

| Variante | Background | Texto | Radius | Altura |
|----------|------------|-------|--------|--------|
| Primary | `primary` | `primary-foreground` | 12 px | 44 px |
| Secondary | transparent | `primary` | 12 px | 44 px + border |
| Ghost | transparent | `foreground` | 12 px | 40 px |
| Destructive | `destructive` | white | 12 px | 44 px |
| Icon | ghost | — | 12 px | 40×40 px |

Estados: hover (−8% luminosidade), focus (`ring-2 ring-primary ring-offset-2`), disabled (50% opacity), loading (spinner + label preservado).

### Inputs

| Propriedade | Valor |
|-------------|-------|
| Altura | 44 px (`h-11`) |
| Radius | 12 px |
| Background | `slate-50/70` |
| Border | `slate-200` |
| Focus | `ring-2 ring-primary/30`, sem offset |
| Label | `body-sm`, acima, 8 px gap |
| Erro | border `destructive`, hint `body-sm` vermelho |

### KPIs

- Grid: 2 colunas mobile → 4 desktop (`KpiGrid`).
- Card: valor grande tabular, label muted, opcional trend (↑↓ com cor semântica).
- Sparkline opcional (Fase 3) — cor `secondary`.

### Empty States

| Elemento | Spec |
|----------|------|
| Ilustração | Ícone 48 px em círculo `muted` ou ilustração leve |
| Título | `display-lg` |
| Descrição | `body-md`, `muted-foreground`, max 320 px width |
| Ação | Botão primary opcional |
| Tom | Acolhedor, orientador — nunca culpar o usuário |

### Skeletons

- Pulse suave, cor `muted` → `muted/60`.
- Forma espelha o componente final (text lines, card rects, avatar circle).
- **ClinicalSkeleton** como referência de implementação futura.

### Modais

| Propriedade | Valor |
|-------------|-------|
| Max-width | `sm` 400 / `md` 560 / `lg` 720 / `xl` 900 px |
| Radius | 28 px (`radius-2xl`) |
| Overlay | `black/40` + blur 4 px |
| Header | Título `heading-sm` + close icon |
| Footer | Ações alinhadas à direita, gap 12 px |

### Wizards

| Elemento | Spec |
|----------|------|
| Stepper | Horizontal (desktop) / compact dots (mobile) |
| Step ativo | Cor `primary`, label visível |
| Step completo | Check `success` |
| Conteúdo | Card central max 720 px |
| Footer sticky | `shadow-sticky`, botões Voltar + Continuar |
| Progresso | Barra fina 2 px abaixo do stepper |

### PDFs (UI de preview)

- Botões distintos: **"Abrir PDF arquivado"** vs **"Pré-visualizar layout atual"**.
- Preview inline: iframe ou modal com toolbar mínima.
- Toasts explicativos quando layout difere do arquivo arquivado.

---

## 9. White Label

### Princípio

> A clínica é protagonista. O FisioOS é a infraestrutura confiável.

White label adapta **identidade**, não **estrutura**. Grids, componentes e hierarquia permanecem iguais.

### Elementos adaptáveis

| Elemento | Fonte | Onde aparece |
|----------|-------|--------------|
| Logo | `clinic_settings.logo_url` | Sidebar, header, PDF, login |
| Nome | `nome_fantasia` | Sidebar, header, documentos |
| Slogan | `slogan` | Sidebar footer, login, PDF header |
| Cor primária | `primary_color` (HEX) | Botões, links, faixas, sidebar accent |
| Cor secundária | `secondary_color` (HEX) | Gradientes, KPIs, badges sucesso |
| Rodapé institucional | `rodape_institucional` | PDFs, recibos |

### Elementos fixos FisioOS

- Estrutura de navegação e nomenclatura de módulos
- Tipografia, espaçamentos, radius, sombras
- Ícones Lucide e layout de componentes
- Badge discreto **"Powered by FisioOS"** em login e rodapé de sidebar (quando clínica tem logo própria)
- Motor de PDF (`fisioos-ds`) — grid e componentes fixos; cores e logo mutáveis

### Regras de adaptação de cor

1. Validar contraste AA após substituição.
2. Derivar variantes `-soft`, `border`, `surfaceAlt` via mix com branco (20–40%) — nunca usar primária pura em grandes superfícies.
3. Sidebar permanece fundo escuro institucional (`#082436`); accent usa cor primária da clínica no indicador ativo.
4. Proibido: gradientes berrantes, logos distorcidas, slogans > 80 caracteres no header.

### Fallback institucional

Quando clínica não tem logo: monograma com gradiente `primary → secondary` + nome. Nunca exibir logo de outra clínica.

---

## 10. Sidebar — Redesign conceitual

> **Escopo:** Documentação apenas. Nenhuma implementação nesta fase.

### Problema atual

A sidebar funciona como **lista de menus** — agrupamentos textuais ("Principal", "Prontuários", "Documentos") com ícones alinhados. Funcional, porém genérica: não transmite que o profissional está dentro de um **sistema clínico institucional**.

### Visão: "Clinical Command Center"

A sidebar deixa de ser um índice de links e passa a ser um **painel de identidade + navegação contextual**.

```
┌─────────────────────────────┐
│  ┌────┐  MOVE+ Fisioterapia │  ← Bloco identidade (logo + nome + slogan curto)
│  │logo│  São Paulo · SP      │
│  └────┘                      │
├─────────────────────────────┤
│  ● Painel                    │  ← Zona "Hoje" (3–4 itens de alto uso)
│    Agenda                    │
│    Pacientes                 │
├─────────────────────────────┤
│  PRONTUÁRIO                  │  ← Zona clínica (label sutil, não menu)
│  ○ Avaliações          (3)   │  ← Badge contagem opcional
│  ○ Evoluções                 │
│  ○ Reavaliações              │
│  ○ Altas                     │
├─────────────────────────────┤
│  DOCUMENTOS                  │
│  ○ Emissão                   │
│  ○ Biblioteca                │
├─────────────────────────────┤
│  GESTÃO                      │  ← Colapsável para não-admins
│  ○ Indicadores               │
│  ○ Financeiro                │
├─────────────────────────────┤
│  ┌──────────────────────┐   │
│  │  Dra. Ana · Admin    │   │  ← Card usuário compacto
│  │  ⚙ Configurações     │   │
│  └──────────────────────┘   │
│  Powered by FisioOS          │  ← Marca plataforma (discreta)
└─────────────────────────────┘
```

### Pilares do redesign

| Pilar | Descrição |
|-------|-----------|
| **Identity block** | Topo dedicado: logo grande (64 px), nome clínica, cidade, slogan truncado. Fundo levemente mais claro que sidebar (`+4% luminance`). |
| **Zonas, não grupos** | Labels em caps pequenas (`label` token), espaçamento generoso entre zonas. Separadores hairline, não bordas pesadas. |
| **Indicador ativo** | Barra lateral 3 px cor accent + background `sidebar-accent` — nunca apenas bold text. |
| **Contexto vivo** | Badges numéricos discretos (pendências, rascunhos). Sem animação contínua. |
| **Modo compacto** | Colapsado: logo monograma + ícones + tooltips. Identity block vira avatar da clínica. |
| **Institucional** | Sidebar escura (`#082436`) contrasta com conteúdo claro — sensação "console profissional". |

### Dimensões propostas

| Estado | Largura |
|--------|---------|
| Expandida | 280 px |
| Compacta | 72 px |
| Mobile | Drawer overlay — mesma hierarquia |

### O que NÃO muda (conceitual)

- Rotas e permissões existentes
- Itens admin/super-admin/feature flags
- Ordem funcional dos módulos

---

## 11. PDFs — Princípios visuais

> **Escopo:** Especificação apenas. Nenhuma alteração nos documentos nesta fase.

Referência técnica complementar: [`docs/auditorias/document-design-system.md`](../auditorias/document-design-system.md).

### Princípios

| # | Princípio | Descrição |
|---|-----------|-----------|
| 1 | **Institucional primeiro** | Documento deve parecer emitido por clínica de alto padrão, não export de software |
| 2 | **Hierarquia clara** | Header premium → seções card → assinaturas → rodapé validação |
| 3 | **Legibilidade** | Corpo ≥ 9.5 pt, line-height 14 pt, contraste P&B |
| 4 | **White label nativo** | Logo, cores, dados clínica — grid fixo |
| 5 | **Validação humana** | QR e hash com linguagem amigável ("Verifique a autenticidade") |
| 6 | **Separação dados/apresentação** | Builders não conhecem layout; motor `fisioos-ds` renderiza |

### Estrutura visual padrão

```
┌──────────────────────────────────────────────────┐
│ ▌ LOGO   Clínica          ┌─────────────────┐  │
│          CNPJ · endereço  │ Card documento  │  │
│          tel · email      │ paciente · data │  │
│                           └─────────────────┘  │
├──────────────────────────────────────────────────┤
│  ┌─ Seção 1 ─────────────────────────────────┐ │
│  │ Título                                       │ │
│  │ Corpo jurídico/clínico                       │ │
│  └──────────────────────────────────────────────┘ │
│  ┌─ Seção 2 ─────────────────────────────────┐ │
│  ...                                             │
├──────────────────────────────────────────────────┤
│  Assinaturas                                     │
│  QR · Rodapé · Página X de Y                     │
└──────────────────────────────────────────────────┘
```

### Paridade UI ↔ PDF

| UI Token | PDF Token |
|----------|-----------|
| `--fos-primary` | `DS_COLORS_BASE.primary` |
| `--fos-secondary` | `DS_COLORS_BASE.secondary` |
| `--fos-ink` | `DS_COLORS_BASE.ink` |
| `radius-xl` (20 px) | `sectionRadius` (10 pt ≈ proporção) |
| `body-md` (14 px) | `body` (9.5 pt print) |

### Status de migração documental

| Documento | Layout atual | Meta |
|-------------|--------------|------|
| Contrato | `fisioos-ds` | ✅ Piloto |
| Avaliação | `clinical-premium` | Migrar Fase 5 |
| Evolução | `clinical-premium` | Migrar Fase 5 |
| Reavaliação | `clinical-premium` | Migrar Fase 5 |
| Alta | `clinical-premium` | Migrar Fase 5 |
| Declarações | `legacy` / mixed | Migrar Fase 6 |
| Recibos | receipt engine | Migrar Fase 6 |

---

## Guia de identidade visual

Resumo executivo para materiais de marca, onboarding e parceiros.

### Logo

| Contexto | Tamanho mínimo | Clear space |
|----------|----------------|-------------|
| Sidebar expandida | 48 px | 8 px |
| Login / marketing | 120 px | 24 px |
| PDF header | 132×124 pt box | 16 pt |
| Favicon | 32 px | 4 px |

- Formato preferido: PNG transparente ou SVG.
- **Proibido:** distorção, fundo opaco colorido, sombra drop externa.

### Uso de cor

- **60%** neutros (bg, card, muted)
- **30%** primária (sidebar accent, headers, CTAs)
- **10%** secundária + semânticas (destaques, status)

### Voz visual

| Fazer | Evitar |
|-------|--------|
| Espaço em branco generoso | Tabelas densas sem respiro |
| Tipografia Inter consistente | Fontes decorativas |
| Fotos reais de clínicas (marketing) | Stock genérico hospital |
| Gradientes sutis aurora | Gradientes neon |
| Ícones stroke Lucide | Emojis como ícones UI |

### Marca em documentos impressos

Rodapé discreto: *"Emitido via FisioOS"* — somente quando clínica opt-in; padrão é rodapé da clínica.

---

## Guia de componentes

Catálogo normativo — cada componente deve convergir para esta spec na implementação.

| Componente | Status atual | Spec section | Prioridade |
|------------|--------------|--------------|------------|
| `PageHeader` | Parcial | §8 Header | P1 |
| `PageSection` | Parcial | §3 Espaçamentos | P1 |
| `InfoCard` | Parcial | §8 Cards | P1 |
| `KpiCard` / `KpiGrid` | Parcial | §8 KPIs | P2 |
| `EmptyState` | Parcial | §8 Empty States | P2 |
| `ClinicalSkeleton` | Parcial | §8 Skeletons | P2 |
| `StatusBadge` | Parcial | §6 Cores semânticas | P1 |
| `AppShell` / Sidebar | Legacy | §10 Sidebar | P1 |
| `Button` (ui) | shadcn | §8 Botões | P2 |
| `Input` (ui) | shadcn | §8 Inputs | P2 |
| `Dialog` (ui) | shadcn | §8 Modais | P2 |
| Wizard (documentos) | Custom | §8 Wizards | P3 |

### Anatomia padrão de página

```
AppShell
└── PageSection
    ├── PageHeader (title + description + PageActions)
    ├── PageBreadcrumb (opcional)
    ├── KpiGrid (opcional)
    ├── Conteúdo (cards, tabelas, forms)
    └── Sticky footer (wizards/forms longos)
```

### Tokens CSS alvo (implementação Fase 2)

Consolidar em `:root` com prefixo `--fos-*`:

- `--fos-space-*` (escala §3)
- `--fos-radius-*` (escala §4)
- `--fos-shadow-*` (escala §5)
- `--fos-text-*` (escala §2)

Eliminar valores hardcoded em `clinical-classes.ts` gradualmente.

---

## Guia de documentos

Especificação visual para o **Document Design System** (`fisioos-ds`).

### Camadas (inalteráveis)

1. **Tokens** — `DS_TYPOGRAPHY`, `DS_SPACING`, `DS_COLORS_BASE`
2. **Theme** — `createDocumentTheme(clinic)` white label
3. **Components** — Header, SectionCard, Footer, Signature, Badge…
4. **Engine** — `renderFisioosDsDocument()`

### Componentes documentais

| Componente | Responsabilidade |
|------------|------------------|
| Header Premium | Identidade clínica + card metadados documento |
| Running Header | Páginas 2+ compactas |
| SectionCard | Cláusulas / seções clínicas |
| InfoGrid | Pares label-valor |
| SignatureArea | Contratante, contratada, testemunhas |
| Footer institucional | Confidencialidade, paginação |
| Validation QR | Autenticidade amigável |

### Formatos suportados

| Formato | Dimensões | Notas |
|---------|-----------|-------|
| A4 | 595×842 pt | Padrão BR |
| Carta | 612×792 pt | Fase 6 — variante theme |
| P&B | — | Bordas + tipografia, não dependência de cor |
| Digital | — | Links clicáveis (fase futura) |

### Checklist visual QA (documento)

- [ ] Logo centralizada no box, sem fundo preto
- [ ] Card documento alinhado à direita do header
- [ ] Seções com faixa superior primary
- [ ] Numeração de cláusulas consistente
- [ ] Assinaturas na última página, acima do rodapé
- [ ] QR legível, texto não técnico
- [ ] Paginação "Página X de Y"
- [ ] White label: cores clínica aplicadas, grid intacto

---

## Roadmap da implementação visual

Roadmap em fases — **sem alteração de lógica de negócio**. Cada fase exige `npm run build` verde e QA visual.

### Fase 1 — Branding ✅ (atual)

- [x] Especificação Design Language (`FISIOOS_DESIGN_LANGUAGE.md`)
- [x] Definição tokens, componentes, sidebar conceitual, PDFs
- [ ] Aprovação stakeholders

### Fase 2 — Tokens & Fundações CSS

- Consolidar tokens `--fos-*` em `styles.css`
- Harmonizar paleta (`#0F4C5C` vs `#1B4965` → canonical)
- Exportar tokens TypeScript (`src/lib/design-tokens.ts`) espelhando CSS
- Documentar mapping Tailwind ↔ tokens
- **Entregável:** Storybook ou página `/design-system` interna (opcional)

### Fase 3 — Componentes base

- Refatorar `Button`, `Input`, `Badge` para tokens
- Unificar `EmptyState`, `ClinicalSkeleton`, `StatusBadge`
- Implementar `PageHeader` + `PageSection` como layout obrigatório
- Migrar 2–3 telas piloto (Painel, Pacientes)
- **Entregável:** Lint/regra ESLint proibindo valores arbitrários de spacing/font

### Fase 4 — Sidebar institucional

- Implementar redesign §10 (Identity block, zonas, indicador)
- Modo compacto refinado + tooltips
- Badge "Powered by FisioOS"
- QA mobile drawer
- **Entregável:** Sidebar aprovada visualmente

### Fase 5 — Documentos clínicos PDF

- Migrar Avaliação → `fisioos-ds`
- Migrar Evolução, Reavaliação, Alta
- Paridade cores UI ↔ PDF
- QA impressão P&B
- **Entregável:** Suite PDF clínica unificada

### Fase 6 — Documentos restantes & polish

- Declarações, Recibos → `fisioos-ds`
- Formato Carta
- Dark mode UI (opcional)
- Auditoria WCAG completa
- **Entregável:** 100% documentos no motor DS

### Fase 7 — Marketing & White label avançado

- Login/landing alinhados à Design Language
- Preview de branding em tempo real (config clínica)
- Kit parceiro (logos, cores, templates)
- **Entregável:** Guia white label para parceiros

---

## Governança

| Ação | Responsável | Critério |
|------|-------------|----------|
| Alterar token oficial | Product + Design | PR com before/after |
| Novo componente | Eng + Design | Spec neste doc antes de código |
| Exceção visual | — | Documentar + ticket de convergência |
| White label clínica | Admin clínica | Validação contraste automática |

---

## Referências internas

| Recurso | Caminho |
|---------|---------|
| CSS tokens atuais | `src/styles.css` |
| Branding runtime | `src/lib/branding.ts` |
| Layout clínico | `src/components/layout/` |
| PDF Document DS | `src/lib/pdf-engine/design-system/` |
| Doc PDF arquitetura | `docs/auditorias/document-design-system.md` |

---

*FisioOS Design Language v1.0 — Fase 1 Branding · Documento normativo · Não implementa funcionalidades.*
