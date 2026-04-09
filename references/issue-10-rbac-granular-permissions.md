# Issue 10: Controle de Acesso Granular (RBAC)

## Descrição
Refinar o sistema de permissões do usuário para um controle mais detalhado.

## Requisitos
- Lógica: Substituir verificações baseadas apenas em `role` (admin/user) por um sistema de permissões específicas (ex: `can_edit_prices`, `can_delete_sales`, `can_view_reports`).
- UI: Criar uma matriz de permissões na página de configurações para que o administrador possa definir o que cada papel de usuário pode acessar ou realizar.
