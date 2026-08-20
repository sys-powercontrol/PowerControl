# Issue 07: Componentes Reutilizáveis de Paginação, Indicador de Atualização e Mutações Otimistas (Optimistic Updates)

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Criar componentes de interface padronizados para navegação paginada por cursor e indicação de dados em cache, além de padronizar as mutações com `queryClient.setQueryData` para eliminar leituras decorrentes de invalidação global de queries.

---

## 2. Escopo de Arquivos
* `src/components/Common/CursorPagination.tsx` (Novo)
* `src/components/Common/DataFreshnessBadge.tsx` (Novo)
* `src/pages/Sales.tsx`
* `src/pages/Products.tsx`
* `src/pages/Clients.tsx`
* `src/pages/AccountsPayable.tsx`

---

## 3. Tarefas de Implementação
1. **Componente `CursorPagination.tsx`:**
   - Exibir botão "Carregar mais...", contagem de registros exibidos vs. total (via `api.count`), estado de carregamento e desativação quando `hasMore === false`.
   - Suporte a layout compacto para tabelas densas.

2. **Componente `DataFreshnessBadge.tsx`:**
   - Exibir no topo de Dashboards e Relatórios o tempo decorrido desde a última leitura ("Atualizado há X min").
   - Botão integrado de atualização manual que dispara `queryClient.refetchQueries` de forma controlada.

3. **Padronização de Mutações Otimistas (Optimistic Updates):**
   - Ao cadastrar, editar ou deletar itens em `Products`, `Clients`, `AccountsPayable`, `Sales`:
     - Utilizar `queryClient.setQueryData` para atualizar a lista local no cache TanStack imediatamente.
     - Remover chamadas globais de `queryClient.invalidateQueries` que forçavam o re-download completo de listas após cada mutação.

---

## 4. Critérios de Aceite
- Operações de CRUD (inclusão, alteração e exclusão) refletem instantaneamente na UI com 0 leituras adicionais no Firestore.
- Tabelas e listas exibem paginação clara e fluida com controle de cursor.
