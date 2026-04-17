# Issue 01: Integração Fiscal (NFe / NFCe)

## Contexto
A área fiscal é crítica e requer atenção para operação em ambiente de produção real.

## Escopo
*   **Páginas:** `Fiscal.tsx`, `CertificateManager.tsx`
*   **Componentes:** `fiscalApi.ts` (Serviço), `CertificateManager.tsx` (Upload)
*   **Comportamentos:**
    *   **Provedor WebmaniaBR:** Implementar a lógica de emissão, consulta e cancelamento para o provedor WebmaniaBR em `fiscalApi.ts`.
    *   **Extração de Validade:** Implementar lógica para extrair a data de expiração real do arquivo `.pfx` durante o upload em `CertificateManager.tsx`.
    *   **Segurança de Senhas:** Implementar criptografia (ex: AES-256) para a senha do certificado antes de salvar no Firestore.
    *   **Mapeamento Dinâmico:** Substituir valores fixos no payload da FocusNFe por dados reais da empresa e do cliente.
