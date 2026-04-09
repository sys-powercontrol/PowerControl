# Issue 31: Webhooks de Pagamento

## Descrição
Implementar endpoint de Webhook no servidor para processar confirmações de pagamento assíncronas vindas do gateway.

## Requisitos
- Criar o endpoint `POST /api/webhooks/payments` no arquivo `server.ts`.
- Implementar validação de assinatura do webhook (segurança).
- Lógica para identificar a venda ou fatura relacionada ao pagamento recebido.
- Atualizar o status da venda para "Pago" no Firestore.
- Gerar automaticamente o lançamento correspondente no fluxo de caixa/contas a receber.
