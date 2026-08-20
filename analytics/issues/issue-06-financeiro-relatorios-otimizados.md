# Issue 06: Otimização com Filtros no Servidor e Agregações no Financeiro e Relatórios Gerenciais (DRE / Fluxo de Caixa)

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Reestruturar a consulta de dados nas páginas de Contas a Pagar (`AccountsPayable.tsx`), Contas a Receber (`AccountsReceivable.tsx`), Relatório de Fluxo de Caixa/DRE (`CashFlowReport.tsx`) e Lucratividade (`ProfitabilityReport.tsx`) para eliminar o download integral de coleções e utilizar agregações e resumos diários/mensais.

---

## 2. Escopo de Arquivos
* `src/pages/AccountsPayable.tsx`
* `src/pages/AccountsReceivable.tsx`
* `src/pages/CashFlowReport.tsx`
* `src/pages/ProfitabilityReport.tsx`

---

## 3. Tarefas de Implementação
1. **Otimização de `AccountsPayable.tsx` e `AccountsReceivable.tsx`:**
   - Aplicar filtro de `status` e janela de data (`due_date` entre início e fim do mês selecionado) diretamente na query do Firestore.
   - Limitar o retorno a lotes de 50 registros (`_limit: 50`) com paginação por cursor.
   - Calcular os cards de topo ("Total a Pagar", "Total Vencido", "Total Pago") via `api.aggregate` no servidor.

2. **Otimização de `CashFlowReport.tsx` e `ProfitabilityReport.tsx`:**
   - **Substituir** a leitura de coleções completas brutas (`sales`, `purchases`, `accountsPayable`, `accountsReceivable`) por:
     1. Consulta aos documentos diários consolidados (`daily_summaries`) do mês selecionado (apenas ~30 leituras por mês).
     2. Agregações no servidor (`api.aggregate`) caso algum dia específico precise de validação em tempo real.
   - Montar os gráficos de barras comparativos (Receitas vs. Despesas vs. Lucro) a partir dos resumos diários consolidados.

---

## 4. Critérios de Aceite
- A geração do Relatório de Fluxo de Caixa / DRE mensal consome no máximo 30 a 40 leituras, mesmo em empresas com mais de 10.000 lançamentos no mês.
- A tela de Contas a Pagar carrega em menos de 100ms e consome apenas o lote visível de 50 títulos + 1 leitura de totalização agregada.
