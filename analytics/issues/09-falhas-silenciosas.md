# Issue 09: UX - Falhas Silenciosas em Funções Críticas

**Página/Arquivo**: `src/pages/Company.tsx`, `src/lib/fiscalApi.ts`, `src/lib/firebase.ts`
**Referências**: Falta total de callbacks / `catch`.
**Impacto Mapeado**: Alto (Gatilho de atrito severo com o cliente suportado)

## Descrição do Problema
O sistema carece de Error Boundaries robustos em chamadas isoladas de Background. Na tela da "Empresa", fazer o mutate assíncrono para subir (upload) a logo com peso ou formato inválido faz com que a Firebase lance erro de limite restrito, e a interface continua sem nenhum `toast` de rechaço. Mesmo em integrações fiscais, quando o serviço de terceiros se apaga e devolve CORS Error ou Gateway Error, a página trava.

## Solução e Comportamento Requerido (Spec)
Localizar try/catch desguarnecidos e anexar:
1. `firebase.ts` deve envelopar erros de transações cruas retornando exceções com nomes e mensagens úteis ao final.
2. Na aba de `CompanyConfig`, envolver o componente com Notificadores em caso de insucesso nas configurações do perfil da empresa e no Storage.
3. No hook de Pagamentos e Integrações, invocar sempre o `sonner` com `.error()`.
