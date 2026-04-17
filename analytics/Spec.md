# Especificação de Correções Técnicas (Spec.md)

Este documento mapeia **exclusivamente os itens que precisam ser corrigidos**, derivados do relatório de análise de erros (`analytics/error.md`). Cada item detalha os artefatos afetados (Páginas, Componentes ou Arquivos) e o comportamento esperado após a correção.

---

## 1. Refatoração de Tipagem e Remoção de `any`
**Alvos (Arquivos/Componentes):**
*   `GlobalSearch.tsx`, `OFXImporter.tsx`, `Layout.tsx`
*   `ProfitabilityReport.tsx`, `Sales.tsx`
*   `src/lib/api.ts`, `src/lib/inventory.ts`
*   `package.json` (dependência de tipos)

**Comportamento Esperado:**
*   Nenhum objeto, parâmetro de função ou retorno de API deve depender do tipo genérico `any` implícito ou explícito.
*   Devem ser criadas ou consumidas interfaces TypeScript estritas (ex: `ISale`, `IUser`, `ICompany`, `IOFXTransaction`).
*   Blocos `catch (error)` devem fazer *type narrowing* para instâncias de `Error` formal.
*   Garantir a instalação e linkagem correta de `@types/react` no ambiente de desenvolvimento para evitar avisos em base de hooks.

---

## 2. Prevenção do Vazamento Cross-Tenant (Gerenciamento do Estado de Load)
**Alvos (Arquivos/Páginas):**
*   `src/lib/api.ts` (linhas 117, 197 - barreira atual de erro)
*   Componentes provedores de Auth e páginas de visualização de dados (ex: Dashboards/Relatórios).

**Comportamento Esperado:**
*   O sistema deve atrasar as requisições atreladas à permissão do inquilino (tenant) até a estabilização da sessão na memória.
*   Em vez de acionar a cláusula de exceção `Blocked cross-tenant data leak` e quebrar a renderização, o fluxo deve escutar ativamente um "Loading State" (Spinner) transparente na UI durante o carregamento de restabelecimento do `onAuthStateChange` e injeção do `company_id`.
*   Requisições prematuras (race conditions) aos sub-nós do banco de dados enquanto o perfil está sendo hidratado não podem ser disparadas.

---

## 3. Segurança Contra Injeção XSS nas Impressões de Recibos
**Alvos (Arquivos/Utilitários):**
*   `src/lib/utils/print.ts`

**Comportamento Esperado:**
*   O utilitário de impressão não deve concatenar entradas dos usuários via *Template Strings* (como nomes de produtos: `${item.name}`) diretamente e puramente no HTML injetável do DOM.
*   Todas as chaves interpoladas dependentes de cadastros e inserções de texto livre devem passar por uma rotina de `escaping` (substituição de `<` por `&lt;`, de aspas e injeções de quebra de tags) ou validação via biblioteca de `sanitize` para evitar a contaminação local no navegador via injeção HTML/JS.

---

## 4. Normalização do Linter de Front End
**Alvos (Arquivos/Configurações):**
*   `package.json` (scripts e devDependencies)
*   `eslint.config.js` (Novo arquivo a ser criado na raiz)

**Comportamento Esperado:**
*   A execução de `npm run lint` passa a verificar tanto o `tsc` (tipos) quanto as regras lint do ecossistema React.
*   Configurar ativamente a suite `@eslint` somada ao `eslint-plugin-react-hooks`.
*   O projeto deverá sinalizar imediatamente em modo de desenvolvimento se hooks nativos (`useEffect`, `useCallback`, `useMemo`) não cumprirem a regra formal do `exhaustive-deps`, forçando a adição explícita correta de dependências nas matrizes para estabilizar os componentes.

---

## 5. Resiliência no Fallback Assíncrono do Service Worker (Offline)
**Alvos (Arquivos Worker):**
*   `src/sw.ts` (Contexto Sync)

**Comportamento Esperado:**
*   A rotina de sincronização não pode manter retornos ou quedas de `fetch` silenciosas e limitadas apenas a um rastro frágil de `console.error`.
*   A fila de requisições retidas ("Vendas Offline") tem que implementar tratamento de re-tentativas baseada em retornos formais, impedindo que requisições presas virem ciclos contínuos irrecuperáveis por pequenas falhas eventuais na formatação do pacote de rede.
*   A camada de log assíncrono final deve ser capaz de postar mensagens de volta (via `postMessage`) direto à UI (PDV) informando o esvaziamento correto ou não da fila paralela.
