# 1. Integração Fiscal (NFe / NFCe)
*   **Page:** `Fiscal.tsx`, `CertificateManager.tsx`
*   **Component:** `fiscalApi.ts` (Serviço de API)
*   **Behavior:**
    *   **Provedor WebmaniaBR:** Implementar a lógica de comunicação com a API da WebmaniaBR em `fiscalApi.ts`, substituindo o erro atual de "Provedor fiscal não suportado".
    *   **Extração de Validade do Certificado:** Substituir a lógica mockada (data atual + 1 ano) pela extração real da data de validade diretamente do arquivo `.pfx` durante o upload.
    *   **Segurança da Senha do Certificado:** Remover o salvamento da senha em texto plano no Firestore. Implementar criptografia forte (ex: AES-256) antes de salvar no banco ou integrar com um serviço de gerenciamento de segredos (Secret Manager).
    *   **Cancelamento Real de Notas:** Remover o *fallback* que apenas altera o status no banco local quando não há token. Garantir que o cancelamento exija as credenciais corretas, comunique-se com a SEFAZ (via FocusNFe/WebmaniaBR) e processe o retorno oficial.
