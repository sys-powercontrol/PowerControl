# Issue 17: Dashboard do Vendedor

## Descrição
Implementar uma página de dashboard específica para vendedores, focada em metas e comissões.

## Critérios de Aceite
- [ ] **Página**: Criar `/src/pages/SellerDashboard.tsx`.
- [ ] **Acesso**: Restringir visão apenas aos dados do vendedor logado.
- [ ] **Comissões**: Cálculo e exibição de comissões acumuladas no mês atual.
- [ ] **Metas**: Comparativo visual entre vendas realizadas e meta mensal definida.
- [ ] **Gráficos**: Evolução das comissões e progresso da meta.

## Detalhes Técnicos
- **Coleção Firestore**: `sales`, `users` (para metas).
- **Componentes**: `CommissionChart` (Recharts), `GoalProgressBar`.
- **Segurança**: Aplicar filtros de query no Firestore para garantir que o vendedor veja apenas seus próprios dados.
