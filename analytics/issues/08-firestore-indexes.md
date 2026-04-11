# Issue: Índices do Firestore

## Descrição
Configurar os índices compostos necessários para performance e funcionamento das consultas complexas.

## Requisitos
- Definir índices em `firestore.indexes.json` para as coleções `sales`, `movements` e `audit_logs`.

## Critérios de Aceite
- Consultas que utilizam múltiplos filtros e ordenação não retornam erros de "Missing Index".
