# Relatório de Análise Geral do Sistema - Pendências de Finalização

**Data e Hora de Geração:** 02/08/2026 17:22:14 (Horário de Brasília - BRT)

---

## 1. Visão Geral e Diretrizes
Este relatório é o resultado da análise arquitetural e funcional do sistema de gestão comercial e ERP. O foco exclusivo é a identificação das **pendências de finalização e polimento das funcionalidades já existentes**, garantindo integridade de dados, transacionalidade e eliminação de falhas de consistência sem a inclusão de novas funcionalidades.

Nenhuma alteração nos arquivos do código-fonte da aplicação (`src/`) foi realizada nesta fase.

---

## 2. Diagnóstico de Finalização por Módulo

### 2.1 Módulo de Vendas e PDV (`src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`)
- **Situação Atual:** Vendas realizadas offline são salvas localmente no `offlineStore.ts`, mas a rotina de ressincronização automática precisa garantir transacionalidade atômica ao reconectar à internet.
- **Pendência de Finalização:** 
  1. Garantir transação atômica no Firestore (`runTransaction`) para gravar simultaneamente a venda, baixar o estoque (`inventory_movements`), lançar movimentação de caixa (`movements`) e registrar o título financeiro (`accountsReceivable`).
  2. Atualizar o badge de status visual no histórico de vendas para indicar com clareza a transição entre `Pendente de Sincronização` e `Sincronizado`.

### 2.2 Módulo Financeiro e Recorrências (`src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`)
- **Situação Atual:** Contas a pagar e receber possuem marcação de frequência e recorrência, mas a baixa de parcelas recorrentes não oferece opção de alteração em cascata.
- **Pendência de Finalização:**
  1. Adicionar o modal/seletor de confirmação no momento da baixa ou edição de títulos recorrentes: "Baixar/Editar apenas esta parcela" vs. "Baixar/Editar esta e todas as próximas parcelas".
  2. Implementar trava de encerramento automático do ciclo de recorrência ao atingir a data limite estipulada ou o número máximo de parcelas configurado.

### 2.3 Conciliação Bancária OFX (`src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`)
- **Situação Atual:** O importador OFX lê o arquivo bancário, mas o cruzamento automático (*auto-matching*) com o livro de lançamentos abertos necessita de refinamento do Score de Match.
- **Pendência de Finalização:**
  1. Calcular o Score de Match com base na tolerância de data (±3 dias), correspondência exata de valor e similaridade de descrição/documento.
  2. Permitir conciliação em lote com confirmação explícita do usuário, alterando o status das transações para `Conciliado` e atualizando o saldo real do extrato bancário.

### 2.4 Módulo Fiscal e Emissão de Notas (`src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`)
- **Situação Atual:** Visualização e emissão de NF-e/NFC-e funcionam via APIs integradas, mas a exportação do pacote mensal de XMLs e a re-tentativa de notas em contingência exigem fechamento.
- **Pendência de Finalização:**
  1. Finalizar o empacotamento assíncrono em ZIP contendo todos os arquivos XML das notas fiscais autorizadas no mês/ano selecionado para envio contábil.
  2. Implementar a rotina de reprocessamento e consulta de status para notas salvas em modo de contingência ou pendentes na SEFAZ.

### 2.5 Atualização de Custo Estruturado (BOM / Ficha Técnica) (`src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`)
- **Situação Atual:** Cadastramento de kits e fichas técnicas existe no sistema, mas a alteração de custo da matéria-prima não recalcula automaticamente o custo do produto acabado.
- **Pendência de Finalização:**
  1. Disparar recalculo em cascata do `cost_price` de produtos acabados sempre que houver alteração de preço de custo em matérias-primas ou insumos pertencentes à sua estrutura (`bom_items`).
  2. Registrar o histórico de recálculo no histórico do produto.

### 2.6 Módulo de Comissões e Vendedores (`src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`)
- **Situação Atual:** Apuração de comissões por vendedor é exibida na tela, mas o fechamento financeiro do pagamento não gera lançamento direto no Contas a Pagar.
- **Pendência de Finalização:**
  1. Ao confirmar o pagamento de comissão em `CommissionPayouts.tsx`, gerar um registro no módulo `accountsPayable` classificado sob a categoria "Comissões de Vendas".
  2. Em caso de cancelamento ou estorno de venda no histórico, recalcular a comissão proporcional pendente e atualizar seu status para `Cancelado/Ajustado`.

---

## 3. Conclusão
O sistema possui uma arquitetura sólida e quase completa. As pendências mapeadas acima representam os pontos finais de amarração e consistência necessários para assegurar a máxima estabilidade operacional do ERP.
