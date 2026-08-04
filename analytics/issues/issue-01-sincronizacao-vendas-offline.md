# Issue 01: Sincronização Transacional de Vendas Offline

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Implementar a rotina de sincronização remota de vendas efetuadas em modo offline utilizando transações atômicas no Firestore (`runTransaction`). A transação deve atualizar simultaneamente os documentos de venda, estoque, movimentação de caixa e contas a receber, e atualizar a indicação visual de status em `SalesHistory.tsx`.

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Banco de Dados:** Firestore (`sales`, `products`, `inventory_movements`, `movements`, `accountsReceivable`)

---

## 3. Requisitos de Comportamento
1. Escutar evento de retorno de conexão `window.addEventListener('online')`.
2. Ler a fila de vendas pendentes no IndexedDB via `offlineStore.getPendingSales()`.
3. Para cada venda pendente, executar um `runTransaction` no Firestore:
   - Gravar o documento em `sales`.
   - Baixar a quantidade correspondente em `products` e registrar `inventory_movements`.
   - Se paga à vista, registrar em `movements`; se a prazo, criar lançamento em `accountsReceivable`.
4. Remover do IndexedDB após o envio e atualizar os *badges* em `SalesHistory.tsx` (`Sincronizado`).
