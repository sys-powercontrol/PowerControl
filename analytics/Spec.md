# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração:** 03/08/2026 07:25:19 (Horário de Brasília - BRT)

---

## 1. Escopo e Objetivos
Esta especificação descreve os requisitos técnicos detalhados para finalizar as 6 pendências identificadas no relatório (`analytics/report.md`). O objetivo é definir as alterações específicas de página, comportamento e componentes para garantir o fechamento funcional do sistema sem a criação de novas telas ou recursos fora do escopo do ERP.

---

## 2. Especificações Técnicas por Módulo

### SPEC-01: Sincronização Transacional de Vendas Offline
- **Arquivos Envolvidos:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Página / Componente:** Módulo de PDV e Histórico de Vendas
- **Comportamento:**
  - O utilitário `offlineStore.ts` deve armazenar a venda offline com todos os itens, dados do cliente e método de pagamento.
  - Ao detectar a reconexão da rede (`online`), disparar a sincronização assíncrona com o Firestore.
  - Executar a persistência remota em bloco atômico com `runTransaction`:
    1. Criar o registro da venda em `sales`.
    2. Atualizar o saldo de estoque em `products` e registrar a movimentação em `inventory_movements`.
    3. Registrar a movimentação de caixa em `movements` ou título em `accountsReceivable`.
  - Atualizar os badges de status em `SalesHistory.tsx` para indicar o estado de sincronização (`Pendente` vs `Sincronizado`).

### SPEC-02: Gestão de Baixa e Alteração em Cascata de Recorrências Financeiras
- **Arquivos Envolvidos:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Página / Componente:** Módulos de Contas a Pagar e Contas a Receber
- **Comportamento:**
  - Ao alterar ou liquidar uma parcela pertencente a uma série recorrente (`recurrent_id`), exibir modal de confirmação de escopo:
    - *Apenas este lançamento*
    - *Este e todos os lançamentos futuros*
  - Ao selecionar a opção em cascata, atualizar em lote todos os títulos vinculados com data de vencimento posterior.
  - Aplicar as regras de limite do ciclo em `finance.ts` ao atingir a quantidade máxima de parcelas (`max_installments`) ou a data de encerramento (`until_date`).

### SPEC-03: Score de Match e Conciliação OFX em Lote
- **Arquivos Envolvidos:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Página / Componente:** Extrato de Conciliação Bancária
- **Comportamento:**
  - Processar os lançamentos do extrato OFX e calcular a pontuação de similaridade (0 a 100) contra as movimentações pendentes:
    - Valor exato: +50 pontos.
    - Data no intervalo de ±3 dias: +30 pontos.
    - Descrição ou número de documento similar: +20 pontos.
  - Exibir o indicador visual da confiança da sugestão (Alto >80, Médio 50-80, Baixo <50).
  - Permitir a confirmação da conciliação em lote, atualizando o campo `reconciled: true` nos títulos e atualizando o saldo bancário da conta.

### SPEC-04: Empacotamento de XMLs Fiscais em ZIP e Sincronização de Contingência
- **Arquivos Envolvidos:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`
- **Página / Componente:** Módulo Fiscal (NF-e / NFC-e)
- **Comportamento:**
  - No filtro por Mês/Ano da tela `Fiscal.tsx`, disponibilizar a ação "Exportar XMLs (ZIP)".
  - Recuperar do banco/storage os XMLs das notas autorizadas do período e agrupá-los utilizando a biblioteca `JSZip`, disparando o download do arquivo `xmls_nfe_MM_YYYY.zip`.
  - Na ação "Sincronizar Pendentes", consultar a API fiscal para notas em estado `contingency` ou `pending` e atualizar o status local conforme resposta da SEFAZ.

### SPEC-05: Recálculo em Cascata de Custos em Ficha Técnica (BOM)
- **Arquivos Envolvidos:** `src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`
- **Página / Componente:** Cadastro de Produtos e Ajustes de Estoque
- **Comportamento:**
  - Ao atualizar o `cost_price` de um insumo/matéria-prima, acionar a função de atualização de custos compostos.
  - Buscar os produtos acabados que possuem o insumo na sua estrutura (`bom_items`).
  - Recalcular o custo total somando os custos dos insumos atualizados (`quantidade * novo_custo`).
  - Salvar os novos valores nos produtos acabados e registrar a alteração no histórico.

### SPEC-06: Fechamento de Comissões e Integração Financeira
- **Arquivos Envolvidos:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Página / Componente:** Gestão de Comissões e Histórico de Vendas
- **Comportamento:**
  - No modal de fechamento de comissão em `CommissionPayouts.tsx`, ao confirmar o pagamento, criar automaticamente um registro no Contas a Pagar (`accountsPayable`) categorizado como "Comissões de Vendas".
  - Ao cancelar ou estornar uma venda em `SalesHistory.tsx`, se a comissão correspondente estiver pendente, atualizar o status da comissão para `cancelada`.
