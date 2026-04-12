# 2. Sistema de Suporte e Atendimento
*   **Page:** `Support.tsx`
*   **Component:** Formulário de Contato (Contact Form)
*   **Behavior:**
    *   **Remoção do Mock:** Substituir o `setTimeout` que simula o envio da mensagem.
    *   **Integração de Backend:** Implementar a gravação do ticket de suporte no banco de dados (ex: criar uma coleção `support_tickets` no Firestore) e/ou acionar um serviço de envio de e-mails (como Firebase Extension de Email ou Cloud Function) para notificar a equipe de suporte.
