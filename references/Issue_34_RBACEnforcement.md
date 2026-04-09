# Issue 34: Enforcement de Permissões Granulares (RBAC)

## Descrição
Garantir que a matriz de permissões definida seja respeitada em todo o sistema, bloqueando ações e visualizações não autorizadas.

## Requisitos
- Percorrer todas as rotas e componentes de ação do sistema.
- Substituir verificações genéricas de `isAdmin` pela função `hasPermission(permissionId)` do `useAuth`.
- Implementar "UI Blocking": desabilitar ou esconder botões de excluir, editar preços ou acessar configurações se o usuário não tiver a permissão específica.
- Garantir que usuários sem permissão `dashboard.view` sejam redirecionados para uma página permitida após o login.
