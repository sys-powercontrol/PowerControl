# Issue 06: Lançamento Financeiro Automático

## Descrição
Implementar a criação automática de registros em contas a pagar e receber ao finalizar vendas ou compras a prazo.

## Critérios de Aceite
- [ ] **Venda a Prazo**: Ao finalizar uma venda (`Sales.tsx`) com pagamento a prazo, criar um documento na coleção `accountsReceivable`.
- [ ] **Compra a Prazo**: Ao registrar uma compra (`Purchases.tsx`) com pagamento a prazo, criar um documento na coleção `accountsPayable`.
- [ ] **Vínculo**: Vincular o `client_id` (para vendas) ou `supplier_id` (para compras) e o `sale_id`/`purchase_id` ao lançamento financeiro.
- [ ] **Status**: Definir o status inicial como `PENDING`.

## Detalhes Técnicos
- **Coleção Firestore**: `accountsReceivable`, `accountsPayable`.
- **Campos sugeridos**: `client_id`, `supplier_id`, `sale_id`, `purchase_id`, `amount`, `due_date`, `status` (PENDING/PAID/CANCELLED).
- **Transações**: Utilizar `writeBatch` para garantir que a venda/compra e o lançamento financeiro ocorram de forma atômica.
- **Validação**: Verificar se o cliente/fornecedor está selecionado antes de processar a venda/compra a prazo.
