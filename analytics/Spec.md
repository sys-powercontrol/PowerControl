# Especificação Técnica de Finalização de Funcionalidades (Spec.md)
> **Data e Hora de Geração:** 31/07/2026 às 19:59:23 (Horário de Brasília - BRT)

---

## 1. Visão Geral da Especificação

Esta especificação detalha os requisitos de sistema, comportamento e componentes necessários para a **finalização completa das funcionalidades já existentes no PowerControl ERP**, conforme levantado no relatório `/analytics/report.md`.

---

## 2. Especificações por Módulo

### 2.1. Módulo Vendas e Sincronização Offline (PDV / PWA)

#### **ESPEC-01: Tratamento de Conflitos e Baixa de Estoque no Sync Offline**
* **Página:** `Sales.tsx` / `src/lib/offlineStore.ts`
* **Comportamento (Behavior):**
  * Quando o navegador recupera a conexão à internet, a fila `sync-sales` em `offlineStore.ts` processa sequencialmente as vendas represadas.
  * Para cada venda offline, o sistema valida se a quantidade em estoque no Firestore atende aos itens da venda.
  * Se o estoque for suficiente, realiza a baixa do estoque e altera o status da venda para `Concluída`.
  * Se o estoque for insuficiente para algum item, altera o status da venda sincronizada para `Pendente de Estoque` e notifica o usuário via `NotificationCenter` com detalhes da divergência.
* **Componentes Impactados:**
  * `src/lib/offlineStore.ts` (Função `syncPendingSales`)
  * `src/components/NotificationCenter.tsx` (Notificação de alerta de estoque insuficiente pós-sync)

#### **ESPEC-02: Webhook e Confirmação Assíncrona de Pagamentos (PIX / Cartão)**
* **Página:** `server.ts` / `src/components/Sales/PaymentGateway.tsx`
* **Comportamento (Behavior):**
  * O servidor backend em `server.ts` processa as notificações recebidas na rota `/api/payments/webhook`.
  * Atualiza o registro da cobrança no banco de dados para `APPROVED` ou `REJECTED`.
  * O componente `PaymentGateway.tsx` reage à mudança de status do pagamento emitindo evento de sucesso para conclusão automática da transação no PDV.
* **Componentes Impactados:**
  * `server.ts` (Endpoint `/api/payments/webhook`)
  * `src/components/Sales/PaymentGateway.tsx` (Hook de listener / SSE / polling inteligente)

---

### 2.2. Módulo Financeiro e Conciliação Bancária

#### **ESPEC-03: Recorrência e Liquidação em Lote no Contas a Pagar e Receber**
* **Página:** `AccountsPayable.tsx` & `AccountsReceivable.tsx`
* **Comportamento (Behavior):**
  * **Recorrência:** Ao marcar uma conta recorrente como `Paga`/`Recebida`, o sistema gera automaticamente o lançamento referente ao próximo período (mensal/semanal), mantendo histórico do título original.
  * **Liquidação em Lote:** Permite selecionar múltiplas contas através de checkboxes na tabela e executar a ação "Dar Baixa em Selecionados", informando conta bancária/caixa e data de pagamento únicas para o lote.
* **Componentes Impactados:**
  * `src/pages/AccountsPayable.tsx`
  * `src/pages/AccountsReceivable.tsx`
  * `src/components/ui/` (Checkbox de seleção global na tabela)

#### **ESPEC-04: Auto-Matching Inteligente na Conciliação Bancária OFX**
* **Página:** `BankReconciliation.tsx` / `OFXImporter.tsx`
* **Comportamento (Behavior):**
  * Ao importar um arquivo `.ofx`, o sistema compara cada item do extrato com os lançamentos pendentes em Contas a Pagar/Receber.
  * O critério de correspondência avalia:
    1. Valor exato.
    2. Data de vencimento/pagamento em janela de ±3 dias.
    3. Documento / Descrição similar.
  * Transações com correspondência exata exibem um selo verde "Correspondência Encontrada" com botão de conciliação em 1 clique.
* **Componentes Impactados:**
  * `src/components/Financial/OFXImporter.tsx`
  * `src/pages/BankReconciliation.tsx`

---

### 2.3. Módulo Fiscal (NFe e NFCe)

#### **ESPEC-05: Reprocessamento de Pendências e Exportação de XMLs em Lote**
* **Página:** `Fiscal.tsx` / `src/services/fiscalApi.ts`
* **Comportamento (Behavior):**
  * **Reprocessamento:** Notas fiscais no status `Pendente` possuem botão de "Consultar Status na SEFAZ" e rotina periódica de verificação de lote.
  * **Download em Lote:** Na tela Fiscal, um filtro de período permite selecionar notas emitidas e baixar um arquivo `.zip` contendo os XMLs autorizados e seus respectivos DANFEs em PDF para a contabilidade.
* **Componentes Impactados:**
  * `src/pages/Fiscal.tsx`
  * `src/services/fiscalApi.ts`

---

### 2.4. Módulo de Estoque, Compras e Ficha Técnica (BOM)

#### **ESPEC-06: Dedução Automática de BOM e Atualização de Custo Médio em Compras**
* **Página:** `BOMBuilder.tsx`, `Products.tsx`, `Purchases.tsx`
* **Comportamento (Behavior):**
  * **Ficha Técnica (BOM):** Ao vender um produto configurado com ficha técnica, o sistema abate o estoque das matérias-primas e insumos componentes proporcionalmente à quantidade vendida.
  * **Preço Médio de Custo em Compras:** Ao dar entrada em uma compra em `Purchases.tsx`, o sistema calcula o novo custo médio do produto:
    $$\text{Custo Médio Novo} = \frac{(\text{Estoque Antigo} \times \text{Custo Antigo}) + (\text{Qtd Comprada} \times \text{Preço Comprado})}{\text{Estoque Antigo} + \text{Qtd Comprada}}$$
  * Ao confirmar o recebimento da compra, insere automaticamente as parcelas de pagamento no Contas a Pagar.
* **Componentes Impactados:**
  * `src/lib/inventory.ts`
  * `src/components/BOMBuilder.tsx`
  * `src/pages/Purchases.tsx`

---

### 2.5. Módulo de Pessoas, Comissões e RBAC

#### **ESPEC-07: Integração Financeira de Comissões e Aplicação Estrita de Permissões**
* **Página:** `CommissionPayouts.tsx`, `Layout.tsx`, `Configurations.tsx`
* **Comportamento (Behavior):**
  * **Baixa de Comissões:** Ao efetuar o pagamento da comissão de um vendedor em `CommissionPayouts.tsx`, o sistema gera uma transação de saída no caixa selecionado com a categoria "Despesa com Comissões".
  * **Aplicação de RBAC:** O menu lateral em `Layout.tsx` oculta e restringe o acesso às páginas conforme o perfil do usuário logado (`role` / `permissions`), redirecionando para `/404` ou exibindo toast de acesso não autorizado caso o usuário tente acessar via URL direta.
* **Componentes Impactados:**
  * `src/pages/CommissionPayouts.tsx`
  * `src/components/Layout.tsx`
  * `src/pages/Configurations.tsx`

---
*Especificação de finalizações concluída com sucesso.*
