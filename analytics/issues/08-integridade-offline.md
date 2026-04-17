# Issue 08: Integridade em Offline Store Engine

**Página/Arquivo**: `src/lib/offlineStore.ts`, `src/lib/inventory.ts`
**Referências**: Storage Array IndexDB e Sync do Worker (ServiceWorker/Sincronizador `syncSales`)
**Impacto Mapeado**: Crítico (Potencial lançamento incorreto / Atribuição Fantasma)

## Descrição do Problema
O fechamento da operação que joga dados pra fila offline assíncrona só armazena o que será vendido. Posteriormente, no gatilho online que descarrega essas pendências chamando `inventory.processSale(saleData, ...)`, está-se puxando o contexto de autenticação global e local daquele segundo temporal. Se a guia logar com outro operador e voltar a internet, a venda pendente é chumbada para esse novo caixa/usuario, e não para o caixa original que faturou no modo avião.

## Solução e Comportamento Requerido (Spec)
- Passar o context do operator (`user`) integral (`company_id`, e `employee_id_cache`) de dentro de `sale.userContext` para o parâmetro `processSale(saleData, sale.items, sale.userContext)`.
- Adicionar no processamento a imposição severa em `inventory.ts`: Não recriar contexto a força, e sim validar que, em chamadas onde o context é fornecido, ele se torna a única fonte de verdade da venda (ignorando o auth atual da sessão da janela principal).
