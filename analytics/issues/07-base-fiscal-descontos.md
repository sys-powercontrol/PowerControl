# Issue 07: Regra de Negócio (Descontos x Base Fiscal)

**Página/Arquivo**: `src/pages/Sales.tsx`
**Referências**: Finalização do Carrinho de Vendas.
**Impacto Mapeado**: Crítico-Legal (Tributações Incorretas, Prejuízo Contábil)

## Descrição do Problema
O componente `Sales.tsx` aceita descontos globais (variável `discount`) em uma operação inteira. No entanto, o cálculo da comissão aos vendedores e de encape de notas fiscais (`fiscal.calculateTaxes(item.price * item.quantity)`) só avalia o somatório Bruto antes de processar reduções tributárias baseadas nos descontos concedidos da nota.

## Solução e Comportamento Requerido (Spec)
- A lógica de checkout precisa de um passo intermediário distribuidor (rateio de desconto).
- Antes de invocar a rotina fiscal (`calculateTaxes`) sobre as linhas de produtos (`itemsWithTaxes`), deve ser calculado o desconto unitário ou pro-rata de modo que a multiplicação fiscal aconteça não no `price bruto`, mas sim utilizando a fração `(item.price * item.quantity) - desconto_proporcional`.
