# Plano de Implementação: Relatórios de BI e Performance (Issue 06)

Este documento detalha o plano para implementar e finalizar os relatórios de Giro de Estoque e Lucratividade.

## 1. Objetivos
- Finalizar o relatório de Giro de Estoque com métricas mais precisas.
- Criar um novo dashboard de Lucratividade para análise financeira detalhada.

## 2. Fontes de Dados e Métricas

### Giro de Estoque (`InventoryTurnoverReport.tsx`)
- **Dados**: `products`, `inventory_movements` (vendas).
- **Métricas**:
  - **Vendas no Período**: Soma das saídas por venda.
  - **Média Diária**: Vendas / Dias no período.
  - **Dias de Estoque**: Estoque Atual / Média Diária.
  - **Sugestão de Compra**: (Média Diária * Dias de Segurança) - Estoque Atual.
  - **Taxa de Giro**: Vendas no Período / Estoque Médio (ou Estoque Atual como simplificação).

### Lucratividade (`ProfitabilityReport.tsx`)
- **Dados**: `sales`, `products`, `services`, `accountsPayable`.
- **Métricas**:
  - **Receita Bruta**: Soma do total das vendas.
  - **CMV (Custo de Mercadoria Vendida)**: Soma de (quantidade * preço_custo) dos itens vendidos.
  - **Lucro Bruto**: Receita Bruta - CMV.
  - **Margem Bruta**: (Lucro Bruto / Receita Bruta) * 100.
  - **Despesas Operacionais**: Soma de `accountsPayable` pagos no período.
  - **Lucro Líquido**: Lucro Bruto - Despesas Operacionais.
  - **Margem Líquida**: (Lucro Líquido / Receita Bruta) * 100.

## 3. Etapas de Implementação

### Fase 1: Refinamento do Giro de Estoque
1. **Melhorar Cálculo de Giro**: Adicionar a métrica de "Taxa de Giro" anualizada ou mensal.
2. **Gráficos Adicionais**:
   - Giro por Categoria (Gráfico de Barras).
   - Histórico de Vendas vs Estoque (Gráfico de Linha para produtos selecionados).

### Fase 2: Criação do Relatório de Lucratividade
1. **Estrutura Base**: Criar `src/pages/ProfitabilityReport.tsx` seguindo o padrão de design do ERP.
2. **Cards de Resumo**:
   - Receita Total.
   - Lucro Bruto.
   - Lucro Líquido.
   - Margem Média.
3. **Visualizações (Recharts)**:
   - **Evolução Financeira**: Receita vs Lucro vs Despesas (Gráfico de Área).
   - **Mix de Lucratividade**: Lucro por Categoria (Gráfico de Pizza ou Treemap).
   - **Ranking de Produtos**: Top 10 produtos com maior margem de contribuição.
4. **Tabela de Detalhamento**: Lista de produtos com Preço, Custo, Lucro Unitário e Margem %.

## 4. Design e UX
- Utilizar `recharts` para todos os gráficos.
- Manter o padrão de "Cards" arredondados e sombras suaves.
- Implementar filtros de data (Hoje, 7 dias, 30 dias, Personalizado).
- Adicionar botões de exportação (PDF/Excel) usando o `ExportButton`.

## 5. Considerações Técnicas
- **Performance**: Cálculos de BI podem ser pesados no cliente. Usar `useMemo` extensivamente.
- **Permissões**: Garantir que apenas usuários com `reports.view` ou `finance.view` acessem.
- **Consistência**: Validar se os preços de custo estão sendo capturados corretamente no momento da venda para evitar distorções históricas.

## 6. Próximos Passos
1. Atualizar `InventoryTurnoverReport.tsx`.
2. Criar `ProfitabilityReport.tsx`.
3. Adicionar rota para o novo relatório em `App.tsx`.
4. Adicionar link no menu lateral.
