# Issue 03: Gerenciador de Certificado Digital (`CertificateManager.tsx`)

## Descrição
Implementar interface para upload e validação do certificado digital A1 da empresa.

## Requisitos
- Criar a página ou componente `src/pages/CertificateManager.tsx`.
- Campos: Arquivo (.pfx / .p12), Senha do Certificado.
- Comportamento:
    - Armazenar metadados (como data de expiração) no Firestore.
    - Armazenar o arquivo de forma segura (Firebase Storage ou Secret Manager).
