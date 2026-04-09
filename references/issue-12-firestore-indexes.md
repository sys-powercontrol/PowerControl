# Issue 12: Índices Compostos Firestore (`firestore.indexes.json`)

## Descrição
Otimizar a performance das consultas complexas no banco de dados.

## Requisitos
- Identificar e configurar índices compostos no arquivo `firestore.indexes.json`.
- Exemplos de índices necessários:
    - Coleção `sales`: `company_id` ASC + `status` ASC + `created_at` DESC.
    - Coleção `accounts`: `company_id` ASC + `due_date` ASC + `status` ASC.
