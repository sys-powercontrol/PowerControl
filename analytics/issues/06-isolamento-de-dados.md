# Issue 06: Segurança e Isolamento Temporário de Dados (API)

**Página/Arquivo**: `src/lib/api.ts`
**Referências**: Funções `api.get` e `api.subscribe`
**Impacto Mapeado**: Alto (Vazamento Cross-tenant em falha de sessão)

## Descrição do Problema
Se na autenticação ou limpeza de cache o `user?.company_id` vier temporariamente quebrado (`undefined` ou vazio) e o usuário permanecer na interface principal como logado nas rules, o filtro `where("company_id", "==", currentCompanyId)` não será injetado na construção da Query do Firebase. Sendo assim, um usuário padrão veria relatórios de **todas** as empresas.

## Solução e Comportamento Requerido (Spec)
Refatorar a verificação de segurança no topo de `api.get` e `api.subscribe`.
Se o contexto solicitar isolamento (`!isSystemAdminStatus` e `!isCompanyEntity`) e `currentCompanyId` for falso: 
- O fluxo DEVE ser impedido de acionar o Firebase (`throw new Error()`) ou retornar coleções vazias. Não executar Queries sem os limites locatários definidos, a não ser que a Entidade (ex: collections isolada) afirme isenção expressa.
