# Issue 05: Resiliência no Fallback Assíncrono do Service Worker (Offline)

**Alvos (Arquivos Worker):**
*   `src/sw.ts` (Contexto Sync)

**Comportamento Esperado:**
*   A rotina de sincronização não pode manter retornos ou quedas de `fetch` silenciosas e limitadas apenas a um rastro frágil de `console.error`.
*   A fila de requisições retidas ("Vendas Offline") tem que implementar tratamento de re-tentativas baseada em retornos formais, impedindo que requisições presas virem ciclos contínuos irrecuperáveis por pequenas falhas eventuais na formatação do pacote de rede.
*   A camada de log assíncrono final deve ser capaz de postar mensagens de volta (via `postMessage`) direto à UI (PDV) informando o esvaziamento correto ou não da fila paralela.
