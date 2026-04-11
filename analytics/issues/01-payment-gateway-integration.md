# Issue: Integração Real de Pagamentos (PIX/Cartão)

## Descrição
Substituir o simulador de PIX no `server.ts` por uma integração real com gateway de pagamento (Mercado Pago ou Stripe).

## Requisitos
- Implementar componente `PaymentGateway.tsx` para exibição de QR Code PIX e formulário de cartão.
- Garantir tokenização segura para dados de cartão (PCI Compliance).
- Criar rotas no backend:
    - `POST /api/payments/create`: Geração de preferência/intenção de pagamento.
    - `GET /api/payments/status/:id`: Consulta de status síncrona.

## Critérios de Aceite
- O usuário consegue pagar via PIX e ver a confirmação na tela.
- O sistema não armazena dados sensíveis de cartão no Firestore.
