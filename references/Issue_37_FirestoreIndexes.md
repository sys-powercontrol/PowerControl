# Issue 37: Índices de Relatórios Avançados

## Descrição
Configurar os índices compostos necessários no Firestore para suportar as consultas complexas do novo relatório de giro e reposição.

## Requisitos
- Atualizar o arquivo `firestore.indexes.json`.
- Adicionar índice composto para a coleção `inventory_movements`:
    - `company_id` (ASCENDING)
    - `product_id` (ASCENDING)
    - `timestamp` (DESCENDING)
- Validar se o índice cobre as necessidades de filtragem por empresa e ordenação cronológica por produto.
