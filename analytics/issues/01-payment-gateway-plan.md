# Plano de Implementação: Integração Real de Pagamentos (Issue 01)

Este documento detalha o plano para substituir a simulação de pagamentos por uma estrutura que suporte gateways reais (Mercado Pago/Stripe).

## 1. Pesquisa e Análise
- **Estado Atual**: O sistema possui um mock no `server.ts` que simula a confirmação de PIX após 15 segundos. O frontend (`Sales.tsx`) usa o `PixDynamicGenerator` que apenas exibe a chave PIX estática da empresa e permite confirmação manual.
- **Objetivo**: Implementar um fluxo onde o backend gera uma intenção de pagamento real e o frontend monitora o status via polling ou webhook.

## 2. Mudanças no Backend (`server.ts`)
- [ ] **Novas Rotas**:
    - `POST /api/payments/create`: Recebe `amount`, `method` (pix/card), e `metadata`. Retorna um `payment_id` e dados específicos (QR Code para PIX ou Token para Cartão).
    - `GET /api/payments/status/:id`: Consulta o status atual da transação no gateway.
- [ ] **Simulação de Gateway**: Criar uma camada de serviço no backend que possa ser facilmente substituída por um SDK real (ex: `mercadopago`).

## 3. Mudanças no Frontend
- [ ] **Novo Componente `PaymentGateway.tsx`**:
    - Substituirá/Expandirá o `PixDynamicGenerator`.
    - Suporte a abas: **PIX** e **Cartão de Crédito**.
    - **PIX**: Exibe QR Code dinâmico gerado pelo backend e faz polling do status.
    - **Cartão**: Formulário para Nome, Número, CVV e Vencimento. Implementar validação básica e simulação de tokenização.
- [ ] **Integração em `Sales.tsx`**:
    - Ao clicar em "Finalizar Venda" com método PIX ou Cartão, abrir o modal do `PaymentGateway`.
    - Bloquear a finalização da venda no Firestore até que o pagamento seja confirmado.

## 4. Segurança e Configuração
- [ ] **Variáveis de Ambiente**: Adicionar `PAYMENT_GATEWAY_TOKEN` ao `.env.example`.
- [ ] **PCI Compliance**: Garantir que os dados do cartão nunca sejam enviados para o Firestore, apenas para o endpoint de pagamento (ou simulador).

## 5. Cronograma de Execução
1.  **Fase 1**: Estruturar rotas no `server.ts` e criar o serviço de pagamento simulado.
2.  **Fase 2**: Desenvolver o componente `PaymentGateway.tsx` com suporte a PIX dinâmico.
3.  **Fase 3**: Implementar o formulário de Cartão de Crédito no `PaymentGateway.tsx`.
4.  **Fase 4**: Integrar o fluxo completo no `Sales.tsx` e testar a transição de status.
