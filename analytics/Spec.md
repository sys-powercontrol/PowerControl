# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Escopo e Objetivos
Esta especificação técnica detalha os requisitos de implementação para as 6 pendências identificadas no relatório (`analytics/report.md`). O objetivo é definir de forma clara as alterações de página, comportamento e componentes para o fechamento dos fluxos sem a adição de novos recursos fora do escopo ERP/PDV atual.

---

## 2. Especificação Detalhada por Módulo

### SPEC-01: Sincronização Transacional de Vendas Offline
- **Arquivos:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Página / Componente:** Frente de Caixa (PDV) e Histórico de Vendas (`SalesHistory.tsx`)
- **Comportamento:**
  - No evento de reconexão `online`, acionar a função de sincronização em `offlineStore.ts`.
  - Executar via `runTransaction` do Firestore a gravação em lote:
    1. Gravar registro em `sales`.
    2. Decrementar saldo em `products` e registrar documento em `inventory_movements`.
    3. Registrar lançamento em `movements` (caixa) ou `accountsReceivable`.
  - Atualizar os badges de status no `SalesHistory.tsx` de `Pendente` para `Sincronizado`.

### SPEC-02: Gestão de Baixa e Alteração em Cascata de Recorrências Financeiras
- **Arquivos:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Página / Componente:** Contas a Pagar e Contas a Receber
- **Comportamento:**
  - Ao editar ou liquidar uma parcela pertencente a uma série recorrente (`recurrent_id`), exibir modal com 2 opções:
    - *Apenas este lançamento*
    - *Este e todos os lançamentos futuros*
  - Ao selecionar a alteração em cascata, atualizar em lote os registros vinculados com vencimento posterior.
  - Aplicar o encerramento do ciclo recorrente em `finance.ts` se atingir `max_installments` ou `until_date`.

### SPEC-03: Score de Match e Conciliação OFX em Lote
- **Arquivos:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Página / Componente:** Conciliação Bancária (`BankReconciliation.tsx`)
- **Comportamento:**
  - Processar as linhas do extrato bancário importado via `OFXImporter.tsx` e calcular o score de compatibilidade (0 a 100):
    - Valor exato: +50 pontos.
    - Data aproximada (±3 dias): +30 pontos.
    - Descrição/Documento similar: +20 pontos.
  - Renderizar os marcadores visuais de confiança (Alto >80, Médio 50-80, Baixo <50).
  - Permitir botão de "Conciliar Selecionados em Lote", atualizando `reconciled: true` e ajustando os saldos da conta bancária.

### SPEC-04: Empacotamento de XMLs Fiscais em ZIP e Sincronização de Contingência
- **Arquivos:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`
- **Página / Componente:** Módulo Fiscal (`Fiscal.tsx`)
- **Comportamento:**
  - Adicionar o botão "Exportar XMLs (ZIP)" no painel de filtros de Mês/Ano.
  - Agrupar os XMLs das notas com status `authorized` do período em arquivo compactado via `JSZip` e disparar o download (`xmls_nfe_MM_YYYY.zip`).
  - Disponibilizar a ação "Sincronizar Contingência" para verificar status na SEFAZ de notas `pending` ou `contingency` e atualizar o Firestore.

### SPEC-05: Recálculo de Custos em Ficha Técnica (BOM)
- **Arquivos:** `src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`
- **Página / Componente:** Gestão de Produtos (`Products.tsx`)
- **Comportamento:**
  - Ao salvar alteração do `cost_price` de um produto marcado como matéria-prima/insumo, buscar produtos que o contêm em `bom_items`.
  - Recalcular o novo custo do produto composto somando os custos atualizados dos seus insumos.
  - Atualizar o registro em `products` e registrar a alteração no histórico de auditoria.

### SPEC-06: Fechamento de Comissões e Vínculo Financeiro
- **Arquivos:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Página / Componente:** Comissões (`CommissionPayouts.tsx`) e Vendas (`SalesHistory.tsx`)
- **Comportamento:**
  - No modal de liquidação de comissão do vendedor, ao clicar em "Confirmar Pagamento", criar automaticamente uma conta a pagar (`accountsPayable`) com a categoria "Comissões de Vendas".
  - Ao cancelar/estornar uma venda em `SalesHistory.tsx`, se a comissão estiver pendente, alterar o status da comissão vinculada para `canceled`.
