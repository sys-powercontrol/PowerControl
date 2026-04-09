# Issue 05: Sincronização Automática de Estoque

## Descrição
Implementar a lógica de atualização automática da quantidade de estoque ao finalizar vendas ou compras.

## Critérios de Aceite
- [ ] **Trigger (Venda)**: Ao finalizar uma venda (`Sales.tsx`), decrementar `stock_quantity` na coleção `products`.
- [ ] **Trigger (Compra)**: Ao registrar uma compra (`Purchases.tsx`), incrementar `stock_quantity` na coleção `products`.
- [ ] **Validação**: Impedir venda de produtos com estoque zero (se configurado na empresa).
- [ ] **Log**: Registrar cada movimentação na coleção `inventory_movements` (relacionado à Issue 03).

## Detalhes Técnicos
- **Coleção Firestore**: `products`.
- **Campo**: `stock_quantity`.
- **Transações**: Utilizar `runTransaction` ou `writeBatch` para garantir que a venda/compra e a atualização de estoque ocorram de forma atômica.
- **Validação**: Verificar se o estoque é suficiente antes de processar a venda.
