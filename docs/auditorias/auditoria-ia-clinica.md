Faça auditoria somente leitura da tela principal do Extra Flow.

Não altere arquivos.

Objetivo:
identificar melhorias simples de UX/operacional para reduzir erro humano no uso de extras e recibos, sem mexer em regra financeira.

Analise:
- src/routes/_authenticated/extras.tsx
- src/routes/_authenticated/recibos.index.tsx
- componentes relacionados de recibos/extras

Procure oportunidades para:
1. Deixar claro o status de cada extra.
2. Diferenciar extra lançada, aprovada, paga, com recibo, arquivada.
3. Melhorar alertas antes de gerar recibos.
4. Melhorar botões perigosos ou ambíguos.
5. Evitar impressão/PDF de recibos errados.
6. Melhorar visualização de valores totais.
7. Reduzir confusão entre semana operacional e pagamento.

Entregue:
- problemas encontrados;
- melhorias recomendadas;
- prioridade alta/média/baixa;
- arquivos envolvidos;
- nenhum patch;
- nenhuma migration.