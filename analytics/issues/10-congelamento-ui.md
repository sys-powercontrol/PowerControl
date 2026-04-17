# Issue 10: Congelamentos (UI Thread / Promise Locks)

**Página/Arquivo**: `src/pages/Sales.tsx`, `src/pages/PaymentGateway.tsx`
**Referências**: Promise pending (estado isPending travando a UI)
**Impacto Mapeado**: Alto (Trava do Sistema no momento de pagamento)

## Descrição do Problema
O gatilho principal de finalizar um processo de pagamento e disparar o fecho de carrinho aguarda retornos estritos em Promises. Se as rotinas de gateway recusam ou enviam `timeout`, o modal da maquina de cartão vira um spinner perpétuo e a Mutation nunca engatilha evento OnError nem retira o flag Loading.

## Solução e Comportamento Requerido (Spec)
Refatorar blocos de finalização, onde promessas (`fetch`, interações custom APIs) receberão *Fail-safes*: `Promise.race()` ou `setTimeout` blocks integrados à validação de falhas; e/ou acionar `onSettled` nas mutations do TanStack, certificando-se de remover a layer de loading irrestritamente independente da confirmação da venda bancária.
