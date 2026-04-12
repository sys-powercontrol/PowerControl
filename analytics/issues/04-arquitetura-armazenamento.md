# 4. Arquitetura e Armazenamento (Logo da Empresa)
*   **Page:** `Company.tsx`
*   **Component:** Input de Upload de Logomarca
*   **Behavior:**
    *   **Refatoração de Storage:** Alterar a lógica de salvamento da logomarca. Interromper o salvamento da imagem em formato Base64 diretamente no documento da empresa no Firestore. Implementar o upload do arquivo de imagem para o Firebase Storage e salvar apenas a URL de download (`logo_url`) no documento do Firestore.
