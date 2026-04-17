# Issue 04: Auditoria e Logs

## Contexto
Melhorar a rastreabilidade de ações críticas no sistema.

## Escopo
*   **Páginas:** `AuditLogs.tsx`, `CertificateManager.tsx`, `Configurations.tsx`
*   **Componentes:** Chamadas de `api.log`
*   **Comportamentos:**
    *   **Logs de Segurança:** Adicionar chamadas de log para exclusão de certificados digitais e alterações críticas na matriz de permissões.
    *   **Diff de Alterações:** Garantir que o campo `changes` nos logs contenha o estado anterior e o novo estado para todas as configurações críticas.
