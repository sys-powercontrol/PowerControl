# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração:** 02/08/2026 17:22:14 (Horário de Brasília - BRT)

---

## 1. Escopo e Objetivos
Esta especificação estabelece os requisitos técnicos detalhados para a conclusão das 6 pendências mapeadas no relatório geral (`analytics/report.md`). O objetivo é definir as alterações de página, comportamento e componente necessárias para finalizar o sistema sem adicionar novas páginas ou funcionalidades fora do escopo original.

---

## 2. Especificações de Finalização por Módulo

### SPEC-01: Sincronização Transacional de Vendas Offline
- **Arquivos Envolvidos:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/offlineStore.ts`
- **Página / Componente:** Módulo de PDV e Histórico de Vendas
- **Comportamento:**
  - O utilitário `offlineStore.ts` deve armazenar o pacote completo da venda offline (itens, cliente, forma de pagamento).
  - Ao detectar reconexão (`window.addEventListener('online')`), acionar `syncOfflineSales()`.
  - Executar a gravação utilizando `runTransaction` no Firestore para assegurar atomicidade entre:
    - Gravação da venda na coleção `sales`.
    - Atualização dos saldos de estoque em `products` e registro em `inventory_movements`.
    - Lançamento financeiro em `movements` (caixa) ou `accountsReceivable` (a prazo).
  - Atualizar o badge visual na página `SalesHistory.tsx` refletindo o status real (`Pendente` / `Sincronizado`).

### SPEC-02: Gestão de Baixa e Alteração em Cascata de Recorrências Financeiras
- **Arquivos Envolvidos:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Página / Componente:** Telas de Contas a Pagar e Contas a Receber
- **Comportamento:**
  - Ao editar ou dar baixa em um título recorrente, exibir modal de decisão de escopo:
    1. *Somente este lançamento*;
    2. *Este e todos os lançamentos futuros*.
  - Ao optar por "Este e todos os futuros", atualizar todas as parcelas subsequentes geradas com o mesmo `recurrent_id`.
  - Respeitar a regra de interrupção da recorrência configurada em `finance.ts` ao atingir `max_installments` ou a data limite `until_date`.

### SPEC-03: Algoritmo de Score de Match e Conciliação OFX em Lote
- **Arquivos Envolvidos:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Página / Componente:** Extrato de Conciliação Bancária
- **Comportamento:**
  - Ao processar as transações do arquivo OFX, comparar com o array de movimentações não conciliadas.
  - Atribuir pontuação de match de 0 a 100 com base em:
    - Valor exatamente igual (+50 pontos).
    - Data dentro do intervalo de ±3 dias (+30 pontos).
    - Descrição ou número de documento similar (+20 pontos).
  - Exibir indicação visual do nível de confiança (Alto >80, Médio 50-80, Baixo <50).
  - Fornecer botão de "Conciliar Selecionados em Lote", atualizando o status do lançamento no Firestore para `reconciled: true` e atualizando o saldo bancário correspondente.

### SPEC-04: Empacotamento de XMLs Fiscais em ZIP e Tratamento de Contingência
- **Arquivos Envolvidos:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`
- **Página / Componente:** Módulo Fiscal de NF-e / NFC-e
- **Comportamento:**
  - Adicionar/ajustar seletor de Mês e Ano na tela `Fiscal.tsx` com o botão "Baixar Pacote XML (ZIP)".
  - A rotina de download deve recuperar as notas autorizadas do período em `invoices`, baixar os XMLs correspondentes (da nuvem/storage ou gerados localmente) e agrupá-los utilizando a biblioteca `JSZip`, disparando o download do arquivo `xmls_nfe_MM_YYYY.zip`.
  - Na ação "Sincronizar Pendentes / Contingência", consultar o status das notas com estado `contingency` ou `pending` na API fiscal e atualizar o registro local.

### SPEC-05: Recálculo em Cascata de Custos em Ficha Técnica (BOM)
- **Arquivos Envolvidos:** `src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`
- **Página / Componente:** Cadastro e Ajustes de Produtos / Insumos
- **Comportamento:**
  - Sempre que o campo `cost_price` de uma matéria-prima/insumo for atualizado, acionar a função `recalculateBOMCosts(insumoId)`.
  - Buscar todos os produtos cujo array `bom_items` inclua o `insumoId`.
  - Recalcular o custo total do produto acabado somando `(quantidade_insumo * novo_custo_insumo)`.
  - Gravar os novos custos nos produtos acabados e registrar o log de movimentação/ajuste em `inventory_movements`.

### SPEC-06: Integração de Fechamento de Comissões com Contas a Pagar e Estornos
- **Arquivos Envolvidos:** `src/pages/CommissionPayouts.tsx`, `src/pages/SalesHistory.tsx`
- **Página / Componente:** Fechamento de Comissões e Histórico de Vendas
- **Comportamento:**
  - No modal de liquidação de comissão em `CommissionPayouts.tsx`, ao confirmar o pagamento, criar uma nova conta a pagar na coleção `accountsPayable` referente ao valor pago ao vendedor.
  - Ao cancelar/estornar uma venda em `SalesHistory.tsx`, se a comissão correspondente ainda estiver pendente, atualizar o registro de comissão para `cancelada`. Caso já tenha sido paga, registrar um lançamento de débito/ajuste no extrato do vendedor.
