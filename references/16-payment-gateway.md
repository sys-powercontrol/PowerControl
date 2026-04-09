# Issue 16: Integração Real de Pagamentos (PIX/Cartão)

## Descrição
Substituir o simulador de PIX por uma integração real com gateway de pagamento (Mercado Pago ou Stripe).

## Critérios de Aceite
- [ ] **Integração**: Integrar com SDK real (Mercado Pago, Stripe, Gerencianet).
- [ ] **Checkout**: Interface de checkout para inserção de dados de cartão de crédito.
- [ ] **Tokenização**: Garantir tokenização segura (PCI Compliance) para dados de cartão.
- [ ] **Webhook**: Implementar endpoint `/api/webhooks/payments` no servidor Express.
- [ ] **Status**: Atualizar automaticamente o status da venda e do caixa ao receber a confirmação de pagamento.

## Detalhes Técnicos
- **SDK**: Mercado Pago SDK ou Stripe SDK.
- **Servidor**: `server.ts` (Express) para gerenciar webhooks e chamadas de API seguras.
- **Componente**: `PaymentGateway.tsx` para a interface de pagamento.
- **Segurança**: Nunca armazenar dados sensíveis de cartão no Firestore.
