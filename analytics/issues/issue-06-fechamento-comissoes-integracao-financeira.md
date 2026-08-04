# Issue 06: Fechamento de Comissões e Integração Financeira

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Automatizar a integração entre a liquidação de comissões de vendedores em `CommissionPayouts.tsx` e o módulo de Contas a Pagar (`accountsPayable`), bem como o cancelamento proporcional da comissão em caso de estorno de venda.

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Banco de Dados:** Firestore (`commissions`, `accountsPayable`, `sales`)

---

## 3. Requisitos de Comportamento
1. No fluxo de liquidação do fechamento de comissões em `CommissionPayouts.tsx`, ao confirmar o pagamento, gerar automaticamente uma despesa em `accountsPayable` categorizada como "Comissões de Vendas".
2. Ao realizar o estorno ou cancelamento de uma venda em `SalesHistory.tsx`, verificar as comissões associadas; se estiverem com status `pending`, alterar o status da comissão para `canceled`.
