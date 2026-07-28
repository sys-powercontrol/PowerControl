# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração:** 28/07/2026 13:28:15 (Horário de Brasília)

---

## Escopo
Este documento detalha as especificações técnicas de páginas (`page`), comportamentos (`behavior`) e componentes (`component`) estritamente necessários para finalizar as pendências mapeadas no relatório de análise do sistema PowerControl (`/analytics/report.md`).

---

## Épicos e Especificações

### Épico 1: Reautenticação e Segurança de Perfil (`Auth & Profile`)
- **Páginas Afetadas:** `/MeuPerfil` (`src/pages/Profile.tsx`)
- **Componentes:** `ModalReauth`, `ProfileForm`
- **Comportamentos (`behavior`):**
  - Ao submeter a alteração de senha no `Profile.tsx`, caso o Firebase Auth retorne o erro `auth/requires-recent-login`, exibir o modal de reautenticação em tempo real para solicitar a senha atual do usuário.
  - Após confirmar a senha atual via `reauthenticateWithCredential`, prosseguir automaticamente com a atualização da nova senha via `updatePassword`.
  - Exibir opção de ativação de 2FA (MFA) para perfis com permissão `master` ou `admin`.

### Épico 2: Tratamento de Status e Webhook de Pagamentos (`PaymentGateway`)
- **Páginas e Servidor:** `src/components/Sales/PaymentGateway.tsx`, `/server.ts`
- **Componentes:** `PaymentGatewayModal`, `PixQrCodeViewer`
- **Comportamentos (`behavior`):**
  - No componente `PaymentGateway.tsx`, tratar as respostas `EXPIRED` e `CANCELLED` da API `/api/payments/status/:id` interrompendo o polling, exibindo alerta sonoro/visual e habilitando botão "Gerar Novo QR Code".
  - No `server.ts`, implementar o endpoint `/api/webhooks/mercadopago` escutando eventos de pagamento e atualizando o status do pagamento no documento da venda/caixa do Firestore.

### Épico 3: Gestão e Download de XML Fiscal (`Fiscal & Storage`)
- **Páginas e Servidor:** `/Fiscal` (`src/pages/Fiscal.tsx`), `src/components/NotificationCenter.tsx`
- **Componentes:** `InvoiceTable`, `XmlDownloadButton`
- **Comportamentos (`behavior`):**
  - Em `Fiscal.tsx`, adicionar coluna/botão na tabela de notas autorizadas para permitir o download direto do arquivo XML armazenado em `xml_storage_url` no Google Cloud Storage / Firebase Storage.
  - Ao receber uma notificação de nota autorizada no `NotificationCenter.tsx` ou via webhook, disparar `queryClient.invalidateQueries({ queryKey: ["invoices"] })` para atualizar a tabela em tempo real sem necessidade de F5.

### Épico 4: Indicador de Conectividade PWA e Fila Offline (`Layout & PWA`)
- **Páginas:** Layout Principal (`src/components/Layout.tsx`)
- **Componentes:** `ConnectivityBadge`, `SyncQueueCounter`
- **Comportamentos (`behavior`):**
  - No cabeçalho do `Layout.tsx`, exibir um badge dinâmico indicando o estado atual de conectividade (`On-line` verde / `Off-line` laranja).
  - Quando em modo off-line, consultar o banco IndexedDB (`idb-keyval`) e apresentar o número de vendas registradas localmente aguardando sincronização com a nuvem.

### Épico 5: Histórico e Auditoria de Transferências Inter-Filiais (`Inventory & History`)
- **Páginas:** `/HistoricoEstoque` (`src/pages/InventoryHistory.tsx`), `/Transferencias` (`src/pages/Transfers.tsx`)
- **Componentes:** `InventoryMovementTable`, `TransferAuditFilter`
- **Comportamentos (`behavior`):**
  - Em `InventoryHistory.tsx`, incluir opção de filtro por tipo de movimentação (`TRANSFER_OUT` / `TRANSFER_IN`).
  - Exibir nas linhas da tabela as informações de filial de origem e destino contidas no campo `observation` ou metadados do movimento, permitindo rastreabilidade completa das transferências efetuadas entre empresas.

### Épico 6: Padronização de Relatórios e Impressão de Compras (`Reports & Printing`)
- **Páginas:** `/HistoricoCompras` (`src/pages/PurchaseHistory.tsx`), `/RelatorioGiro` (`src/pages/InventoryTurnoverReport.tsx`), `/RelatorioDRE` (`src/pages/CashFlowReport.tsx`), `/RelatorioLucratividade` (`src/pages/ProfitabilityReport.tsx`)
- **Componentes:** `ExportButton`, `PurchaseReceiptModal`
- **Comportamentos (`behavior`):**
  - Em `PurchaseHistory.tsx`, integrar o método `printPurchaseReceipt` permitindo imprimir o comprovante/A4 de compras com o fornecedor.
  - Adicionar o componente reutilizável `ExportButton.tsx` nos relatórios de Giro de Estoque, DRE e Lucratividade para download das tabelas nos formatos Excel (.xlsx) e CSV.

---
**Resultado Esperado:** Cobertura de 100% das pendências mapeadas sem alteração de escopo do projeto PowerControl.
