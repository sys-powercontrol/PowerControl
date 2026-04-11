# Issue: Webhooks de Pagamento

## Descrição
Implementar endpoint de Webhook para processar confirmações de pagamento assíncronas vindas do gateway.

## Requisitos
- Criar endpoint `POST /api/webhooks/payments` no `server.ts`.
- Implementar validação de assinatura/segurança do webhook.
- Lógica para identificar a venda (`sale_id`) e atualizar status para "Pago".
- Gerar lançamento automático no fluxo de caixa (`movements`).

## Critérios de Aceite
- Ao receber o webhook, a venda muda de status automaticamente sem recarregar a página (via Firestore listeners).
