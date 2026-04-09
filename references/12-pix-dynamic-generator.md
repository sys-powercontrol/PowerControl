# Issue 12: Componente de UI: Gerador de PIX Dinâmico

## Descrição
Implementar um componente para geração de QR Code PIX dinâmico com valor exato e expiração.

## Critérios de Aceite
- [ ] **Funcionalidade**: Integração com API de pagamento para gerar QR Code PIX com valor exato e expiração.
- [ ] **QR Code**: Exibir o QR Code gerado na página de vendas (`Sales.tsx`).
- [ ] **Status**: Verificar o status do pagamento em tempo real e atualizar a venda ao ser confirmado.
- [ ] **Expiração**: Definir o tempo de expiração do QR Code (ex: 30 minutos).

## Detalhes Técnicos
- **Componente**: `/src/components/Sales/PixDynamicGenerator.tsx`.
- **Biblioteca**: Utilizar uma biblioteca de geração de QR Code (ex: `qrcode.react`).
- **API**: Integrar com uma API de pagamento (ex: Mercado Pago, Stripe, Gerencianet).
- **Props**: `amount`, `onSuccess`, `onExpire`.
- **Validação**: Verificar se o valor da venda é válido antes de gerar o QR Code.
- **Integração**: Substituir o QR Code estático na página de vendas.
