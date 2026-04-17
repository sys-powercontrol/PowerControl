# Issue 02: Métodos de Pagamento e Gateway

## Contexto
O sistema precisa de integração real com gateways de pagamento para processar transações.

## Escopo
*   **Páginas:** `Configurations.tsx`, `Sales.tsx`
*   **Componentes:** `PaymentGateway.tsx` (a criar ou expandir), `Configurations.tsx` (Configurações)
*   **Comportamentos:**
    *   **Integração WebmaniaBR:** Implementar a comunicação com a API de pagamentos da WebmaniaBR para processamento de Cartão de Crédito e geração de PIX dinâmico.
    *   **Webhooks:** Criar endpoint para processar notificações de alteração de status de pagamento vindas do gateway.
