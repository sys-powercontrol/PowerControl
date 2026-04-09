# Issue 28: Relatório de Giro e Reposição

## Descrição
Implementar uma nova página de relatório para auxiliar o gestor na decisão de compra, focando na velocidade de venda dos produtos.

## Requisitos
- Criar a página `src/pages/InventoryTurnoverReport.tsx`.
- Listar produtos com base na velocidade de venda (giro).
- Calcular e sugerir quantidade de compra baseada no `min_stock` e na média de vendas dos últimos 30, 60 e 90 dias.
- Implementar filtros por categoria de produto e fornecedor preferencial.
- Exibir indicadores visuais para produtos com estoque crítico (abaixo do mínimo).
- Adicionar gráfico de barras mostrando os "Top 10" produtos com maior giro.
