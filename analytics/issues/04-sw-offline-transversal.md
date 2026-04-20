# 4. Cobertura Offline-First Transversal (Service Worker)
*   **Page:** `src/sw.ts`
*   **Component:** Escopo IndexedDB (`openDB`), Lógica de Sync Offline
*   **Behavior:** 
    *   Aproveitar o mecanismo resiliente estabelecido na *Issue 05* para transcender os limites atuais puramente voltados para transações de Balcão (Vendas/Sales).
    *   Registrar manipuladores (handlers/tags no SyncManager) e armazéns no IDB para as filas locais de: *Novos Cadastros de Clientes*, *Lançamentos de Contas a Pagar* e *Notas de Compra*, dotando o PDV off-grid não só com o terminal, mas com cadastros essenciais de ERP.
