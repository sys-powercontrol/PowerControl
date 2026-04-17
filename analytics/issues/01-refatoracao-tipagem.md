# Issue 01: Refatoração de Tipagem e Remoção de `any`

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
