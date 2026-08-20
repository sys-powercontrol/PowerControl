# Plano Estratégico de Execução e Pesquisa Técnica: Otimização de Leituras no Firestore

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Visão Geral do Plano
Este documento estabelece o **plano detalhado de pesquisa técnica, sequenciamento, arquitetura e validação** para a execução das 7 issues de otimização de leituras (*reads*) do Firebase Firestore, garantindo 0 regressões em funcionalidades, 100% de consistência contábil/fiscal e até **95% de economia nas operações de leitura**.

---

## 2. Matriz de Dependências e Ordem Sequencial de Execução

```
[Fase 1: Infraestrutura & Core]
Issue 01 (Cache Nativo & Tiered Caching)
    │
    ▼
Issue 02 (Agregações de Servidor & Paginação no api.ts)
    │
    ▼
[Fase 2: Arquitetura de Dados & Consistência]
Issue 03 (Rollups Diários & Incrementos Atômicos)
    │
    ▼
[Fase 3: Componentes & Mutações Otimistas]
Issue 07 (Componentes de Paginação, Badges & Optimistic Updates)
    │
    ▼
[Fase 4: Refatoração de Módulos Críticos]
Issue 04 (Dashboards Operacional & Global)
    │
    ▼
Issue 05 (Histórico de Vendas & Auditoria)
    │
    ▼
Issue 06 (Financeiro & Relatórios DRE/Fluxo de Caixa)
```

---

## 3. Detalhamento por Fase de Execução

### Fase 1: Fundação de Infraestrutura e Camada de Acesso (Issues 01 e 02)
* **Objetivo:** Estabelecer o cache em disco no cliente e as primitivas de agregação/paginação na API.
* **Ações de Pesquisa e Validação:**
  1. Validar a compatibilidade de `initializeFirestore` com `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` em navegadores modernos e modo iframe.
  2. Testar o comportamento das funções `getCountFromServer` e `getAggregateFromServer` contra as regras de segurança `firestore.rules` vigentes para certificar que queries agregadas passam sem bloqueios.
  3. Estruturar a assinatura de `api.getPage` com cursor resiliente (`DocumentSnapshot`).

### Fase 2: Mecanismo de Rollup e Acúmulos Atômicos (Issue 03)
* **Objetivo:** Criar e atualizar documentos de resumo por empresa/dia em operações de escrita.
* **Ações de Pesquisa e Validação:**
  1. Garantir que as operações de escrita em `Sales.tsx`, `inventory.ts` e `finance.ts` utilizem `setDoc(summaryRef, { ... }, { merge: true })` com `increment()` dentro da mesma transação atômica (`runTransaction` ou `writeBatch`) da venda ou pagamento.
  2. Prever script de backfill/fallback caso um dia não possua documento de resumo gerado previamente (calculando sob demanda via agregação e salvando o rollup).

### Fase 3: Componentes Reutilizáveis e Mutações Otimistas (Issue 07)
* **Objetivo:** Criar os blocos visuais de interface e eliminar invalidações globais de queries.
* **Ações de Pesquisa e Validação:**
  1. Implementar `CursorPagination.tsx` com acessibilidade, estados de carregamento e compatibilidade com React Query.
  2. Implementar `DataFreshnessBadge.tsx` com contador regressivo/progressivo de minutos e ação de recarga manual.
  3. Mapear todas as chamadas de `queryClient.invalidateQueries` no código e substituí-las por `queryClient.setQueryData`.

### Fase 4: Refatoração das Telas de Maior Consumo (Issues 04, 05 e 06)
* **Objetivo:** Desacoplar as páginas visuais do modelo de download total de coleções.
* **Ações de Pesquisa e Validação:**
  1. **Dashboard Operacional (`Dashboard.tsx`):** Trocar 7 consultas irrestritas por leitura de `daily_summaries` (30 docs) + `api.aggregate` pontuais.
  2. **Dashboard Global (`GlobalDashboard.tsx`):** Desativar `{ _all: true }` e consultar metadados de empresas ativas com resumos consolidados.
  3. **Histórico de Vendas (`SalesHistory.tsx`):** Aplicar filtro temporal estrito de data e lote inicial de 30 registros com cursor.
  4. **Logs de Auditoria (`AuditLogs.tsx`):** Limitar consulta inicial aos últimos 7 dias com limite de 50 registros por página.
  5. **Financeiro e Relatórios (`AccountsPayable.tsx`, `CashFlowReport.tsx`, `ProfitabilityReport.tsx`):** Aplicar filtros de status/vencimento e alimentar relatórios contábeis com base nos documentos de consolidação diária.

---

## 4. Análise de Riscos e Estratégias de Mitigação

| Risco Identificado | Nível de Impacto | Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Divergência entre Rollup e Vendas Individuais (se houver erro de rede)** | Médio | Atualizações de rollup sempre no mesmo bloco atômico da venda (`runTransaction` / `writeBatch`). |
| **Ausência de Rollup para Períodos Históricos Anteriores** | Baixo | Fallback automático para `api.aggregate` no servidor quando o documento de rollup do dia não existir. |
| **Índice Composto Ausente no Firestore para Novas Queries Paginadas** | Médio | Criar antecipadamente as definições de índice em `firestore.indexes.json` para pares como `company_id + sale_date`, `company_id + status + due_date`. |
| **Bloqueio de Regras de Segurança em Agregações** | Alto | Validar e auditar `firestore.rules` garantindo que as regras `allow read` cubram perfeitamente as consultas agregadas nas subcoleções e coleções raiz. |

---

## 5. Checklist de Verificação e Homologação Pós-Implementação

- [ ] **Métricas de Leitura (Network & DevTools):** Monitorar requisições Firestore para verificar queda de ~95% no volume de documentos baixados na carga do Dashboard.
- [ ] **Modo Offline & Navegação entre Abas:** Abrir múltiplas abas e certificar que o cache IndexedDB compartilhado responde sem conflitos.
- [ ] **Exatidão dos Relatórios:** Comparar valores totais de faturamento, lucro bruto e contas a pagar do modelo otimizado com a base legada para atestar paridade de 100%.
- [ ] **UX de Paginação:** Navegar por páginas subsequentes no Histórico de Vendas e Contas a Pagar sem travamentos ou duplicação de itens.
- [ ] **Mutações Otimistas:** Cadastrar um novo produto ou liquidar uma conta e confirmar atualização imediata na tela sem disparar re-fetch de coleção inteira.
- [ ] **Compilação e Tipagem:** Garantir `compile_applet` e `lint_applet` sem erros ou warnings.
