# Especificação Técnica de Finalizações (Spec.md)
> **Data e Hora de Geração:** 01/08/2026 às 10:19:00 (Horário de Brasília - BRT)

---

## 1. Visão Geral

Esta especificação técnica detalha os requisitos funcionais, componentes envolvidos e comportamentos esperados para as **finalizações** pendentes do sistema **PowerControl ERP**, baseadas no relatório de análise `/analytics/report.md`. Não há inclusão de novos módulos ou telas; o objetivo é consolidar a estabilidade operacional dos fluxos existentes.

---

## 2. Especificação por Módulo

### 2.1. Módulo Vendas & PDV: Tratamento de Conflito de Estoque na Sincronização Offline
* **Componente/Arquivo Alvo:** `src/lib/offlineStore.ts`, `src/pages/Sales.tsx`, `src/components/NotificationCenter.tsx`
* **Comportamentos Pendentes:**
  1. Durante a execução da sincronização de vendas armazenadas offline (`syncPendingSales()`), efetuar a verificação prévia da quantidade disponível de cada item no Firestore.
  2. Se houver saldo suficiente: efetuar a dedução no estoque e atualizar o status da venda para `Concluída`.
  3. Se houver saldo insuficiente (estoque zerado por outro terminal durante o período offline): atualizar a venda para `Pendente de Estoque` e registrar alerta detalhado na central de notificações (`NotificationCenter`), especificando o produto e a divergência de saldo.

---

### 2.2. Módulo Financeiro: Recorrência Automática e Liquidação em Lote
* **Componente/Arquivo Alvo:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`
* **Comportamentos Pendentes:**
  1. **Recorrência:** Ao quitar uma conta marcada com a propriedade `recurrent: true`, calcular a próxima data de vencimento com base no intervalo e inserir a nova parcela automaticamente no Firestore.
  2. **Liquidação em Lote:** Incluir seleção via checkbox na listagem e botão de ação "Dar Baixa em Selecionados", abrindo modal consolidado para confirmação de conta bancária/caixa e data da operação para aplicar atualização em lote (`writeBatch`).

---

### 2.3. Módulo Financeiro: Algoritmo de Auto-Matching de Extrato OFX
* **Componente/Arquivo Alvo:** `src/components/Financial/OFXImporter.tsx`, `src/pages/BankReconciliation.tsx`
* **Comportamentos Pendentes:**
  1. No momento do parse e exibição das transações do extrato OFX, realizar o cruzamento inteligente com os títulos pendentes no Contas a Pagar e Receber.
  2. Aplicar cálculo de pontuação considerando valor idêntico (peso principal) e vencimento em janela de ±3 dias.
  3. Exibir marcador visual com a "Sugestão de Match" e botão de associação direta com 1 clique para agilizar a conciliação.

---

### 2.4. Módulo Fiscal: Reprocessamento de Pendentes e Exportação em Lote (ZIP)
* **Componente/Arquivo Alvo:** `src/pages/Fiscal.tsx`, `src/services/fiscalApi.ts`
* **Comportamentos Pendentes:**
  1. **Reprocessamento:** Incluir botão para verificar e atualizar notas com status `Pendente` junto aos provedores de emissão fiscal.
  2. **Exportação em Lote:** Disponibilizar ação de download dos arquivos XML e DANFE (PDF) das notas autorizadas no mês em um arquivo compactado `.zip` utilizando `jszip`.

---

### 2.5. Módulo Estoque & Compras: Dedução de Ficha Técnica (BOM) e Custo Médio Ponderado
* **Componente/Arquivo Alvo:** `src/lib/inventory.ts`, `src/components/BOMBuilder.tsx`, `src/pages/Purchases.tsx`
* **Comportamentos Pendentes:**
  1. **Baixa por BOM:** Ao finalizar a venda de produto acabado, identificar a existência de Ficha Técnica vinculada e abater proporcionalmente as quantidades das matérias-primas e insumos.
  2. **Custo Médio Ponderado:** Ao confirmar a recepção de compra em `Purchases.tsx`, recalcular o custo médio ponderado do produto:
     $$\text{Custo Médio Novo} = \frac{(\text{Estoque Antigo} \times \text{Custo Antigo}) + (\text{Qtd Comprada} \times \text{Preço Comprado})}{\text{Estoque Antigo} + \text{Qtd Comprada}}$$
  3. **Lançamento Financeiro:** Gerar automaticamente as pendências no Contas a Pagar conforme a condição comercial registrada no pedido de compra.

---

### 2.6. Módulo Pessoas & RBAC: Integração de Comissões e Guardas no Layout
* **Componente/Arquivo Alvo:** `src/pages/CommissionPayouts.tsx`, `src/components/Layout.tsx`, `src/lib/permissions.ts`
* **Comportamentos Pendentes:**
  1. **Baixa Financeira de Comissões:** Ao registrar a quitação de comissões aos vendedores, gerar automaticamente o lançamento de saída de caixa / conta a pagar na categoria "Despesas com Comissões".
  2. **Controle de Acesso RBAC:** Ocultar links e rotas do menu de navegação lateral para perfis não autorizados e aplicar redirecionamento imediato em tentativas de navegação direta por URL.

---
*Especificação gerada em conformidade com o relatório de finalizações pendentes.*
