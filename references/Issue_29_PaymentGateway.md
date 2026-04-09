# Issue 29: Gateway de Pagamento Real

## Descrição
Substituir o fluxo de pagamento mock por uma integração real com um gateway de pagamento para processar cartões de crédito e PIX dinâmico.

## Requisitos
- Criar o componente `src/components/PaymentGateway.tsx`.
- Integrar com Stripe Elements ou Mercado Pago SDK.
- Implementar formulário seguro para captura de dados de cartão (PCI Compliance).
- Lógica para gerar `PaymentIntent` via backend.
- Tratar estados de carregamento, sucesso e erro de processamento.
- Integrar o componente no fluxo de finalização de venda do PDV.
