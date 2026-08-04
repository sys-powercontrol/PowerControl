# Relatório de Análise Geral do Sistema - Pendências de Finalização

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Visão Geral e Diretrizes da Análise
Este relatório apresenta o diagnóstico estrutural e funcional do sistema ERP/PDV (Power Control). O objetivo é mapear com precisão as **pendências de finalização e consolidação das funcionalidades já existentes no código**, garantindo a consistência dos dados, a integridade transacional e a usabilidade dos fluxos sem introduzir novas funcionalidades ou alterar o escopo do projeto.

---

## 2. Diagnóstico das Pendências de Finalização por Módulo

### 2.1 Sincronização Transacional de Vendas Offline
- **Arquivos Relevantes:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Diagnóstico Atual:** As vendas realizadas sem conexão com a internet são persistidas no IndexedDB via `offlineStore.ts`. Ao retomar a conexão, a rotina de envio precisa garantir que as operações de criação de venda, abatimento de estoque (`inventory_movements`), lançamento de caixa (`movements`) e geração de título (`accountsReceivable`) ocorram em um único bloco transacional atômico (`runTransaction`).
- **Pendências:**
  1. Implementar a rotina de sincronização utilizando a transação atômica do Firestore (`runTransaction`).
  2. Atualizar dinamicamente o estado visual dos *badges* no `SalesHistory.tsx` para sinalizar vendas pendentes de sincronização vs. sincronizadas.

### 2.2 Baixa e Alteração em Cascata de Recorrências Financeiras
- **Arquivos Relevantes:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Diagnóstico Atual:** O sistema possui suporte a títulos financeiros recorrentes, porém o fluxo de baixa ou alteração de uma parcela não oferece a escolha explícita de impacto nas parcelas subsequentes.
- **Pendências:**
  1. Adicionar o diálogo/modal de confirmação no momento de editar ou liquidar uma parcela recorrente ("Apenas este lançamento" vs. "Este e todos os lançamentos futuros").
  2. Garantir a aplicação da interrupção do ciclo recorrente quando atingida a contagem limite (`max_installments`) ou a data limite (`until_date`).

### 2.3 Algoritmo de Match Score e Conciliação OFX em Lote
- **Arquivos Relevantes:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Diagnóstico Atual:** O leitor de arquivos OFX realiza a extração do extrato bancário, porém o cruzamento automático com os lançamentos pendentes precisa formalizar o cálculo do Score de Match (0 a 100).
- **Pendências:**
  1. Consolidar o algoritmo de cálculo de pontuação considerando valor exato (+50 pts), janela de data ±3 dias (+30 pts) e similaridade da descrição (+20 pts).
  2. Implementar a ação de confirmação de conciliação em lote com atualização do estado do título (`reconciled: true`) e ajuste do saldo bancário correspondente.

### 2.4 Exportação de XMLs Fiscais em ZIP e Tratamento de Contingência
- **Arquivos Relevantes:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`
- **Diagnóstico Atual:** O módulo fiscal permite a transmissão de NF-e/NFC-e, porém o empacotamento em lote dos arquivos XML autorizados no mês e a sincronização de notas presas em contingência demandam fechamento.
- **Pendências:**
  1. Finalizar a rotina de exportação mensal compactada em arquivo ZIP (usando `JSZip`) com os arquivos XML de notas autorizadas.
  2. Consolidar a rotina de consulta e atualização de status para notas fiscais enviadas em contingência ou pendentes na SEFAZ.

### 2.5 Recálculo de Custos em Ficha Técnica de Produtos Compostos (BOM)
- **Arquivos Relevantes:** `src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`
- **Diagnóstico Atual:** O cadastro de produtos permite definir itens compostos (kits/fichas técnicas), mas a atualização do preço de custo de uma matéria-prima/insumo não recalcula automaticamente o custo do produto acabado.
- **Pendências:**
  1. Implementar o recálculo automático do `cost_price` dos produtos acabados sempre que o custo de um insumo componente for alterado.
  2. Registrar o histórico de recálculo de custo na auditoria e movimentação do estoque.

### 2.6 Fechamento de Comissões e Vínculo com Contas a Pagar
- **Arquivos Relevantes:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Diagnóstico Atual:** O cálculo das comissões dos vendedores é efetuado por venda, mas a liquidação no painel de comissões não cria automaticamente o registro financeiro correspondente.
- **Pendências:**
  1. Ao confirmar o pagamento da comissão em `CommissionPayouts.tsx`, gerar automaticamente um título em `accountsPayable` sob a categoria "Comissões de Vendas".
  2. Ao estornar/cancelar uma venda no histórico (`SalesHistory.tsx`), recalcular ou cancelar a comissão pendente vinculada a essa venda.

---

## 3. Conclusão
Todas as pendências mapeadas correspondem estritamente à finalização de fluxos de trabalho já iniciados no sistema. Nenhuma funcionalidade inédita foi adicionada.
