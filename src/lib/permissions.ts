export const ALL_PERMISSIONS = [
  { id: 'dashboard.view', name: 'Ver Dashboard', category: 'Geral' },
  { id: 'products.view', name: 'Ver Produtos', category: 'Estoque' },
  { id: 'products.manage', name: 'Gerenciar Produtos', category: 'Estoque' },
  { id: 'inventory.manage', name: 'Gerenciar Movimentações', category: 'Estoque' },
  { id: 'sales.view', name: 'Ver Vendas', category: 'Vendas' },
  { id: 'sales.create', name: 'Realizar Vendas', category: 'Vendas' },
  { id: 'sales.delete', name: 'Excluir Vendas', category: 'Vendas' },
  { id: 'finance.view', name: 'Ver Financeiro', category: 'Financeiro' },
  { id: 'finance.manage', name: 'Gerenciar Contas/Bancos', category: 'Financeiro' },
  { id: 'employees.manage', name: 'Gerenciar Funcionários', category: 'Equipe' },
  { id: 'sellers.manage', name: 'Gerenciar Vendedores', category: 'Equipe' },
  { id: 'reports.view', name: 'Ver Relatórios', category: 'Relatórios' },
  { id: 'settings.manage', name: 'Alterar Configurações', category: 'Sistema' },
  { id: 'fiscal.manage', name: 'Gerenciar Fiscal/NFe', category: 'Sistema' },
  { id: 'prices.edit', name: 'Editar Preços', category: 'Vendas' },
  { id: 'audit.view', name: 'Ver Logs de Auditoria', category: 'Sistema' },
] as const;

export type PermissionId = typeof ALL_PERMISSIONS[number]['id'];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionId[]> = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  user: [
    'dashboard.view',
    'products.view',
    'sales.view',
    'sales.create'
  ]
};
