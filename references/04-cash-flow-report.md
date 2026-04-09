# Issue 04: Relatório DRE Simplificado

## Descrição
Implementar um relatório de Demonstrativo de Resultados do Exercício (DRE) simplificado para visualização de lucro líquido.

## Critérios de Aceite
- [ ] Criar a página `/src/pages/CashFlowReport.tsx`.
- [ ] Permitir acesso para Admin e Master.
- [ ] Calcular e exibir: Receitas de Vendas (Total de Vendas no período), Custo de Produtos Vendidos (CPV - Total de Compras no período), Despesas Operacionais (Total de Contas Pagas no período).
- [ ] Exibir o Lucro Líquido (Receitas - CPV - Despesas).
- [ ] Implementar filtros por data (Mês Atual, Mês Anterior, Período Customizado).

## Detalhes Técnicos
- **Consultas**: `sales`, `purchases`, `accountsPayable`.
- **Performance**: Considerar o uso de agregações ou uma coleção de `daily_financial_stats` para evitar queries pesadas.
- **Gráficos**: Gráfico de barras comparativo (Receitas vs Despesas).
