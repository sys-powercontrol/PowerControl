# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração (Horário de Brasília):** 02/08/2026 13:27:47 BRT

---

## 1. Escopo e Objetivos
Esta especificação descreve em detalhes técnicos as alterações de comportamento, regras de negócio e componentes/páginas necessários para concluir 100% das funcionalidades pendentes mapeadas no relatório de análise do sistema.

---

## 2. Especificações por Módulo

### SPEC-01: Resiliência e Transacionalidade de Sincronização Offline de Vendas
- **Páginas e Módulos:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Comportamento Esperado:**
  - Persistir vendas realizadas sem conexão no IndexedDB/LocalStorage.
  - Ao detectar o retorno da conectividade via listener de rede, disparar a sincronização em lote utilizando transações atômicas no Firestore (`runTransaction`).
  - Sincronizar simultaneamente a criação do registro de venda, baixa no estoque (`inventory_movements`), movimentação no livro caixa (`movements`) e criação de título em `accountsReceivable`.
  - Exibir badge indicador visual no histórico de vendas informando o status de sincronização (`Sincronizado` / `Pendente`).

### SPEC-02: Gerenciamento e Liquidação de Recorrências Financeiras
- **Páginas e Módulos:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Comportamento Esperado:**
  - Permitir alteração ou liquidação de títulos recorrentes oferecendo escolha entre atualizar apenas a parcela selecionada ou aplicar a alteração em cascata às parcelas futuras.
  - Interromper a geração automática de novos lançamentos assim que atingida a data de término ou a quantidade máxima de parcelas estipulada.

### SPEC-03: Algoritmo de Match Automático e Baixa via OFX
- **Páginas e Módulos:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Comportamento Esperado:**
  - Implementar algoritmo para cruzamento de dados de extrato OFX com lançamentos abertos no sistema, considerando aproximação de data (±3 dias), correspondência exata de valor e similaridade de descrição/documento.
  - Atribuir uma pontuação de confiança (*Score de Match*) para cada sugestão de conciliação.
  - Permitir a conciliação e baixa em lote das transações confirmadas pelo usuário com alteração do status para `Conciliado`.

### SPEC-04: Compactação Mensal de XMLs Fiscais e Reprocessamento de Contingência
- **Páginas e Módulos:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`
- **Comportamento Esperado:**
  - Permitir seleção de mês/ano para geração e download de um pacote ZIP contendo todos os arquivos XML das NF-e / NFC-e autorizadas no período.
  - Implementar opção de reprocessamento e re-autorização para notas fiscais armazenadas com status pendente ou em contingência.

### SPEC-05: Atualização em Cascata de Custos em Ficha Técnica (BOM)
- **Páginas e Módulos:** `src/pages/Products.tsx`, `src/lib/inventory.ts`
- **Comportamento Esperado:**
  - Sempre que o custo de uma matéria-prima/insumo for atualizado (via entrada de nota de compra ou ajuste manual), recalcular automaticamente o `cost_price` de todos os produtos acabados que contenham esse insumo na sua lista de componentes (`bom_items`).
  - Registrar no histórico as alterações de custo decorrentes do recalculo.

### SPEC-06: Estorno e Integração Financeira de Comissões
- **Páginas e Módulos:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Comportamento Esperado:**
  - Na liquidação de comissões de vendedores em `CommissionPayouts.tsx`, criar automaticamente uma saída financeira vinculada em `accountsPayable`.
  - Em casos de cancelamento ou exclusão de vendas no histórico, recalcular a comissão do vendedor e alterar o status da comissão para `Cancelada`.
