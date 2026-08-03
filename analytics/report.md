# Relatório de Análise Geral do Sistema - Pendências de Finalização

**Data e Hora de Geração:** 03/08/2026 07:25:19 (Horário de Brasília - BRT)

---

## 1. Visão Geral e Diretrizes
Este relatório apresenta o resultado da análise arquitetural e funcional do sistema ERP/PDV (Power Control). O objetivo exclusivo é mapear as **pendências de finalização e consolidação das funcionalidades existentes**, garantindo integridade de dados, consistência transacional e tratamento correto de erros sem a introdução de novas funcionalidades.

Nenhuma alteração no código-fonte dos módulos operacionais da aplicação (`src/`) foi efetuada nesta etapa, mantendo a integridade do escopo atual.

---

## 2. Diagnóstico de Finalização por Módulo

### 2.1 Módulo de Vendas e PDV (`src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`)
- **Situação Atual:** As vendas realizadas em modo offline são armazenadas no IndexedDB através do `offlineStore.ts`.
- **Pendência de Finalização:** 
  1. Garantir que a rotina de sincronização remota utilize transações atômicas no Firestore (`runTransaction`) para gravar simultaneamente a venda, decrementar o estoque (`inventory_movements`), lançar movimentação no caixa e registrar o título financeiro (`accountsReceivable`).
  2. Assegurar a atualização visual dinâmica dos badges de status no histórico de vendas, diferenciando claramente vendas pendentes de sincronização e vendas sincronizadas com sucesso.

### 2.2 Módulo Financeiro e Recorrências (`src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`)
- **Situação Atual:** Lançamentos financeiros possuem suporte a repetição e marcação de frequência, porém a baixa e alteração de parcelas ainda não oferecem confirmação em cascata para parcelas futuras.
- **Pendência de Finalização:**
  1. Adicionar confirmação no momento da edição ou liquidação de títulos recorrentes: "Alterar/Baixar apenas esta parcela" vs. "Alterar/Baixar esta e todas as parcelas futuras".
  2. Consolidar a regra de interrupção automática do ciclo recorrente ao atingir o número máximo de parcelas (`max_installments`) ou a data limite estipulada (`until_date`).

### 2.3 Conciliação Bancária e Extrato OFX (`src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`)
- **Situação Atual:** O leitor de OFX extrai os lançamentos do arquivo do banco, mas a comparação de similaridade (*matching algorithm*) com títulos abertos precisa ser formalizada com Score de Match.
- **Pendência de Finalização:**
  1. Implementar o cálculo do Score de Match de 0 a 100 com base em tolerância temporal (±3 dias), valor exato e similaridade de descrição/documento.
  2. Implementar a baixa/conciliação em lote com confirmação explícita, alterando o estado do lançamento para conciliado e atualizando o saldo bancário da conta correspondente.

### 2.4 Módulo Fiscal e Emissão de Notas (`src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`)
- **Situação Atual:** O módulo fiscal realiza emissões de NF-e e NFC-e via integrações de API (FocusNFe / WebmaniaBR), contudo o empacotamento mensal de XMLs para contabilidade e a sincronização de notas em contingência exigem fechamento.
- **Pendência de Finalização:**
  1. Finalizar o empacotamento assíncrono em arquivo ZIP com todos os arquivos XML autorizados do mês e ano selecionados para envio contábil.
  2. Consolidar a rotina de consulta e reprocessamento automático de notas que ficaram com status pendente ou em contingência na SEFAZ.

### 2.5 Recálculo Estruturado de Custos (BOM / Ficha Técnica) (`src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`)
- **Situação Atual:** A estrutura de produtos compostos e fichas técnicas (Kits/BOM) está implementada, porém a alteração no preço de custo da matéria-prima não recalcula automaticamente o custo do produto acabado.
- **Pendência de Finalização:**
  1. Disparar o recálculo em cascata do `cost_price` dos produtos acabados sempre que o preço de custo de um insumo ou matéria-prima for atualizado.
  2. Registrar o histórico de recálculo estruturado no registro de auditoria e movimentação de estoque.

### 2.6 Fechamento de Comissões e Integração Financeira (`src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`)
- **Situação Atual:** O cálculo de comissões por vendedor é computado nas vendas, contudo a liquidação do pagamento não gera automaticamente um título no Contas a Pagar.
- **Pendência de Finalização:**
  1. Ao confirmar a liquidação da comissão em `CommissionPayouts.tsx`, gerar automaticamente um registro em `accountsPayable` na categoria "Comissões de Vendas".
  2. Ao estornar ou cancelar uma venda no histórico, atualizar o status da comissão proporcional para cancelado ou ajustar o saldo pendente do vendedor.

---

## 3. Conclusão
O sistema possui uma cobertura funcional sólida. As pendências mapeadas refletem exclusivamente arremates de consistência, integridade transacional e integração entre módulos existentes.
