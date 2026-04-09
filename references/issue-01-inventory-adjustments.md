# Issue 01: Gestão de Ajustes de Estoque (`InventoryAdjustments.tsx`)

## Descrição
Implementar uma nova página para permitir correções manuais de saldo de produtos.

## Requisitos
- Criar a página `src/pages/InventoryAdjustments.tsx`.
- Campos necessários: Produto, Tipo (Entrada/Saída), Quantidade, Motivo (Quebra, Perda, Inventário, Bonificação), Observação.
- Comportamento:
    - Deve atualizar o campo `stock_quantity` no documento do produto no Firestore.
    - Deve gerar um registro histórico na coleção `inventory_history`.
