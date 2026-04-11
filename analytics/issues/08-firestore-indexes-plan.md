# Plano de Implementação: Índices do Firestore (Issue 08)

Este documento detalha o plano para configurar os índices compostos no Firestore, garantindo que as consultas que utilizam filtros e ordenação funcionem corretamente sem erros de "Missing Index".

## 1. Objetivos
- Identificar todas as consultas no sistema que combinam filtros (`where`) com ordenação (`orderBy`).
- Criar o arquivo `firestore.indexes.json` com as definições necessárias.

## 2. Consultas Identificadas

Analisando o código (especialmente `src/lib/api.ts` e as páginas), identificamos as seguintes consultas que filtram por `company_id` e ordenam por data:

1. **Vendas (`sales`)**: Filtro por `company_id`, ordenação por `sale_date` (DESC).
2. **Movimentações de Estoque (`inventory_movements`)**: Filtro por `company_id`, ordenação por `timestamp` (DESC).
3. **Logs de Auditoria (`audit_logs`)**: Filtro por `company_id`, ordenação por `timestamp` (DESC).
4. **Contas a Pagar (`accountsPayable`)**: Filtro por `company_id`, ordenação por `due_date` (ASC).
5. **Contas a Receber (`accountsReceivable`)**: Filtro por `company_id`, ordenação por `due_date` (ASC).
6. **Compras (`purchases`)**: Filtro por `company_id`, ordenação por `purchase_date` (DESC).

## 3. Estrutura do `firestore.indexes.json`

O arquivo será criado na raiz do projeto com a seguinte estrutura para cada coleção identificada:

```json
{
  "indexes": [
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "company_id", "order": "ASCENDING" },
        { "fieldPath": "sale_date", "order": "DESCENDING" }
      ]
    },
    // ... outros índices
  ],
  "fieldOverrides": []
}
```

## 4. Próximos Passos
1. Criar o arquivo `firestore.indexes.json` com todos os índices mapeados.
2. (Opcional) O usuário poderá implantar esses índices executando `firebase deploy --only firestore:indexes` em seu ambiente local ou CI/CD, já que a ferramenta automatizada `deploy_firebase` atua apenas nas regras (`firestore.rules`).
