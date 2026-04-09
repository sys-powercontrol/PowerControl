# Issue 02: Dashboard Consolidado para Admin Master

## Descrição
Implementar um dashboard global que agregue métricas de faturamento e performance de todas as empresas cadastradas no sistema.

## Critérios de Aceite
- [ ] Criar a página `/src/pages/GlobalDashboard.tsx`.
- [ ] Restringir acesso apenas para usuários com `role === 'master'`.
- [ ] Exibir métricas agregadas: Total de empresas ativas, Faturamento total do mês, Ranking de empresas por volume de vendas.
- [ ] Gráfico de faturamento mensal consolidado (todas as empresas).
- [ ] Gráfico de pizza com a distribuição de vendas por empresa.

## Detalhes Técnicos
- **Consultas**: O Admin Master deve realizar queries sem o filtro de `company_id` (habilitado no `api.ts`).
- **Performance**: Considerar o uso de agregações ou uma coleção de `daily_stats` globais para evitar queries pesadas em todas as vendas.
- **Gráficos**: Utilizar `recharts`.
