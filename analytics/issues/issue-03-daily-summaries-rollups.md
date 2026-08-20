# Issue 03: Arquitetura de Documentos de Rollup Diários/Mensais com Atualizações Atômicas

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Implementar a estratégia de documentos de consolidação diária (`daily_summaries`) por empresa, atualizados atomicamente nas mutações de vendas, baixas e compras. Isso permite que relatórios e gráficos consultem 1 documento por dia em vez de centenas ou milhares de registros individuais de vendas/títulos.

---

## 2. Escopo de Arquivos
* `src/lib/inventory.ts`
* `src/lib/finance.ts`
* `src/pages/Sales.tsx`
* `src/lib/api.ts`

---

## 3. Tarefas de Implementação
1. **Estrutura do Documento de Rollup Diário:**
   - Caminho: `companies/{companyId}/daily_summaries/{YYYY-MM-DD}`.
   - Campos:
     - `date`: string ISO (YYYY-MM-DD)
     - `total_sales`: soma monetária de vendas autorizadas/concluídas
     - `sales_count`: quantidade de vendas
     - `total_cost`: custo total dos produtos vendidos
     - `gross_profit`: margem bruta acumulada
     - `payment_methods`: `{ dinheiro: number, pix: number, debito: number, credito: number, a_prazo: number }`
     - `total_expenses_paid`: despesas liquidadas no dia
     - `total_purchases`: compras registradas no dia
     - `updated_at`: `serverTimestamp()`

2. **Incremento Atômico no Fechamento da Venda (`Sales.tsx` / `inventory.ts`):**
   - Ao emitir ou finalizar uma venda, adicionar ao `writeBatch` ou `runTransaction` o `setDoc(summaryRef, { ... }, { merge: true })` com `increment(saleTotal)` e `increment(1)` na contagem.
   - Tratar cancelamento de venda realizando o decremento proporcional correspondente.

3. **Incremento Atômico na Baixa de Contas a Pagar/Receber (`finance.ts` / `AccountsPayable.tsx`):**
   - Ao liquidar uma conta a pagar, incrementar `total_expenses_paid` no resumo do dia do pagamento.
   - Ao liquidar uma conta a receber, incrementar o total liquidado correspondente.

4. **Helper de Leitura Consolidada em `src/lib/api.ts`:**
   - Criar `api.getDailySummaries(companyId: string, startDate: string, endDate: string)`.

---

## 4. Critérios de Aceite
- Ao realizar uma venda de R$ 100, o documento `companies/{companyId}/daily_summaries/{YYYY-MM-DD}` tem seus contadores e somatórios incrementados no mesmo commit atômico.
- Nenhuma leitura extra de vendas individuais é necessária para obter o faturamento diário.
