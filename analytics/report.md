# Relatório de Análise do Sistema - Funcionalidades Pendentes
> **Data e Hora de Geração:** 01/08/2026 às 10:19:00 (Horário de Brasília - BRT)

---

## 1. Resumo Executivo

Este relatório apresenta uma análise técnica detalhada do sistema **PowerControl ERP**, focando **exclusivamente nas finalizações e refinamentos de funcionalidades existentes** que contam com fluxos incompletos, retornos simulados/fallback ou integrações pendentes no estado atual da base de código.

**Escopo do Relatório:**
Não foram incluídas novas funcionalidades ou módulos novos. Todas as pendências catalogadas referem-se estritamente à consolidação e finalização dos fluxos de trabalho já presentes na plataforma: Vendas & PDV (validação de saldo e resolução de conflitos de estoque na sincronização offline), Financeiro (recorrência, baixa em lote e auto-matching de extrato OFX), Fiscal (reprocessamento de notas pendentes e exportação em lote de XML/DANFE em arquivo compactado), Estoque & Compras (dedução proporcional de ficha técnica BOM e atualização de custo médio ponderado nas compras), e Pessoas & RBAC (integração financeira do pagamento de comissões e aplicação estrita das permissões de acesso e guardas de rota no Layout).

---

## 2. Diagnóstico Geral por Módulo

### 2.1. Módulo de Vendas, PDV e Sincronização Offline
* **Fila de Sincronização Offline (`offlineStore.ts` / `sw.ts` / `Sales.tsx`):**
  * *Estado Atual:* O Service Worker e o IndexedDB registram as vendas efetuadas offline na fila de sincronização (`sync-sales`).
  * *Pendência de Finalização:* Implementação da validação e tratamento de conflito de estoque ao sincronizar vendas salvas offline assim que a conexão é restabelecida, evitando saldos negativos e sinalizando divergências via notificação ao operador no `NotificationCenter`.

---

### 2.2. Módulo Financeiro e Conciliação Bancária
* **Contas a Pagar e Receber (`AccountsPayable.tsx` / `AccountsReceivable.tsx`):**
  * *Estado Atual:* Telas de lançamento, baixas individuais e estornos funcionam com persistência no Firestore.
  * *Pendência de Finalização:* 
    1. Geração automática das próximas parcelas para contas configuradas como recorrentes após a liquidação ou na mudança de ciclo.
    2. Ação de baixa/liquidação em lote de múltiplos títulos selecionados simultaneamente via tabela.
* **Conciliação Bancária e Extrato OFX (`OFXImporter.tsx` / `BankReconciliation.tsx`):**
  * *Estado Atual:* Parser nativo de arquivos `.ofx` que converte extratos bancários em lançamentos legíveis.
  * *Pendência de Finalização:* Algoritmo de cruzamento automático (auto-matching) ponderando valor exato, janela de datas (±3 dias) e número de documento/descrição para oferecer sugestões de liquidação/conciliação em 1 clique.

---

### 2.3. Módulo Fiscal e Emissão NFe/NFCe
* **Gestão de Notas Fiscais e Provedores Fiscais (`fiscalApi.ts` / `Fiscal.tsx`):**
  * *Estado Atual:* Envio e consulta individual de notas fiscais via FocusNFe e WebmaniaBR.
  * *Pendência de Finalização:*
    1. Fila de reprocessamento e checagem periódica automática de notas com status `Pendente` na SEFAZ.
    2. Exportação e download em lote dos arquivos XML e DANFE (PDF) compactados em arquivo `.zip` para envio à contabilidade.

---

### 2.4. Módulo de Estoque, Compras e Ficha Técnica (BOM)
* **Engenharia de Produto / Ficha Técnica (`BOMBuilder.tsx` / `inventory.ts`):**
  * *Estado Atual:* Criação de estruturas de insumos/matérias-primas e vínculo com o produto acabado.
  * *Pendência de Finalização:* Baixa automática proporcional do estoque de matérias-primas e insumos componentes durante a venda de produtos acabados com BOM, além da atualização do Custo Médio do produto acabado com base na variação dos custos dos seus insumos.
* **Entrada de Compras e Custo Médio (`Purchases.tsx` / `PurchaseHistory.tsx`):**
  * *Estado Atual:* Registro de compras e atualização de estoque.
  * *Pendência de Finalização:* Recálculo automático do Preço Médio de Custo no recebimento da compra e criação automática das obrigações no Contas a Pagar com base nas condições financeiras pactuadas.

---

### 2.5. Módulo de Pessoas, Comissões e RBAC
* **Pagamento de Comissões (`CommissionPayouts.tsx`):**
  * *Estado Atual:* Cálculo e listagem do extrato de comissões por vendedor.
  * *Pendência de Finalização:* Integração direta no pagamento da comissão gerando lançamento de saída/despesa no Contas a Pagar e no Caixa.
* **Controle de Acesso e Permissões (`Layout.tsx` / `Configurations.tsx` / `Employees.tsx`):**
  * *Estado Atual:* Estrutura de papéis e permissões no Firestore (`role` / `permissions`).
  * *Pendência de Finalização:* Aplicação estrita de regras de acesso no menu de navegação e guardas de rota no `Layout.tsx`, bloqueando acessos diretos por URL e ações restritas para usuários sem permissão adequada.

---

## 3. Matriz de Priorização das Finalizações

| ID | Módulo | Item Pendente | Impacto | Complexidade |
| :--- | :--- | :--- | :--- | :--- |
| **FIN-01** | **Vendas & Offline** | Resolução de conflitos de estoque no sync PWA offline | Alto | Média |
| **FIN-02** | **Financeiro** | Recorrência e baixa em lote no Contas a Pagar e Receber | Alto | Baixa |
| **FIN-03** | **Financeiro** | Algoritmo de auto-matching de extrato OFX | Médio | Média |
| **FIN-04** | **Fiscal** | Fila de reprocessamento e download de XML/DANFE em ZIP | Alto | Média |
| **FIN-05** | **Estoque & Compras** | Dedução automática de BOM e recálculo de custo médio | Alto | Média |
| **FIN-06** | **Pessoas & RBAC** | Baixa financeira de comissão e controle estrito no Layout | Médio | Baixa |

---
*Relatório de análise gerado estritamente para finalização das rotinas existentes, sem criação de novas telas ou módulos não solicitados.*
