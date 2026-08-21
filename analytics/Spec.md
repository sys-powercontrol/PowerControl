# Especificação Técnica de Implementação: Redução Extrema de Leituras do Firestore

**Data e Hora de Geração:** 21/08/2026 07:35:00 (Horário de Brasília - UTC-3)

---

## 1. Escopo e Objetivos da Especificação
Esta especificação detalha **estritamente o que precisa ser implementado e modificado** (páginas, comportamentos e componentes) para atingir a redução de até 95% nas leituras do Firestore, conforme diagnosticado no documento `analytics/report.md`.

---

## 2. Especificação de Infraestrutura e Camada de Acesso a Dados (Core & Libs)

### 2.1 Módulo `src/lib/firebase.ts` - Cache Persistente Nativo
* **O que falta implementar:**
  - Substituir a chamada `getFirestore(app, databaseId)` por `initializeFirestore` com suporte a `persistentLocalCache` e `persistentMultipleTabManager`.
* **Comportamento Esperado:**
  - O Firestore armazena automaticamente os documentos lidos no IndexedDB do navegador e compartilha a sessão entre múltiplas abas abertas.
  - Consultas subsequentes comparam tokens de índice em vez de baixar o documento completo se não houve alteração no servidor.

### 2.2 Módulo `src/lib/api.ts` - Primitivas de Otimização e Agregação
* **O que falta implementar:**
  1. **Método `api.count(entityPath, params)`**:
     - Implementar execução de `getCountFromServer(query)` para retornar a contagem exata de documentos atendendo aos filtros, consumindo apenas 1 leitura no Firestore.
  2. **Método `api.aggregate(entityPath, aggregations, params)`**:
     - Implementar execução de `getAggregateFromServer(query, { total: sum(field), avg: average(field) })` para calcular totais monetários e médias no servidor.
  3. **Suporte a Paginação por Cursor (`limit` e `startAfter`) em `api.get`**:
     - Aceitar parâmetros `_limit` (ex.: 25 ou 50) e `_cursor` (Snapshot do último documento visível) na chamada de listagem, retornando `{ items: T[], nextCursor: DocumentSnapshot | null, hasMore: boolean }`.
  4. **Suporte a Janelas Temporais no Servidor (`_dateField`, `_startDate`, `_endDate`)**:
     - Injetar cláusulas `where(dateField, ">=", startDate)` e `where(dateField, "<=", endDate)` diretamente nas constraints da query do Firestore.
  5. **Métodos para Documentos de Rollup (`daily_summaries` / `monthly_summaries`)**:
     - Criar `api.getDailySummaries(companyId, startDate, endDate)` para ler diretamente os documentos de resumo consolidados da empresa.

### 2.3 Módulo `src/lib/queryClient.ts` - Política de Caching Estratificado (Tiered Caching)
* **O que falta implementar:**
  - Configurar presets de `staleTime` diferenciados por categoria de entidade:
    - **Tabelas Estáticas / Metadados** (`companies`, `categories`, `bankAccounts`, `taxSettings`, `permissions`): `staleTime: 1 hora` (3.600.000 ms), `gcTime: 24 horas`.
    - **Cadastros Principais** (`products`, `clients`, `suppliers`, `sellers`, `employees`): `staleTime: 15 minutos` (900.000 ms), `gcTime: 12 horas`.
    - **Transacionais Paginados** (`sales`, `accountsPayable`, `accountsReceivable`, `purchases`): `staleTime: 3 minutos` (180.000 ms), `gcTime: 2 horas`.
    - **Estatísticas e Relatórios** (`dashboard_metrics`, `cashflow_report`, `dre_report`): `staleTime: 30 minutos` (1.800.000 ms).

### 2.4 Módulos `src/lib/inventory.ts` e `src/lib/finance.ts` - Atualização Atômica de Rollups Diários
* **O que falta implementar:**
  - Nas funções de registro de vendas (`recordSale`), cancelamento de vendas, pagamento de contas a pagar/receber e compras:
    - Incluir no `writeBatch` ou `runTransaction` a atualização incremental (`increment()`) do documento de resumo diário `companies/{companyId}/daily_summaries/{YYYY-MM-DD}` com:
      - `total_sales`, `sales_count`, `total_cost`, `gross_profit`, `total_payments_cash`, `total_payments_pix`, `total_payments_card`, `total_expenses_paid`.

---

## 3. Especificação por Página / Módulo do Usuário

### 3.1 `src/pages/Dashboard.tsx` - Dashboard Operacional da Empresa
* **O que falta implementar:**
  - **Remover** as consultas de carga total de coleções (`api.get("sales")`, `api.get("accountsPayable")`, etc.).
  - **Adicionar** consulta aos documentos de rollup diário (`daily_summaries`) para o período selecionado (`30d`, `7d`, `today`, `month`), reduzindo de milhares de leituras para 1 a 30 leituras de resumo.
  - **Adicionar** consultas agregadas (`api.count` e `api.aggregate`) para status em tempo real (ex.: total a receber vencido, contas a pagar hoje).
  - **Adicionar** componente visual de "Última atualização" com botão manual de recarregar.

### 3.2 `src/pages/GlobalDashboard.tsx` - Dashboard do Administrador Master
* **O que falta implementar:**
  - **Remover** as consultas `{ _all: true }` em coleções transacionais brutas (`sales`, `accountsPayable`, `receivables`, `products`, `audit_logs`).
  - **Substituir** por leitura da coleção de metadados de empresas (`companies`) combinada com leitura dos resumos consolidados mensais das empresas cadastradas ou agregações no servidor.
  - Reduzir o carregamento global de dezenas de milhares de leituras para menos de 50 leituras pontuais.

### 3.3 `src/pages/SalesHistory.tsx` - Histórico de Vendas
* **O que falta implementar:**
  - **Filtro de Data no Servidor:** Ao selecionar "Hoje", "Semana", "Mês" ou "Personalizado", enviar os limites de data diretamente para a query do Firestore (`sale_date >= start && sale_date <= end`).
  - **Paginação por Cursor:** Configurar carregamento inicial com `_limit: 30`. Incluir botão/gatilho de "Carregar mais vendas" utilizando o último documento como cursor (`startAfter`).
  - **Contadores via Agregação:** Usar `api.count` e `api.aggregate` para exibir a quantidade total de vendas e faturamento do período sem baixar todos os itens.

### 3.4 `src/pages/AccountsPayable.tsx` e `src/pages/AccountsReceivable.tsx` - Módulos Financeiros
* **O que falta implementar:**
  - **Filtro por Status e Período no Servidor:** Consultar apenas os registros correspondentes à aba ativa ("Pendentes", "Pagos", "Vencidos") com filtro de janela de vencimento (`due_date`).
  - **Paginação em Lote:** Limitar listagens a 50 registros por página com cursor de navegação.
  - **Cards de Totais:** Calcular os somatórios de "Total Pendente", "Total Vencido" e "Total Pago" usando `api.aggregate` com `sum("amount")`.

### 3.5 `src/pages/AuditLogs.tsx` - Logs de Auditoria do Sistema
* **O que falta implementar:**
  - **Impor limite estrito no Servidor:** Aplicar `_limit: 50` e filtro padrão dos últimos 7 dias na consulta inicial.
  - **Paginação Sequencial:** Navegar pelos logs usando cursor `startAfter`.

### 3.6 `src/pages/CashFlowReport.tsx` e `src/pages/ProfitabilityReport.tsx` - Relatórios Gerenciais
* **O que falta implementar:**
  - **Leitura via Rollup:** Consumir os documentos agregados diários/mensais da empresa em vez de baixar todas as vendas, compras e despesas individuais da história da empresa.
  - **Fallback por Agregação:** Caso não existam dados consolidados legados, executar `api.aggregate` pontual com filtro de data estrito.

---

## 4. Especificação de Componentes Reutilizáveis

### 4.1 Componente `src/components/Common/CursorPagination.tsx`
* **O que implementar:**
  - Componente de paginação ou botão "Carregar mais..." com indicador de carregamento e estado `hasMore`.
  - Integrado de forma transparente ao TanStack `useInfiniteQuery` ou controle de estado com cursor.

### 4.2 Componente `src/components/Common/DataFreshnessBadge.tsx`
* **O que implementar:**
  - Badge visual discreto no cabeçalho dos Dashboards e Relatórios indicando "Dados atualizados há X min" com botão de recarga pontual (`queryClient.refetchQueries`).

---

## 5. Especificação de Comportamentos e Mutações Otimistas (Optimistic Updates)

### 5.1 Atualização de Cache em Mutações sem Re-fetch
* **O que implementar:**
  - Em todas as mutações (`useMutation`) de cadastro, alteração e exclusão:
    - Aplicar `queryClient.setQueryData` na lista em memória para refletir a alteração imediatamente.
    - Evitar a invalidação genérica de queries que forçaria novas leituras de coleções inteiras.
