# Relatório de Diagnóstico Estrutural e Arquitetural: Otimização Extrema de Leituras (Reads) no Firebase Firestore

**Data e Hora de Geração:** 21/08/2026 07:35:00 (Horário de Brasília - UTC-3)

---

## 1. Sumário Executivo & Objetivos
O objetivo deste relatório é diagnosticar todas as origens de consumo excessivo de leituras (*reads*) no Firebase Firestore dentro do ecossistema do sistema (Power Control ERP/PDV) e definir as medidas técnicas necessárias para **reduzir em até 90-95% o volume total de leituras diárias**, mantendo:
1. **Consistência e Integridade Transacional:** Nenhuma operação financeira ou de estoque pode ficar defasada ou inconsistente.
2. **Experiência do Usuário (UX):** Respostas instantâneas na interface, navegação ágil, suporte offline contínuo e sem telas travadas.
3. **Segurança e Isolamento Multi-tenant:** Conformidade rigorosa com as regras de isolamento por `company_id` e permissões de perfil (RBAC).

---

## 2. Diagnóstico Atual: Principais Gargalos de Consumo de Leituras (Reads)

### 2.1 Ausência de Janela Temporal e Paginação em Coleções Transacionais (Over-fetching Crítico)
* **Páginas Afetadas:** `src/pages/Dashboard.tsx`, `src/pages/SalesHistory.tsx`, `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/pages/AuditLogs.tsx`, `src/pages/CashFlowReport.tsx`, `src/pages/ProfitabilityReport.tsx`, `src/pages/InventoryTurnoverReport.tsx`, `src/pages/PurchaseHistory.tsx`.
* **Cenário Atual:**
  - Em `Dashboard.tsx`, as chamadas `api.get("sales")`, `api.get("products")`, `api.get("cashiers")`, `api.get("accountsPayable")`, `api.get("accountsReceivable")`, `api.get("purchases")` e `api.get("clients")` baixam **todas** as entidades da empresa desde o início dos tempos, para só depois filtrar por data em memória via JavaScript (`useMemo`).
  - Em uma empresa com 5.000 vendas e 2.000 títulos a pagar, cada acesso ao Dashboard consome **mais de 7.000 leituras de uma única vez**.
  - Em `SalesHistory.tsx`, `api.get("sales", { _orderBy: "sale_date", _orderDir: "desc" })` carrega a base completa de vendas, mesmo que o filtro visual padrão seja "Hoje" (`day`).
  - Em `AuditLogs.tsx`, `api.get("audit_logs", { _all: true })` busca o histórico ilimitado de auditoria de todo o sistema.

### 2.2 Dashboard Global (Admin Master) com Busca Irrestrita Multi-empresa
* **Página Afetada:** `src/pages/GlobalDashboard.tsx`.
* **Cenário Atual:**
  - O painel Master executa consultas com parâmetro `{ _all: true }` para `sales`, `products`, `users`, `accountsPayable`, `accountsReceivable` e `companies`.
  - Isso faz com que todo o banco de dados de todas as empresas cadastradas seja transferido para a memória do navegador, gerando picos massivos de dezenas/centenas de milhares de leituras a cada refresh.

### 2.3 Ausência de Agregações Nativas do Firestore (`count()`, `sum()`, `average()`)
* **Arquivos Afetados:** `src/lib/api.ts`, `src/pages/Dashboard.tsx`, `src/pages/GlobalDashboard.tsx`, `src/pages/CashFlowReport.tsx`, `src/pages/ProfitabilityReport.tsx`.
* **Cenário Atual:**
  - O sistema lê todos os documentos de vendas e contas para somar `total_price` ou contar registros (`sales.length`, `accounts.length`).
  - O Firestore possui APIs nativas de agregação no servidor (`getCountFromServer` e `getAggregateFromServer` com `sum` e `average`), as quais cobram apenas **1 leitura para cada 1.000 entradas de índice examinadas** (ou 1 leitura por requisição de agregação), em vez de 1 leitura por documento.

### 2.4 Inicialização Padrão do SDK sem Cache Persistente em IndexedDB Multi-aba
* **Arquivo Afetado:** `src/lib/firebase.ts`.
* **Cenário Atual:**
  - A inicialização do Firestore ocorre com `getFirestore(app, databaseId)` usando a memória volátil padrão do SDK.
  - Ao recarregar a página (F5) ou abrir uma nova aba, o SDK do Firebase não reutiliza o cache estruturado em disco (IndexedDB) nativo do Firestore, forçando uma nova rodada de leituras ao servidor.

### 2.5 Invalidação Agressiva de Cache no TanStack React Query sem Atualização Otimista
* **Arquivos Afetados:** `src/lib/queryClient.ts`, `src/lib/api.ts`, mutações em páginas de Vendas, PDV e Financeiro.
* **Cenário Atual:**
  - Após criar uma venda ou pagar uma conta, invoca-se `queryClient.invalidateQueries({ queryKey: ["sales"] })`, o que descarta o cache e reexecuta a query completa baixando novamente milhares de documentos.
  - A ausência de `queryClient.setQueryData` (atualização otimista/local imediata) desperdiça leituras para refletir 1 única linha alterada.

### 2.6 Ausência de Documentos Consolidadores de Resumo (Rollups Diários/Mensais)
* **Arquivos Relevantes:** `src/lib/inventory.ts`, `src/lib/finance.ts`, `src/pages/Sales.tsx`, `src/pages/Dashboard.tsx`.
* **Cenário Atual:**
  - Para exibir gráficos de tendência de 30 dias ou relatórios de DRE mensal, são lidos individualmente milhares de documentos de itens e vendas.
  - A manutenção de um único documento consolidado diário/mensal (`companies/{id}/analytics_daily/{YYYY-MM-DD}`) permitiria ler **apenas 30 documentos para montar o gráfico de um mês inteiro** (redução de 99%).

### 2.7 Dados Mestres Estáticos Baixados Repetidamente
* **Páginas Afetadas:** Categorias, Contas Bancárias, Configurações Fiscais, Cargos, Permissões.
* **Cenário Atual:**
  - Coleções que raramente sofrem alterações são consultadas com frequência ao navegar entre rotas, sem aproveitar tempos longos de `staleTime` (ex.: 1 hora a 24 horas) ou checagem por versão/timestamp de controle.

---

## 3. Diretrizes Técnicas para Redução Máxima de Leituras

### Diretriz 1: Ativação do Cache Persistente Nativo do Firestore (IndexedDB Multi-Tab)
* Substituir a inicialização padrão em `src/lib/firebase.ts` por `initializeFirestore` com `persistentLocalCache` e `persistentMultipleTabManager`.
* **Impacto:** Consultas idênticas e navegação entre telas aproveitam o cache local indexado sem consumir leituras do servidor Firestore.

### Diretriz 2: Implementação de Paginação por Cursor (`limit` + `startAfter`)
* Adicionar suporte no `api.ts` e nas páginas de listagem (`SalesHistory`, `AccountsPayable`, `AccountsReceivable`, `Products`, `Clients`, `Purchases`, `AuditLogs`) para paginação em lotes de 25 a 50 registros via `limit(50)` e ponteiro `startAfter(lastDocSnapshot)`.
* **Impacto:** O carregamento inicial de qualquer lista cai de N (milhares) para estritamente 25 ou 50 leituras.

### Diretriz 3: Filtro Temporal Obrigatório no Servidor Firestore (Server-side Date Range)
* No `api.ts` e em todos os relatórios/dashboards, aplicar os limites `where("sale_date", ">=", start)`, `where("sale_date", "<=", end)` diretamente na query do Firestore, evitando baixar documentos fora do intervalo selecionado.
* **Impacto:** Elimina 100% das leituras de dados históricos não solicitados na visualização corrente.

### Diretriz 4: Utilização de Server Aggregations (`count()`, `sum()`) para KPIs e Contadores
* Integrar `getCountFromServer` e `getAggregateFromServer` no `api.ts` (`api.count()`, `api.aggregate()`).
* Substituir os contadores de cards de Dashboard e Totais de DRE por agregações diretas no servidor.
* **Impacto:** Um cálculo de total de faturamento sobre 10.000 vendas consome **apenas 1 leitura** em vez de 10.000 leituras.

### Diretriz 5: Arquitetura de Rollup Documents (Resumos Diários e Mensais)
* Ao concluir vendas ou liquidar despesas via transação/batch, atualizar um documento agregado de data: `companies/{companyId}/daily_summaries/{YYYY-MM-DD}` contendo:
  - `total_sales_amount`, `sales_count`, `cost_amount`, `payment_methods_totals`, `cancelled_amount`.
* Os Dashboards e DRE passam a ler esses documentos de resumo diário/mensal (máximo 30 reads por mês).
* **Impacto:** Redução drástica nas telas mais acessadas do sistema.

### Diretriz 6: Estratégia de Cache por Níveis (Tiered Stale Times) no TanStack React Query
* **Nível 1 (Estático - 1 hora a 24 horas):** `categories`, `bankAccounts`, `taxSettings`, `companyProfile`, `permissions`.
* **Nível 2 (Cadastrais - 15 minutos):** `products`, `clients`, `suppliers`, `sellers`, `employees`.
* **Nível 3 (Transacionais Paginados - 2 a 5 minutos):** `sales` (janela ativa), `accountsPayable`, `accountsReceivable`, `cashiers`.
* **Nível 4 (Mutações):** Uso obrigatório de `queryClient.setQueryData` para aplicar inclusões/edições no cache local sem disparar `invalidateQueries` indiscriminado.

---

## 4. Comparativo de Consumo de Leituras (Antes vs. Depois)

| Módulo / Operação | Consumo Atual Estimado (Base: 5k vendas, 1k títulos) | Consumo Otimizado Previsto | Redução Percentual |
| :--- | :--- | :--- | :--- |
| **Abertura do Dashboard Principal** | ~7.500 leituras (todas as coleções) | ~30 a 50 leituras (Rollup + Aggregations) | **-99.3%** |
| **Acesso ao Histórico de Vendas (Hoje)** | ~5.000 leituras (todas as vendas) | 25 a 50 leituras (limit + date filter) | **-99.0%** |
| **Relatório DRE / Fluxo de Caixa Mensal** | ~6.000 leituras (vendas + compras + contas) | 30 a 60 leituras (daily summaries) | **-99.0%** |
| **Dashboard Global (Master)** | ~25.000+ leituras (todas as empresas) | ~50 a 100 leituras (Metadata + Aggregation) | **-99.6%** |
| **Troca de Abas / Navegação Interna** | ~2.000 a 5.000 leituras/minuto | 0 leituras (Cache TanStack + IndexedDB) | **-100%** |
| **Criação / Baixa de Registro** | Re-fetch completo da lista (~1.000 reads) | 1 write + 0 reads (Optimistic Update) | **-100% em reads** |

---

## 5. Conclusão da Análise
A implementação das técnicas mapeadas acima não exige refatorações no modelo de negócio ou nas regras de permissão, atuando exclusivamente nas camadas de transporte de dados (`api.ts`), inicialização do SDK Firebase (`firebase.ts`), parametrização de queries com filtros no servidor e estratégia de caching no cliente. A redução de leituras estimada ultrapassa **95%**, proporcionando custo operacional mínimo, escalabilidade ilimitada e velocidade de carregamento instantânea para o usuário final.
