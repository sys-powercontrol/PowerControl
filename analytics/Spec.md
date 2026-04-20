# Especificação de Funcionalidades a Finalizar (Spec.md)

Com base na análise descrita em `analytics/error.md`, este documento especifica tecnicamente e estritamente **apenas o que falta ser terminado** no sistema.

---

## 1. Expansão do Fluxo de Suporte (Leitura e Réplica)
*   **Page:** `src/pages/Support.tsx`
*   **Component:** Card de Ticket (Listagem), Novo Modal de Detalhes do Chamado (`TicketDetailsModal`)
*   **Behavior:** 
    *   Transformar o selo "Resposta disponível" em uma ação clicável.
    *   Abrir um modal/interface onde o usuário consiga ler integralmente as `internal_notes` elaboradas pela equipe técnica.
    *   Implementar campo de chat/interação para o usuário enviar uma réplica, impedindo que o fluxo morra logo na listagem inicial.

## 2. Dinamismo da Base de Conhecimento (Fim do Mock Local)
*   **Page:** `src/pages/KnowledgeBase.tsx`
*   **Component:** Listagem de Artigos (`categories`), Roteador de Conteúdo (`ArticleViewer`)
*   **Behavior:** 
    *   Excluir os dados simulados e estáticos (`const categories`) diretamente injetados no código-fonte.
    *   Desenvolver o carregamento dessas informações por meio de uma coleção real do Firestore.
    *   Criar estado e renderização do artigo (possivelmente suportando Markdown) para que o usuário clique no treinamento listado e leia o seu conteúdo textual na interface correspondente.

## 3. Destravamento da Fila Fiscal WebmaniaBR
*   **Page:** `src/pages/Configurations.tsx`
*   **Component:** Aba `Integração Fiscal` (Select do campo `fiscal_provider`)
*   **Behavior:** 
    *   Remover a trava HTML `disabled` da `<option value="WebmaniaBR">` sinalizada no front-end como "(Em breve)".
    *   Garantir a total liberação na seleção pela interface para que os lojistas possuam autonomia em utilizar esse provedor perfeitamente integrado no backend (em `fiscalApi.ts`).

## 4. Cobertura Offline-First Transversal (Service Worker)
*   **Page:** `src/sw.ts`
*   **Component:** Escopo IndexedDB (`openDB`), Lógica de Sync Offline
*   **Behavior:** 
    *   Aproveitar o mecanismo resiliente estabelecido na *Issue 05* para transcender os limites atuais puramente voltados para transações de Balcão (Vendas/Sales).
    *   Registrar manipuladores (handlers/tags no SyncManager) e armazéns no IDB para as filas locais de: *Novos Cadastros de Clientes*, *Lançamentos de Contas a Pagar* e *Notas de Compra*, dotando o PDV off-grid não só com o terminal, mas com cadastros essenciais de ERP.

## 5. Algoritmo PIX Dinâmico no PDV
*   **Page:** `src/pages/Sales.tsx`, `src/pages/Configurations.tsx`
*   **Component:** Modal do PDV (`CheckoutModal`), Componente Emissor (`QRCodeManager`)
*   **Behavior:** 
    *   No estado vigente o lojista consegue armazenar a chave PIX, porém seu PDV não tira proveito real disso.
    *   Furar a dependência estática por meio de uma rotina ou biblioteca capaz de aglutinar a string PIX do Lojista + Soma do Checkout ("Valor do Carrinho") gerando fisicamente via tela o **QR Code (BR Code / Copia e Cola) validado**. Integrar esse display diretamente na etapa final do caixa.

## 6. Desacoplamento da Gestão de Webhooks
*   **Page:** `src/pages/Configurations.tsx`
*   **Component:** Aba `Notificações`
*   **Behavior:** 
    *   Substituir a invocação de `import.meta.env.VITE_SUPPORT_WEBHOOK_URL` existente nos serviços.
    *   Adicionar campo de URL Customizada gerida via banco, expondo ao administrador (Master e respectivos Tenants) um input para inserir livremente o seu ponto de acesso para Slack/Discord sem dependência rígida de *commits* ou ambiente global do projeto.
