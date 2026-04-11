# Plano de Implementação: Webhooks de Pagamento (Issue 02)

Este documento descreve o plano para implementar o processamento de confirmações de pagamento via webhooks, garantindo que o sistema reaja automaticamente a pagamentos concluídos, falhos ou estornados.

## 1. Pesquisa e Referência

### Mercado Pago (Exemplo principal para o mercado brasileiro)
- **Endpoint**: `POST /api/webhooks/payments/mercadopago`
- **Payload**: Geralmente envia um `id` de recurso e um `topic` (ex: `payment`).
- **Verificação**: Requer uma chamada de volta à API do Mercado Pago usando o `id` recebido para obter os detalhes reais do pagamento e validar a autenticidade.

### Stripe
- **Endpoint**: `POST /api/webhooks/payments/stripe`
- **Payload**: Envia o objeto de evento completo.
- **Segurança**: Verificação de assinatura (`Stripe-Signature`) usando um `webhook secret`.

## 2. Arquitetura do Backend (`server.ts`)

### Novo Endpoint de Webhook
Criar um endpoint genérico ou específico por provedor:
- `POST /api/webhooks/payments/:provider`

### Fluxo de Processamento
1. **Recebimento**: Capturar o payload bruto e cabeçalhos de segurança.
2. **Validação**: Verificar a assinatura do webhook para evitar falsificações.
3. **Identificação**: Localizar a venda ou conta a receber no Firestore usando metadados enviados na criação do pagamento (ex: `external_reference` ou `metadata.sale_id`).
4. **Atualização**:
    - Alterar status da Venda para "Paga".
    - Registrar a data de recebimento e o ID da transação.
    - Se for uma conta a receber, marcar como "Pago" e registrar a data de liquidação.
5. **Auditoria**: Registrar o evento no log de auditoria do sistema.

## 3. Segurança

- **IP Whitelisting**: (Opcional, mas recomendado) Validar se a requisição vem de IPs oficiais do provedor.
- **Assinaturas HMAC**: Validar o hash enviado no cabeçalho usando a chave secreta do webhook configurada no painel do provedor.
- **Idempotência**: Garantir que o processamento do mesmo webhook múltiplas vezes não cause efeitos colaterais duplicados (ex: baixar o estoque duas vezes).

## 4. Integração com Firestore

- **Vendas (`sales`)**: Atualizar `status` e `payment_details`.
- **Contas a Receber (`accountsReceivable`)**: Atualizar `status`, `payment_date` e `receipt_date`.
- **Notificações**: Criar um documento na coleção `notifications` para alertar o usuário/vendedor sobre o pagamento recebido.

## 5. Feedback em Tempo Real (Frontend)

- O componente `PaymentGateway.tsx` já realiza polling no status do pagamento.
- Com o webhook, a atualização no Firestore será quase instantânea.
- O frontend deve continuar usando `onSnapshot` ou polling curto para detectar a mudança de status no documento da venda/pagamento e fechar o modal de pagamento automaticamente.

## 6. Plano de Ação

1.  **Configuração de Ambiente**: Adicionar `PAYMENT_WEBHOOK_SECRET` ao `.env.example`.
2.  **Desenvolvimento do Endpoint**: Implementar a rota básica em `server.ts`.
3.  **Lógica de Verificação**: Adicionar funções de validação de assinatura para o provedor escolhido.
4.  **Integração com Firebase Admin**: Usar `adminDb` para atualizar os registros de forma atômica.
5.  **Testes**: Simular chamadas de webhook usando ferramentas como Postman ou Insomnia.
