# Especificação Técnica de Finalização de Funcionalidades (Spec)
> **Data e Hora de Geração:** 01/08/2026 às 11:37:00 (Horário de Brasília - BRT)

---

## 1. Módulo: Vendas & PWA Offline Sync (`/Sales` & `/offlineStore`)

### 1.1. Escopo de Comportamento (Behavior)
* Ao restabelecer a conexão de rede, o Service Worker / `offlineStore` deve tentar sincronizar as vendas em fila no IndexedDB.
* Caso um item da venda offline não possua saldo em estoque suficiente no Firestore no momento do sync:
  1. A venda deve ser gravada com o status `"Pendente de Estoque"`.
  2. Um registro de alerta deve ser inserido na coleção `notifications` para avisar o administrador no `NotificationCenter`.
  3. Se houver estoque, a baixa de estoque e o faturamento devem ocorrer normalmente.

---

## 2. Módulo: Financeiro & Recorrência (`/AccountsPayable`, `/AccountsReceivable`)

### 2.1. Escopo de Comportamento (Behavior & Components)
* **Geração Automática de Próxima Parcela:**
  * Ao dar baixa em uma conta configurada como `is_recurring: true` e `recurrence_period` (`Mensal`, `Anual`, etc.), o sistema deve gerar automaticamente a próxima ocorrência no Firestore para o mês/período subsequente com status `"Pendente"`.
* **Baixa/Liquidação em Lote:**
  * Disponibilizar botão de ação em lote na barra superior da tabela quando um ou mais registros forem selecionados via checkbox (`selectedIds`).
  * Modal de liquidação em lote solicitando Conta Bancária/Caixa de destino, Data de Pagamento/Recebimento e Forma de Pagamento para liquidar todos os selecionados simultaneamente.

---

## 3. Módulo: Conciliação Bancária OFX (`/BankReconciliation` & `/OFXImporter`)

### 3.1. Escopo de Comportamento (Behavior & Components)
* **Algoritmo de Auto-Matching de Transações OFX:**
  * Para cada transação importada do extrato OFX, buscar lançamentos no `accountsPayable` ou `accountsReceivable` com base em:
    1. **Combinação Exata de Valor:** Transação com mesmo valor numérico (Crédito/Débito).
    2. **Janela Temporala (±3 Dias):** Data do vencimento/pagamento no intervalo de 3 dias antes ou depois da data da transação do extrato.
  * Exibir uma badge de relevância ("95% Match", "Correspondente") e um botão de confirmação em 1 clique para realizar a baixa automática do título correspondente.

---

## 4. Módulo: Fiscal & Reprocessamento NFe (`/Fiscal`)

### 4.1. Escopo de Comportamento (Behavior & Components)
* **Fila de Sincronização / Reprocessamento de Status:**
  * Botão "Sincronizar Pendentes" na página Fiscal que consulta todas as notas com status `Pendente`, `Aguardando` ou `Processando` na API fiscal e atualiza o estado e a chave de acesso no Firestore.
* **Exportação Compactada em ZIP:**
  * Botão "Exportar XMLs (ZIP)" que compacta os arquivos XML das notas emitidas no período selecionado utilizando `JSZip` e dispara o download do arquivo `notas_fiscais_periodo.zip`.

---

## 5. Módulo: Estoque, Compras e Ficha Técnica / BOM (`/BOMBuilder`, `/inventory`, `/Purchases`)

### 5.1. Escopo de Comportamento (Behavior & Components)
* **Dedução de Insumos da Ficha Técnica (BOM):**
  * Na rotina `processInventoryForSale`, verificar se o produto vendido possui uma lista de componentes/ingredientes associados (`bom`).
  * Em caso afirmativo, realizar também o lançamento de saída de estoque para cada componente proporcionalmente à quantidade vendida.
* **Custo Médio Ponderado e Contas a Pagar na Compra:**
  * Na confirmação da entrada de uma compra em `Purchases.tsx`:
    1. Calcular o novo Custo Médio Ponderado do produto:
       $$\text{Custo Médio Novo} = \frac{(\text{Qtd Atual} \times \text{Custo Atual}) + (\text{Qtd Comprada} \times \text{Preço Comprado})}{\text{Qtd Atual} + \text{Qtd Comprada}}$$
    2. Atualizar o campo `cost_price` do produto no Firestore.
    3. Criar automaticamente o lançamento correspondente no `accountsPayable`.

---

## 6. Módulo: Pessoas, Comissões e RBAC (`/CommissionPayouts`, `/Layout`)

### 6.1. Escopo de Comportamento (Behavior & Components)
* **Baixa Financeira de Comissões:**
  * Ao clicar em "Pagar Comissão" em `CommissionPayouts.tsx`, registrar a transação financeira no `accountsPayable` com a categoria "Comissões de Vendas" e criar a respectiva movimentação de saída no caixa/banco selecionado.
* **Validação Estrita de Permissões no Layout:**
  * Garantir que o `Layout.tsx` oculte itens de menu que o usuário logado não possui permissão para acessar com base em `user.permissions` / `user.role`.
  * Redirecionar usuários sem permissão que tentem acessar rotas protegidas diretamente via URL.

---
*Documento de Especificação Técnica gerado com foco estrito nas pendências identificadas.*
