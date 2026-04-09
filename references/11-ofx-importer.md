# Issue 11: Componente de UI: Importador de OFX

## Descrição
Implementar um componente para importação de arquivos OFX (Open Financial Exchange) para conciliação bancária.

## Critérios de Aceite
- [ ] **Funcionalidade**: Modal para upload de arquivos .ofx.
- [ ] **Comportamento**: Parsear o XML do OFX e sugerir conciliação com lançamentos existentes em `accountsReceivable`/`accountsPayable`.
- [ ] **Importação**: Criar novos lançamentos financeiros a partir das transações do arquivo OFX.
- [ ] **Status**: Definir o status inicial como `PENDING`.

## Detalhes Técnicos
- **Componente**: `/src/components/Financial/OFXImporter.tsx`.
- **Biblioteca**: Utilizar uma biblioteca de parse de OFX (ex: `ofx-parser`, `ofx-js`).
- **Props**: `onImport`, `onClose`.
- **Validação**: Verificar se o arquivo é um OFX válido antes de processar a importação.
- **Integração**: Adicionar um botão de importação na página de bancos (`/src/pages/BankAccounts.tsx`).
