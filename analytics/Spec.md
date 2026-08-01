# Especificação Técnica de Finalização de Funcionalidades (Spec.md)
> **Data e Hora de Geração:** 01/08/2026 às 09:41:00 (Horário de Brasília - BRT)

---

## 1. Visão Geral da Especificação

Esta especificação técnica detalha os requisitos funcionais, comportamentos esperados (behaviors) e componentes envolvidos no processo de **finalização das funcionalidades já presentes no PowerControl ERP**, com base no diagnóstico mapeado em `/analytics/report.md`.

---

## 2. Especificação Detalhada dos Módulos

### 2.1. Módulo Vendas e Sincronização Offline (PDV / PWA)

#### **ESPEC-01: Validação de Estudo e Resolução de Conflitos no Sync Offline**
* **Páginas / Arquivos:** `src/pages/Sales.tsx`, `src/lib/offlineStore.ts`, `src/sw.ts`
* **Comportamento (Behavior):**
  * Quando o navegador recupera a conexão à internet, a função `syncPendingSales` em `offlineStore.ts` lê a fila de vendas pendentes no IndexedDB.
  * Para cada venda, consulta o saldo atualizado do produto no Firestore.
  * Caso o saldo em estoque seja suficiente, efetua o abate e atualiza o status da venda para `Concluída`.
  * Caso o estoque atual seja menor que a quantidade da venda offline, altera o status da venda para `Pendente de Estoque` e emite um alerta no `NotificationCenter`.
* **Componentes / Módulos:**
  * `src/lib/offlineStore.ts` (Atualização do fluxo de sincronização)
  * `src/components/NotificationCenter.tsx` (Emissão de alerta de divergência de estoque)

#### **ESPEC-02: Confirmação Assíncrona de Pagamentos por Webhook (PIX / Cartão)**
* **Páginas / Arquivos:** `src/serverApp.ts`, `src/components/Sales/PaymentGateway.tsx`
* **Comportamento (Behavior):**
  * O servidor Node.js/Express em `serverApp.ts` recebe e valida o payload enviado pelo gateway de pagamento na rota `/api/webhooks/mercadopago`.
  * O webhook localiza a venda/cobrança no Firestore através do `payment_id` e atualiza seu status para `CONFIRMED` ou `REJECTED`.
  * O componente `PaymentGateway.tsx` escuta a atualização da transação e conclui a venda na interface sem necessidade de intervenção manual do operador.
* **Componentes / Módulos:**
  * `src/serverApp.ts` (Endpoint de recebimento de webhook)
  * `src/components/Sales/PaymentGateway.tsx` (Atualização reativa de status)

---

### 2.2. Módulo Financeiro e Conciliação Bancária

#### **ESPEC-03: Lançamentos Recorrentes e Liquidação em Lote**
* **Páginas / Arquivos:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`
* **Comportamento (Behavior):**
  * **Recorrência:** Ao quitar uma conta cadastrada com periodicidade (mensal/semanal), o sistema agenda ou lança automaticamente a cobrança do próximo período com data de vencimento ajustada.
  * **Liquidação em Lote:** Adiciona caixas de seleção (checkboxes) na listagem das contas. Ao selecionar múltiplos títulos e clicar em "Liquidar Selecionados", exibe modal para confirmação de conta bancária, forma de pagamento e data de baixa comum.
* **Componentes / Módulos:**
  * `src/pages/AccountsPayable.tsx` (Checkbox de tabela e barra de ações em lote)
  * `src/pages/AccountsReceivable.tsx` (Seleção e liquidação em lote)

#### **ESPEC-04: Auto-Matching Inteligente no Extrato OFX**
* **Páginas / Arquivos:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
* **Comportamento (Behavior):**
  * Durante a leitura do arquivo `.ofx`, o algoritmo compara o valor e a data de cada transação bancária com os títulos pendentes em Contas a Pagar/Receber.
  * Para correspondências com tolerância de até ±3 dias e valor idêntico, destaca a linha com indicação visual "Sugestão de Conciliação" e botão "Conciliar em 1 clique".
* **Componentes / Módulos:**
  * `src/components/Financial/OFXImporter.tsx` (Lógica de pareamento de transações)
  * `src/pages/BankReconciliation.tsx` (Exibição e confirmação rápida)

---

### 2.3. Módulo Fiscal (NFe e NFCe)

#### **ESPEC-05: Fila de Reprocessamento SEFAZ e Download de XML/DANFE em Lote**
* **Páginas / Arquivos:** `src/pages/Fiscal.tsx`, `src/services/fiscalApi.ts`
* **Comportamento (Behavior):**
  * **Reprocessamento:** Notas que permanecem no status `Pendente` passam por uma consulta periódica ao provedor fiscal para atualização automática assim que a SEFAZ autoriza ou rejeita o lote.
  * **Download em Lote (.ZIP):** Inclui botão na tela `Fiscal.tsx` para selecionar o mês/ano e realizar o download compactado de todos os XMLs e DANFEs (PDFs) autorizados do período.
* **Componentes / Módulos:**
  * `src/pages/Fiscal.tsx` (Ações de reprocessamento e botão de exportação compactada)
  * `src/services/fiscalApi.ts` (Método de geração do pacote ZIP)

---

### 2.4. Módulo de Estoque, Compras e Ficha Técnica (BOM)

#### **ESPEC-06: Dedução Proporcional de Insumos (BOM) e Custo Médio na Compra**
* **Páginas / Arquivos:** `src/components/BOMBuilder.tsx`, `src/lib/inventory.ts`, `src/pages/Purchases.tsx`
* **Comportamento (Behavior):**
  * **Abate de Insumos (BOM):** Quando uma venda de um produto composto é confirmada, o sistema deduce o estoque de cada um dos insumos cadastrados em sua ficha técnica na proporção definida.
  * **Atualização do Custo Médio:** Ao dar entrada em uma nota de compra em `Purchases.tsx`, o sistema calcula e atualiza o Custo Médio ponderado do produto e gera as respectivas parcelas no Contas a Pagar.
* **Componentes / Módulos:**
  * `src/lib/inventory.ts` (Cálculo de custo médio e baixa de insumos por BOM)
  * `src/pages/Purchases.tsx` (Finalização de compra e integração financeira)

---

### 2.5. Módulo de Pessoas, Comissões e RBAC

#### **ESPEC-07: Baixa Financeira de Comissões e Aplicação Estrita de RBAC**
* **Páginas / Arquivos:** `src/pages/CommissionPayouts.tsx`, `src/components/Layout.tsx`, `src/lib/permissions.ts`
* **Comportamento (Behavior):**
  * **Lançamento de Comissão no Financeiro:** Ao realizar a baixa do pagamento de comissão a um vendedor, registra a saída no Contas a Pagar / Caixa com a categoria "Despesas com Comissões".
  * **Aplicação de RBAC no Layout:** O menu de navegação e as rotas em `Layout.tsx` filtram visualmente os links e bloqueiam o acesso a URLs restritas conforme a função (`role`) do usuário autenticado.
* **Componentes / Módulos:**
  * `src/pages/CommissionPayouts.tsx` (Geração de movimentação financeira)
  * `src/components/Layout.tsx` (Guarda de rotas e filtragem dinâmica de menu)

---
*Especificação desenvolvida exclusivamente para a finalização dos componentes e fluxos existentes.*
