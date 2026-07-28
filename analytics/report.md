# Relatório Geral de Funcionalidades Pendentes de Finalização

**Data e Hora de Geração:** 28/07/2026 13:28:15 (Horário de Brasília)

---

## Análise do Estado Atual do Sistema PowerControl

Após uma auditoria detalhada da estrutura da aplicação React/Vite/TypeScript, servidor Express (`server.ts`) e Firestore/Firebase, verificou-se que as funcionalidades principais de ERP/PDV (Autenticação, Multi-Tenant `company_id`, Vendas PDV, Controle de Caixa, Certificados, Ajustes de Estoque e Emissão Fiscal) estão devidamente estruturadas.

Este relatório compila **exclusivamente as finalizações e refinamentos pendentes** nos módulos existentes, garantindo que não haja adição de escopo ou novas funcionalidades não solicitadas.

---

## Módulos e Pendências de Finalização

### 1. Autenticação e Gestão de Perfil de Usuário (`Login.tsx`, `Profile.tsx`, `auth.tsx`)
- **Status Atual:** Fluxos de login por e-mail/senha, Google OAuth, "Esqueceu a senha" e atualização de foto/senha básica estão implementados.
- **O que falta finalizar:**
  - **Reautenticação para Alteração de Senha:** Tratar o erro `auth/requires-recent-login` no componente `Profile.tsx` solicitando a senha atual do usuário antes da redefinir a nova senha.
  - **MFA/2FA Opcional:** Adicionar a funcionalidade de ativação de Autenticação em Duas Etapas (MFA) para perfil com papel `master` e `admin` no painel de perfil.

### 2. Conciliação e Webhooks de Pagamento PIX e Cartão (`PaymentGateway.tsx`, `server.ts`)
- **Status Atual:** Integração com Mercado Pago PIX e cartão simulado configurados no `server.ts` e no frontend `PaymentGateway.tsx`.
- **O que falta finalizar:**
  - **Status de Expiração e Cancelamento:** Exibir feedback em tempo real no modal de pagamento no PDV quando a consulta de status retornar `EXPIRED` ou `CANCELLED`, permitindo reiniciar a cobrança sem travar o PDV.
  - **Webhook de Retorno Automático Mercado Pago:** Endpoint `/api/webhooks/mercadopago` no servidor para atualizar a venda/transação em background no Firestore assim que o evento `payment.updated` for recebido.

### 3. Emissão e Gestão Fiscal NFC-e/NF-e (`Fiscal.tsx`, `server.ts`, `NotificationCenter.tsx`)
- **Status Atual:** Emissão via WebmaniaBR/FocusNFe e recepção de webhooks no `server.ts` que salvam o XML no Storage.
- **O que falta finalizar:**
  - **Ação de Download/Visualização do XML Armazenado:** Exibir o botão para download/visualização do arquivo XML armazenado em `xml_storage_url` diretamente na tabela de notas fiscais em `Fiscal.tsx`.
  - **Invalidação de Cache e Atualização em Tempo Real:** Atualizar automaticamente a lista de notas em `Fiscal.tsx` via escuta de notificações ou re-fetch imediato ao mudar o status da nota por webhook.

### 4. Indicador de Rede e PWA Offline (`Layout.tsx`, `App.tsx`, `queryClient.ts`)
- **Status Atual:** Cache local persistente configurado via `@tanstack/react-query-persist-client` e `idb-keyval`.
- **O que falta finalizar:**
  - **Indicador do Status PWA no Layout:** Exibir no cabeçalho do `Layout.tsx` o badge indicando se o sistema está *On-line* ou *Off-line*, além do contador de vendas pendentes no IndexedDB aguardando sincronização com a nuvem.

### 5. Auditoria de Transferências de Estoque Inter-Filiais (`Transfers.tsx`, `InventoryHistory.tsx`)
- **Status Atual:** Transferência entre empresas (Matriz -> Filial) construída na aba de `InventoryAdjustments.tsx` com decremento na origem e incremento no destino em transação atômica no Firestore.
- **O que falta finalizar:**
  - **Filtro e Exibição de Transferências no Histórico de Estoque:** Exibir na página `InventoryHistory.tsx` e/ou `Transfers.tsx` as movimentações com motivos `TRANSFER_OUT` e `TRANSFER_IN`, apresentando o nome da filial de origem e destino para auditoria completa.

### 6. Padronização de Relatórios e Impressões (`PurchaseHistory.tsx`, `CashFlowReport.tsx`, `ExportButton.tsx`)
- **Status Atual:** Geração de Orçamentos A4 em PDF e Recibos 80mm integrados no PDV (`Sales.tsx`) e no Histórico de Vendas (`SalesHistory.tsx`).
- **O que falta finalizar:**
  - **Impressão de Comprovante no Histórico de Compras (`PurchaseHistory.tsx`):** Incluir o botão de impressão de recibo de compra para conferência de entrada de mercadorias com o fornecedor.
  - **Padronização do ExportButton em Relatórios:** Integrar o componente `ExportButton.tsx` nos relatórios de Giro de Estoque (`InventoryTurnoverReport.tsx`), DRE (`CashFlowReport.tsx`) e Lucratividade (`ProfitabilityReport.tsx`) para exportação em Excel/CSV.

---
**Conclusão:** A conclusão destes 6 itens garantirá a prontidão operacional e a integridade de todas as telas e fluxos existentes do PowerControl.
