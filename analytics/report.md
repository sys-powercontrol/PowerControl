# Relatório de Análise do Sistema - Funcionalidades Pendentes
> **Data e Hora de Geração:** 31/07/2026 às 19:59:23 (Horário de Brasília - BRT)

---

## 1. Resumo Executivo

Este relatório apresenta uma análise técnica minuciosa da aplicação **PowerControl ERP**, focando **exclusivamente nas finalizações e refinamentos de funcionalidades existentes** que possuem fluxos incompletos, retornos simulados/fallback ou integrações pendentes.

**Escopo:** Não foram incluídas novas funcionalidades ou módulos não solicitados. Todas as pendências catalogadas referem-se estritamente à consolidação das rotinas existentes de Vendas/PDV, Financeiro, Fiscal, Estoque/Compras, Comissões e Administração.

---

## 2. Diagnóstico Geral por Módulo

### 2.1. Módulo de Vendas, PDV e Sincronização Offline
* **Gateway de Pagamento e Webhooks (MercadoPago / PIX / Cartão):**
  * *Estado Atual:* `server.ts` e `PaymentGateway.tsx` possuem polling e simulação de pagamento com fallback para transações sem token real configurado.
  * *Pendência de Finalização:* Tratar a confirmação assíncrona por Webhook real quando as chaves de API estão ativas, garantindo a baixa automática da venda sem dependência exclusiva de polling no frontend.
* **Fila de Sincronização Offline (`offlineStore.ts` & `sw.ts`):**
  * *Estado Atual:* O Service Worker e o IndexedDB registram vendas offline no canal `sync-sales`.
  * *Pendência de Finalização:* Tratar conflitos de estoque ao sincronizar vendas pendentes armazenadas offline no momento em que a conexão é reestabelecida, garantindo que o estoque não fique negativo e alertando o operador em caso de divergência.
* **Impressão de Comprovante de Venda:**
  * *Estado Atual:* `Sales.tsx` permite finalizar a venda e disparar impressão.
  * *Pendência de Finalização:* Padronização e parametrização do layout para impressoras térmicas não-fiscais (80mm / 58mm) com corte de papel e formatação limpa do comprovante de venda.

---

### 2.2. Módulo Financeiro e Conciliação Bancária
* **Contas a Pagar e Receber (`AccountsPayable.tsx` / `AccountsReceivable.tsx`):**
  * *Estado Atual:* Telas de lançamento, baixas, estornos e cálculo de atrasos funcionam com persistência no Firestore.
  * *Pendência de Finalização:* 
    1. Tratamento automático de recorrências (geração mensal/semanal automática das próximas parcelas ao liquidar ou no primeiro dia do mês).
    2. Liquidação em lote (baixa simultânea de múltiplos títulos selecionados).
* **Conciliação Bancária e Extrato OFX (`OFXImporter.tsx` / `BankReconciliation.tsx`):**
  * *Estado Atual:* O parser OFX nativo lê arquivos `.ofx` sem dependência externa instável e mapeia as transações.
  * *Pendência de Finalização:* Algoritmo de cruzamento automático por valor, data próxima (janela de ±3 dias) e número do documento/FITID com lançamentos do Contas a Pagar/Receber para atalhos de reconciliação em 1 clique.

---

### 2.3. Módulo Fiscal e Emissão NFe/NFCe
* **Integração com Provedores Fiscais (`fiscalApi.ts` / `Fiscal.tsx`):**
  * *Estado Atual:* Suporte a FocusNFe e WebmaniaBR para envio e consulta de NFe/NFCe.
  * *Pendência de Finalização:*
    1. Fila de reprocessamento e consulta periódica automática para notas com status `Pendente` na SEFAZ (evitando que fiquem presas em lote sem atualização de status).
    2. Exportação e download em lote dos arquivos XML e DANFE (PDF) compactados em arquivo ZIP para contabilidade.

---

### 2.4. Módulo de Estoque, Compras e Ficha Técnica (BOM)
* **Composição de Produtos / Engenharia de Produto (`BOMBuilder.tsx`):**
  * *Estado Atual:* Interface de montagem da estrutura de insumos/matérias-primas por produto acabado.
  * *Pendência de Finalização:* Baixa automática proporcional do estoque de insumos/matérias-primas no momento da venda ou ordem de produção do produto acabado, bem como recálculo automático do Custo Médio do produto final baseado nos componentes.
* **Entrada de Compras e Histórico (`Purchases.tsx` / `PurchaseHistory.tsx`):**
  * *Estado Atual:* Cadastro e lançamento de compras.
  * *Pendência de Finalização:* Atualização automática do estoque e do Preço Médio de Custo do produto no recebimento, gerando simultaneamente as parcelas do Contas a Pagar conforme a condição de pagamento informada.

---

### 2.5. Módulo de Pessoas, Comissões e RBAC
* **Pagamento de Comissões (`CommissionPayouts.tsx`):**
  * *Estado Atual:* Listagem e calculo de comissões por vendedor.
  * *Pendência de Finalização:* Vinculação direta da baixa da comissão com a criação automática de uma despesa/saída no Contas a Pagar e Caixa da empresa.
* **Controle de Acesso e Permissões (`Employees.tsx` / `Configurations.tsx`):**
  * *Estado Atual:* Interface de configuração de níveis de acesso (Admin, Gerente, Vendedor, Caixa).
  * *Pendência de Finalização:* Aplicação estrita da verificação de permissões nas rotas de navegação no `Layout.tsx` e bloqueio de ações críticas (ex: cancelar venda, aplicar desconto acima do limite, estornar caixa).

---

## 3. Matriz de Priorização das Finalizações

| Módulo | Item Pendente | Impacto | Complexidade |
| :--- | :--- | :--- | :--- |
| **Vendas & Offline** | Tratamento de conflitos de estoque na sincronização PWA | Alto | Média |
| **Vendas & Offline** | Webhook de confirmação assíncrona PIX/Cartão | Alto | Média |
| **Financeiro** | Recorrência e Baixa em Lote no Contas a Pagar/Receber | Alto | Baixa |
| **Financeiro** | Auto-matching na Conciliação Bancária OFX | Médio | Média |
| **Fiscal** | Reprocessamento automático de NFe/NFCe pendente e Download de XMLs em Lote | Alto | Média |
| **Estoque & Compras** | Dedução automática de BOM e atualização de Custo Médio em Compras | Alto | Média |
| **Pessoas & RBAC** | Integração da baixa de comissões no Contas a Pagar e Controle de Permissões no Layout | Médio | Baixa |

---
*Relatório concluído sem introdução de novas funcionalidades.*
