# Especificação de Implementações Pendentes (Spec)

Este documento detalha estritamente as funcionalidades que faltam ser implementadas ou finalizadas no sistema, com base no relatório de análise (`analytics/report.md`).

## 1. Integração Fiscal (NFe / NFCe)
*   **Page:** `Fiscal.tsx`, `CertificateManager.tsx`
*   **Component:** `fiscalApi.ts` (Serviço de API)
*   **Behavior:**
    *   **Provedor WebmaniaBR:** Implementar a lógica de comunicação com a API da WebmaniaBR em `fiscalApi.ts`, substituindo o erro atual de "Provedor fiscal não suportado".
    *   **Extração de Validade do Certificado:** Substituir a lógica mockada (data atual + 1 ano) pela extração real da data de validade diretamente do arquivo `.pfx` durante o upload.
    *   **Segurança da Senha do Certificado:** Remover o salvamento da senha em texto plano no Firestore. Implementar criptografia forte (ex: AES-256) antes de salvar no banco ou integrar com um serviço de gerenciamento de segredos (Secret Manager).
    *   **Cancelamento Real de Notas:** Remover o *fallback* que apenas altera o status no banco local quando não há token. Garantir que o cancelamento exija as credenciais corretas, comunique-se com a SEFAZ (via FocusNFe/WebmaniaBR) e processe o retorno oficial.

## 2. Sistema de Suporte e Atendimento
*   **Page:** `Support.tsx`
*   **Component:** Formulário de Contato (Contact Form)
*   **Behavior:**
    *   **Remoção do Mock:** Substituir o `setTimeout` que simula o envio da mensagem.
    *   **Integração de Backend:** Implementar a gravação do ticket de suporte no banco de dados (ex: criar uma coleção `support_tickets` no Firestore) e/ou acionar um serviço de envio de e-mails (como Firebase Extension de Email ou Cloud Function) para notificar a equipe de suporte.

## 3. Conciliação Bancária e Importação OFX
*   **Page:** `BankReconciliation.tsx`
*   **Component:** `OFXImporter.tsx`
*   **Behavior:**
    *   **Aprimoramento do Algoritmo de Correspondência:** Melhorar o algoritmo de similaridade de strings (Coeficiente de Dice). Adicionar pesos para correspondência de valor exato, proximidade de datas e implementar um sistema de regras/categorias para aumentar a precisão da conciliação automática e evitar falsos positivos.

## 4. Arquitetura e Armazenamento (Logo da Empresa)
*   **Page:** `Company.tsx`
*   **Component:** Input de Upload de Logomarca
*   **Behavior:**
    *   **Refatoração de Storage:** Alterar a lógica de salvamento da logomarca. Interromper o salvamento da imagem em formato Base64 diretamente no documento da empresa no Firestore. Implementar o upload do arquivo de imagem para o Firebase Storage e salvar apenas a URL de download (`logo_url`) no documento do Firestore.

## 5. Métodos de Pagamento
*   **Page:** `Configurations.tsx`
*   **Component:** Seção/Aba de Métodos de Pagamento
*   **Behavior:**
    *   **Implementação de Gateway:** Desenvolver a integração real com o gateway de pagamento WebmaniaBR (atualmente marcado como "Em breve" nas opções de `<select>`), permitindo a configuração de credenciais, webhooks e processamento de pagamentos.
