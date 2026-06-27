1. Auditoria (somente leitura)
Dois domínios de “recibo” coexistem
Domínio	Onde	Tabela	Propósito
Recibos de paciente (V1)
/app/financeiro → tab Recibos
receipts
Recibo clínico por lançamento/paciente
Recibos Extra Flow (novo)
/app/recibos
recibos, extras, pagamentos
Repasse semanal de extras por profissional
Extra Flow — estado atual
Item	Status
src/lib/recibos.functions.ts
Existe — gerarRecibosPagamento, listRecibosPagamento, listExtrasPagasSemRecibo
pagamento_id como referência principal
Implementado — todas as queries escopadas por pagamento_id
semana_ref informativa
Implementado — exibida na UI, não filtra elegibilidade
arquivado_em + filtro Pendentes/Arquivados/Todos
Implementado
Card “Última geração” + lote PDF/impressão
Implementado
Seção “Extras pagas sem recibo” (read-only)
Implementado
Types Supabase (types.ts)
Ausentes — tabelas pagamentos, extras, recibos não estão nos types gerados
Migrations locais
Nenhuma criada (conforme proibição)
Recibos de paciente (Financeiro) — inalterado

financeiro.tsx
Lines 309-327
function RecibosTab({ clinicId, supportMode }: { clinicId: string | null; supportMode: boolean }) {
  // ...
  const list = useQuery({
    queryKey: ["receipts", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
Lista plana, sem pagamento_id, sem batch, PDF client-side via receipt-pdf.ts. Não foi alterado nesta correção.

2. Implementação — conformidade com a spec
1. src/lib/recibos.functions.ts

recibos.functions.ts
Lines 244-248
  return {
    reciboIdsCriados,
    reciboIdsComplementados,
    reciboIds: mergeReciboIds(reciboIdsCriados, reciboIdsComplementados),
  };
Agrupa extras por professional_id dentro do pagamento_id
Filtra extras por pagamento_id + status pago / aprovado_financeiro — sem filtro por semana_ref
Complementa recibo ativo existente ou cria novo
Não altera status, aprovação nem geração de extras pendentes
2. Tela /app/recibos
Card “Última geração” com criados / complementados / total afetado
Botões “Imprimir última geração” e “Baixar PDF última geração”
Botões por linha Ver / Baixar / Imprimir mantidos
3. Filtro de visibilidade
Pendentes → arquivado_em IS NULL
Arquivados → arquivado_em IS NOT NULL
Todos → sem filtro de arquivo
Sempre escopado ao pagamento_id selecionado
4. “Extras pagas sem recibo”
Read-only, sem ações de edição
Status pago / aprovado_financeiro sem recibo ativo
Sem filtro por semana_ref — inclui retroativas
Arquivos alterados/criados
Arquivo	Papel
src/lib/recibos.functions.ts
Lógica Extra Flow
src/routes/_authenticated/app/recibos.tsx
Tela de recibos
src/components/app-shell.tsx
Item de menu “Recibos”
src/routeTree.gen.ts
Regenerado pelo build
Resumo da lógica
Usuário seleciona um fechamento (pagamento_id).
Gerar recibos busca extras pagas/aprovadas daquele pagamento, agrupa por profissional, complementa ou cria recibos.
Retorno estruturado alimenta o card Última geração (persistido em sessionStorage).
Lista de recibos respeita filtro Pendentes/Arquivados/Todos via arquivado_em.
Seção inferior lista extras pagas ainda sem recibo ativo, de qualquer semana.
Riscos
Schema local ausente — types.ts não declara pagamentos, extras, recibos; queries usam cast. Em ambiente sem essas tabelas, a tela retorna erro do Supabase.
Dois módulos de recibo — risco de confusão entre /app/financeiro (paciente) e /app/recibos (Extra Flow).
PDF reutiliza template de paciente (receipt-pdf.ts) — funcional, mas sem layout dedicado a repasse de extras.
Última geração em sessionStorage — perdida ao fechar a aba.
Testes manuais sugeridos
Abrir /app/recibos como admin com clínica ativa.
Selecionar fechamento e clicar Gerar recibos do pagamento.
Verificar card Última geração (contadores + botões de lote).
Alternar Pendentes / Arquivados / Todos e confirmar filtro por arquivado_em.
Conferir seção Extras pagas sem recibo (somente leitura, extras antigas visíveis).
Testar Ver / Baixar / Imprimir por linha.
Confirmar que /app/financeiro → tab Recibos continua igual.
Resultado de testes/lint executados
Comando	Resultado
npx eslint src/lib/recibos.functions.ts src/routes/_authenticated/app/recibos.tsx
OK
npm run build
OK (exit 0, ~2.6s)
Nenhuma alteração adicional foi necessária — a correção preventiva mínima já está implementada. Se as tabelas em produção tiverem nomes/colunas diferentes dos assumidos (pagamentos, extras, recibos), posso ajustar os mappers sem migration; basta confirmar o schema real.