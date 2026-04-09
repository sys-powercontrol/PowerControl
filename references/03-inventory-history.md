# Issue 03: Histórico de Movimentação de Estoque (Kardex)

## Descrição
Implementar uma funcionalidade para visualizar o histórico detalhado de todas as entradas e saídas de um produto específico.

## Critérios de Aceite
- [ ] Criar a página `/src/pages/InventoryHistory.tsx`.
- [ ] Permitir acesso para Admin e User (com permissão).
- [ ] Listar movimentações em ordem cronológica inversa.
- [ ] Colunas: Data, Tipo (Entrada/Saída), Origem (Venda #ID / Compra #ID), Quantidade Anterior, Quantidade Movimentada, Saldo Atual.
- [ ] Link para o documento de origem (ex: ver detalhes da venda).

## Detalhes Técnicos
- **Coleção Firestore**: `inventory_movements`.
- **Campos sugeridos**: `timestamp`, `product_id`, `type` (IN/OUT), `origin_type` (SALE/PURCHASE/ADJUST), `origin_id`, `prev_qty`, `qty_moved`, `current_qty`.
- **Filtro**: Por `product_id` e `company_id`.
