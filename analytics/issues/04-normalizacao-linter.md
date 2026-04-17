# Issue 04: Normalização do Linter de Front End

**Alvos (Arquivos/Configurações):**
*   `package.json` (scripts e devDependencies)
*   `eslint.config.js` (Novo arquivo a ser criado na raiz)

**Comportamento Esperado:**
*   A execução de `npm run lint` passa a verificar tanto o `tsc` (tipos) quanto as regras lint do ecossistema React.
*   Configurar ativamente a suite `@eslint` somada ao `eslint-plugin-react-hooks`.
*   O projeto deverá sinalizar imediatamente em modo de desenvolvimento se hooks nativos (`useEffect`, `useCallback`, `useMemo`) não cumprirem a regra formal do `exhaustive-deps`, forçando a adição explícita correta de dependências nas matrizes para estabilizar os componentes.
