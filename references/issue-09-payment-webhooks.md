# Issue 09: Checkout Transparente e Webhooks (`server.ts`)

## Descrição
Implementar integração de pagamentos reais com processamento automático via Webhooks.

## Requisitos
- Gateway sugerido: Stripe ou Mercado Pago.
- Implementação no Servidor (`server.ts`):
    - Criar rota para gerar `PaymentIntent` no checkout.
    - Criar endpoint `/api/webhooks/payments` para ouvir notificações do gateway.
- Comportamento:
    - Ao receber confirmação de pagamento, atualizar automaticamente o `status` para "Pago" na coleção `accountsReceivable`.
