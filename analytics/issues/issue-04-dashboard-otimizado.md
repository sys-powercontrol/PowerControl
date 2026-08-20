# Issue 04: Refatoração dos Dashboards Operacional e Global para Consumo de Rollups e Agregações de Servidor

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Eliminar a carga de coleções brutas completas (`sales`, `products`, `cashiers`, `accountsPayable`, `accountsReceivable`, `purchases`, `clients`) nas páginas `Dashboard.tsx` e `GlobalDashboard.tsx`, substituindo-as por consultas aos resumos diários (`daily_summaries`) e agregações pontuais de servidor.

---

## 2. Escopo de Arquivos
* `src/pages/Dashboard.tsx`
* `src/pages/GlobalDashboard.tsx`

---

## 3. Tarefas de Implementação
1. **Otimização de `src/pages/Dashboard.tsx`:**
   - **Remover** as queries pesadas irrestritas:
     - `api.get("sales")` -> Substituir por `api.getDailySummaries` no intervalo de datas selecionado (`30d`, `7d`, `today`, `month`).
     - `api.get("accountsPayable")` e `api.get("accountsReceivable")` -> Substituir por `api.aggregate` para totais vencidos e a vencer.
     - `api.get("products")` -> Substituir por agregação de produtos com baixo estoque (`api.count("products", { stock_alert: true })`).
     - `api.get("cashiers")` -> Consultar apenas caixas abertos no dia com limite (`_limit: 10`, `status: "Aberto"`).
   - **Alimentação dos Gráficos:**
     - Montar os gráficos de faturamento por dia (`AreaChart`), formas de pagamento (`PieChart`) e DRE sintetizada diretamente a partir do array de `daily_summaries` (máximo 30 itens).

2. **Otimização de `src/pages/GlobalDashboard.tsx` (Admin Master):**
   - **Remover** as queries com `{ _all: true }` em todas as coleções de negócio.
   - Carregar apenas a listagem de empresas ativas (`companies`).
   - Para os indicadores agregados do grupo, consultar os resumos consolidados ou utilizar consultas agregadas por empresa.
   - Implementar carregamento sob demanda ao selecionar uma empresa específica no seletor global.

---

## 4. Critérios de Aceite
- Ao abrir o Dashboard da empresa com período "Últimos 30 dias", o consumo de leituras passa de ~7.500 leituras para menos de 35 leituras.
- Ao abrir o Dashboard Global como Master, o consumo passa de dezenas de milhares de leituras para menos de 50 leituras.
- Todos os gráficos, KPIs, comparativos percentuais e valores exibidos continuam com 100% de exatidão matemática.
