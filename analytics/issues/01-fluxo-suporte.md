# 1. Expansão do Fluxo de Suporte (Leitura e Réplica)
*   **Page:** `src/pages/Support.tsx`
*   **Component:** Card de Ticket (Listagem), Novo Modal de Detalhes do Chamado (`TicketDetailsModal`)
*   **Behavior:** 
    *   Transformar o selo "Resposta disponível" em uma ação clicável.
    *   Abrir um modal/interface onde o usuário consiga ler integralmente as `internal_notes` elaboradas pela equipe técnica.
    *   Implementar campo de chat/interação para o usuário enviar uma réplica, impedindo que o fluxo morra logo na listagem inicial.
