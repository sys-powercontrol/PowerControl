# Issue 02: Prevenção do Vazamento Cross-Tenant (Gerenciamento do Estado de Load)

**Alvos (Arquivos/Páginas):**
*   `src/lib/api.ts` (linhas 117, 197 - barreira atual de erro)
*   Componentes provedores de Auth e páginas de visualização de dados (ex: Dashboards/Relatórios).

**Comportamento Esperado:**
*   O sistema deve atrasar as requisições atreladas à permissão do inquilino (tenant) até a estabilização da sessão na memória.
*   Em vez de acionar a cláusula de exceção `Blocked cross-tenant data leak` e quebrar a renderização, o fluxo deve escutar ativamente um "Loading State" (Spinner) transparente na UI durante o carregamento de restabelecimento do `onAuthStateChange` e injeção do `company_id`.
*   Requisições prematuras (race conditions) aos sub-nós do banco de dados enquanto o perfil está sendo hidratado não podem ser disparadas.
