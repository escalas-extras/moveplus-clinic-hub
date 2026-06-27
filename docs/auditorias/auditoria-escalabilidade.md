Implemente apenas a FASE 1.

Não criar migration.
Não alterar banco.
Não alterar regras financeiras.
Não alterar geração de pagamentos.
Não alterar geração de extras.
Não alterar RLS.
Não alterar o fluxo recém-estabilizado de pagamento_id.

Objetivo:

Melhorar a segurança operacional da emissão de recibos.

1. Modal de confirmação antes da geração

Ao clicar em "Gerar recibos pendentes", abrir um modal mostrando:

- quantidade de extras
- quantidade de colaboradores
- quantidade de recibos novos
- quantidade de recibos que serão complementados
- valor total
- aviso quando houver extras retroativas

Texto:

"Confirme a emissão dos recibos deste pagamento.
Esta operação poderá criar novos recibos ou complementar recibos existentes."

Botões:

Cancelar

Gerar recibos

2. Aviso sobre semana operacional

No modal adicionar:

"A semana operacional (sexta a quinta) é apenas referência da execução da extra.

O pagamento atual pode conter extras de semanas anteriores ainda não pagas."

3. Resumo após geração

Após concluir:

Exibir toast:

Recibos gerados:
X criados
Y complementados
R$ Total

Adicionar botão:

Visualizar última geração

4. Não alterar o restante da tela.

Entregar:

arquivos alterados
resumo
testes manuais

Nenhum SQL.
Nenhuma migration.