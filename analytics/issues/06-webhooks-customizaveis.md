# 6. Desacoplamento da Gestão de Webhooks
*   **Page:** `src/pages/Configurations.tsx`
*   **Component:** Aba `Notificações`
*   **Behavior:** 
    *   Substituir a invocação de `import.meta.env.VITE_SUPPORT_WEBHOOK_URL` existente nos serviços.
    *   Adicionar campo de URL Customizada gerida via banco, expondo ao administrador (Master e respectivos Tenants) um input para inserir livremente o seu ponto de acesso para Slack/Discord sem dependência rígida de *commits* ou ambiente global do projeto.
