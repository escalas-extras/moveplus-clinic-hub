Auditoria PDF — modo somente leitura
Escopo analisado: pdf-engine.ts, pdf-builders.ts, pdf.ts, library-pdf.ts, receipt-pdf.ts.

Visão arquitetural
Há dois motores paralelos:

Camada	Papel
pdf-engine.ts
Renderer puro jsPDF — átomos, medição, composição, paginação
pdf.ts
Wrapper Supabase — branding, logo, validação profissional, upload
pdf-builders.ts
Builders de domínio clínico (avaliação, evolução)
library-pdf.ts
Markdown → PdfBlock[] para biblioteca
receipt-pdf.ts
Renderer independente para recibos financeiros
Fluxo principal: builders → buildPdf() → renderPdf(). Recibos não passam pelo engine compartilhado.

Classificação por item
Arquitetura — ALTO
Pontos fortes

Separação engine puro / wrapper Supabase é sólida.
Modelo declarativo (PdfBlock / PdfContent) facilita novos documentos.
White-label por clinicId explícito evita vazamento entre clínicas.
Riscos

receipt-pdf.ts duplica logo, cores, layout e helpers (~445 linhas paralelas).
pdf-builders.ts usa any extensivamente — frágil e difícil de evoluir.
QR reservado só em contratos (isContract), mas validationHash também é usado em altas — risco de colisão layout.
Paginação — ALTO
Pontos fortes

Pipeline medir → compor → desenhar com átomos.
Parágrafos quebram linha a linha (para-line).
Regra de headroom (título + ~4 linhas) reduz títulos órfãos.
Compactação progressiva de gaps (BLOCK_GAP → COMPACT → TIGHT).
Riscos

Blocos indivisíveis (grid-row, highlight, eva, evolution, checks-row) saltam inteiros para a próxima página → grandes áreas vazias.
compose() pode rodar até 3 vezes — custo multiplicado em dossiês grandes.
Quebras de página — ALTO
Continuações com título "(continuação)" — bom para rastreabilidade.
Sem repetição de cabeçalho de bloco/tabela em páginas seguintes.
Assinatura ancorada só na última página; conteúdo longo não leva assinatura intermediária (esperado, mas limita dossiês parciais).
Legibilidade — MÉDIO
Pontos fortes

Hierarquia visual clara (títulos, highlights, labels).
Empty-state filtering (isEmptyText) evita ruído.
Riscos

Labels em UPPERCASE + Helvetica reduzem conforto em textos longos.
Densidade alta em contratos (muitas cláusulas sequenciais).
receipt-pdf.ts usa emojis (📍, ✆) — renderização inconsistente entre viewers/impressoras.
Tipografia — MÉDIO
Tokens tipográficos centralizados (T.docTitle, T.body, etc.) — bom.
Somente Helvetica — sem serif para contratos longos, sem variantes de acessibilidade.
Tamanhos fixos em pt; sem escala por preferência do usuário.
Cabeçalhos — ALTO
Pontos fortes

Header premium na 1ª página (logo, metadados, card do documento).
Branding dinâmico por clínica.
Riscos

Header não se repete nas páginas 2+ — em PDFs de 20–100+ páginas, perde-se contexto (paciente, título, clínica).
Páginas seguintes começam em M+8 vs. ~186pt na 1ª — salto de área útil perceptível.
Rodapés — MÉDIO
Rodapé em todas as páginas com numeração Página X de Y — bom.
Texto de confidencialidade repetido — adequado clinicamente.
Altura fixa FOOTER_H: 42 — pode competir com QR/assinatura na última página.
Tabelas — ALTO
“Tabelas” são grid-row (pares label/valor), não tabelas reais.
Sem cabeçalho de coluna persistente, sem split de linha entre páginas.
Grids densos (ficha geriátrica, hábitos) podem gerar blocos altos indivisíveis.
Dossiês clínicos — CRÍTICO
buildAssessmentPdfOpts agrega:

Identificação, diagnósticos, anamnese, exame, ficha geriátrica, EVA, plano
Todas as evoluções vinculadas na seção 8
Com paciente de longo tratamento, um único PDF pode virar dossiê de dezenas/centenas de páginas, sem:

limite de evoluções
paginação dedicada de dossiê
sumário / índice
geração incremental ou streaming
Relatórios clínicos — MÉDIO
Alta (discharge-panel) usa engine compartilhado — consistente.
Emissão via documentos.tsx (templates + merge tags) — flexível.
validationHash gerado na emissão de documentos clínicos — bom.
Avaliações/evoluções avulsas não recebem hash/QR por padrão nos builders.
Escalabilidade — CRÍTICO
Tudo em memória: átomos + jsPDF completo.
Sem workers, fila ou cache de logo entre documentos.
Builders acoplados a arrays completos (allEvolutions).
Novos tipos exigem estender PdfContent + measureBlock + renderPageContent (3 pontos).
PDFs acima de 100 páginas — CRÍTICO
Riscos concretos:

Memória do browser — blob jsPDF grande pode travar aba.
Tempo — tripla composição + medição de cada bloco.
EVA desenha 90 retângulos por instância (drawSegmentedEvaGradient).
Header ausente dificulta navegação em dossiês longos.
Sem testes automatizados de stress para volume.
Funciona tecnicamente via jsPDF, mas não há desenho explícito para esse volume.

Desempenho — ALTO
Operação	Impacto
loadClinicLogo + canvas matte removal
Alto por PDF (fetch + decode)
measureBlock + splitTextToSize
Alto em blocos textuais longos
compose × até 3
Médio/alto
Loop footers 1..pageCount
Baixo
Geração EVA gradient
Médio por bloco
Lote de recibos (loop sequencial)
Alto (N × logo + render)
Reutilização — ALTO
Bom: biblioteca, documentos, avaliações, evoluções, altas → mesmo engine.

Ruim: receipt-pdf.ts é ilha completa; lógica de branding/logo duplicada entre pdf.ts e receipt-pdf.ts.

Assinaturas — MÉDIO
Validação via validateProfessionalForDoc antes de gerar — bom.
Contrato: bloco completo (contratante, contratada, testemunhas).
Clínico padrão: assinatura profissional centralizada.
Biblioteca: hideSignature: true — correto.
Assinatura impressa como texto, não imagem de assinatura digital.
QR Code — MÉDIO
Gerado com qrcode na última página quando validationHash presente.
Espaço reservado (qrReserve: 64) só se isContract === true.
Altas passam validationHash mas título não é contrato → QR pode sobrepor rodapé/assinatura (inconsistência layout).
Hash — MÉDIO
Hash gerado em documentos.tsx (48 hex chars) e persistido em clinical_documents.
Alta usa d.validation_hash do banco.
Avaliação/evolução direta (paciente) não inclui hash no PDF.
URL: /validar/{hash} — depende de rota externa funcionando.
Imagens — MÉDIO
Pontos fortes

Logo com fitRect, remoção de matte (browser), fallback monograma.
Rejeita WEBP transparente no PDF.
Riscos

Matte removal só no browser (typeof window) — divergência server-side.
Sem suporte a imagens clínicas inline (fotos, exames) nos builders.
Markdown da biblioteca não embeda imagens.
Geração em lote — ALTO
Não existe API de lote no engine.
Recibos: loop sequencial for (const r of rows) await downloadReceiptPdf(...).
Cada chamada refaz branding/logo.
Sem progresso, cancelamento ou deduplicação de contexto.
Compatibilidade com impressão — MÉDIO
Pontos fortes

PDF vetorial jsPDF — imprime bem na maioria dos casos.
printPdf abre blob real (não window.print() de HTML).
Riscos

printPdf abre aba e dispara download — UX confusa.
Margens/cabeçalho fixos podem cortar em impressoras com área não imprimível grande.
QR pequeno (44pt) pode falhar leitura em impressão de baixa qualidade.
Matriz resumida
Item	Classificação
Arquitetura
ALTO
Paginação
ALTO
Quebras de página
ALTO
Legibilidade
MÉDIO
Tipografia
MÉDIO
Cabeçalhos
ALTO
Rodapés
MÉDIO
Tabelas
ALTO
Dossiês clínicos
CRÍTICO
Relatórios clínicos
MÉDIO
Escalabilidade
CRÍTICO
PDFs 100+ páginas
CRÍTICO
Desempenho
ALTO
Reutilização
ALTO
Assinaturas
MÉDIO
QR Code
MÉDIO
Hash
MÉDIO
Imagens
MÉDIO
Geração em lote
ALTO
Compatibilidade impressão
MÉDIO
Plano de melhorias (sem implementação)
Fase 1 — Crítico (estabilidade e dossiês)
Limitar ou paginar dossiê de avaliação

Separar “Avaliação” de “Histórico de evoluções” (PDFs distintos ou seção opcional).
Cap configurável de evoluções por PDF + aviso na UI.
Stress test 100+ páginas

Fixture automatizada medindo tempo, memória e page count.
Baseline antes de otimizar.
Header running em páginas 2+

Faixa compacta: clínica, paciente, título, página.
Reduz desorientação em dossiês longos.
Corrigir reserva de QR

Reservar espaço sempre que validationHash existir (não só contratos).
Evitar sobreposição QR × rodapé × assinatura.
Fase 2 — Alto (arquitetura e performance)
Unificar recibos no engine ou extrair primitives compartilhadas

Logo loader, paleta, footer, numeração — um único módulo.
Eliminar duplicação receipt-pdf.ts / pdf.ts.
Split de átomos indivisíveis

Permitir que grid-row, highlight e evolution quebrem internamente.
Reduzir whitespace em quebras.
Cache de contexto de render

PdfRenderCtx (clínica + logo) reutilizado em lote.
Especialmente para recibos e exportações múltiplas.
Tipagem forte em pdf-builders.ts

Substituir any por tipos de assessment/evolution/patient.
Reduz regressões silenciosas.
API de lote

buildPdfBatch(items, sharedCtx) com progress callback.
Opcional: Web Worker para não bloquear UI.
Fase 3 — Médio (qualidade clínica e conformidade)
Hash/QR unificado

Política clara: quais documentos recebem hash (avaliação, evolução, alta, contrato).
Exibir hash truncado no rodapé além do QR.
Tipografia e legibilidade

Revisar uppercase sistemático em labels.
Aumentar line-height em parágrafos longos (contratos, anamnese).
Tabelas clínicas

Introduzir kind: "table" com header repetido e split de linha.
Especialmente ficha geriátrica e sinais vitais.
Imagens

Suporte a imagens em markdown (biblioteca).
Paridade server-side para limpeza de logo.
Impressão

printPdf: só abrir preview ou só download — não ambos.
Margens de segurança configuráveis (printSafeMargin).
Assinaturas

Opcional: imagem de assinatura/carimbo quando disponível.
Manter fallback textual atual.
Fase 4 — Baixo / evolutivo
Sumário automático em dossiês > N páginas.
Metadados PDF (autor, subject, keywords).
Acessibilidade: tags PDF/UA (longo prazo).
Preview paginado na UI antes de download em documentos grandes.
Conclusão
O motor V2 (pdf-engine.ts) é maduro para documentos clínicos típicos (5–30 páginas): paginação inteligente, branding, assinaturas e contratos premium. Os gargalos críticos concentram-se em dossiês longos (avaliação + todas evoluções), escala 100+ páginas, duplicação arquitetural com recibos e inconsistência QR/hash fora de contratos.

Nenhum arquivo foi alterado nesta análise.

