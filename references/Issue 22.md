# Issue 22: Integração de Pagamentos e Webhooks

## Descrição
Implementar integração real com gateway de pagamento e processamento assíncrono.

## Requisitos
- **PaymentGateway**:
    - Criar componente em `src/components/PaymentGateway.tsx`.
    - Integrar com Mercado Pago ou Stripe.
    - Captura segura de dados de cartão com validação.
- **Webhooks**:
    - Criar endpoint `/api/webhooks/payments` no `server.ts`.
    - Lógica para processar confirmações de pagamento.
    - Atualizar status da venda e contas a receber no Firestore.
