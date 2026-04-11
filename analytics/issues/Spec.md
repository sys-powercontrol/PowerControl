# Especificação Técnica - Funcionalidades Pendentes (PowerControl ERP)

Este documento detalha as especificações técnicas para a implementação das funcionalidades listadas no relatório de pendências (`report/report.md`).

## 1. Integrações Financeiras e Pagamentos

### 1.1. Gateway de Pagamento Real (Mercado Pago/Stripe)
- **Comportamento**: Substituir o mock no `server.ts`. Ao selecionar PIX ou Cartão no PDV, o sistema deve gerar uma transação real via API.
- **Componente**: `PaymentGateway.tsx`
    - Deve exibir QR Code para PIX.
    - Deve fornecer campos de Cartão de Crédito com validação local e tokenização segura.
- **API (Backend)**:
    - `POST /api/payments/create`: Cria a preferência de pagamento.
    - `GET /api/payments/status/:id`: Consulta síncrona de status.

### 1.2. Webhooks de Pagamento
- **Endpoint**: `POST /api/webhooks/payments`
- **Comportamento**:
    - Validar assinatura da requisição.
    - Identificar `sale_id` no payload.
    - Atualizar status da venda no Firestore para "Pago".
    - Registrar entrada no fluxo de caixa (`movements`) automaticamente.

---

## 2. Módulo Fiscal e Tributário

### 2.1. Webhooks FocusNFe
- **Endpoint**: `POST /api/webhooks/fiscal`
- **Comportamento**:
    - Receber atualizações de status da SEFAZ (Autorizada, Rejeitada, Cancelada).
    - Atualizar documento na coleção `invoices`.
    - Se "Autorizada", disparar o download e armazenamento do XML no Firebase Storage.

### 2.2. Refinamento de Cálculos (`src/lib/fiscal.ts`)
- **Lógica**:
    - Implementar cálculo de **ICMS-ST** baseado em MVA e Alíquota Interna.
    - Implementar cálculo de **IPI** (Base de cálculo e alíquota).
    - Implementar **DIFAL** para vendas interestaduais a não contribuintes.
    - Adicionar suporte a **CSOSN** (Simples Nacional) e **CST** (Regime Normal).

---

## 3. Relatórios e BI

### 3.1. Integração Universal do `ExportButton`
- **Páginas a Modificar**:
    - `SalesHistory.tsx`, `PurchaseHistory.tsx`, `AccountsPayable.tsx`, `AccountsReceivable.tsx`, `InventoryHistory.tsx`.
- **Comportamento**: Adicionar o componente ao lado dos filtros, passando os dados filtrados da query atual para exportação em PDF/Excel.

### 3.2. Relatórios de Performance
- **Página**: `InventoryTurnoverReport.tsx` (Finalizar lógica de cálculo de giro).
- **Página**: `ProfitabilityReport.tsx` (Nova página):
    - Gráfico de lucro bruto vs líquido.
    - Ranking de lucratividade por produto e vendedor.

---

## 4. Segurança e Infraestrutura (RBAC)

### 4.1. Refatoração de `firestore.rules`
- **Comportamento**:
    - Remover todas as funções `isAdmin()`.
    - Implementar verificação baseada em permissões: `hasPermission('sales.view')`.
    - Garantir isolamento de `company_id` em todas as coleções.

### 4.2. Índices do Firestore (`firestore.indexes.json`)
- **Requisito**: Criar índices compostos para:
    - `sales`: `company_id` + `status` + `created_at`.
    - `movements`: `company_id` + `type` + `timestamp`.
    - `audit_logs`: `company_id` + `timestamp`.

---

## 5. Componentes de UI e UX

### 5.1. Busca Global (`GlobalSearch.tsx`)
- **Comportamento**: Atalho `Ctrl+K`.
- **Escopo**: Pesquisar simultaneamente em `products`, `clients` e `sales`.
- **UI**: Modal flutuante com resultados categorizados e navegação por teclado.

### 5.2. Centro de Notificações (`NotificationCenter.tsx`)
- **Comportamento**:
    - Alertas de estoque abaixo do mínimo.
    - Lembretes de contas a pagar/receber vencendo hoje.
    - Notificação de erro em processamento de NF-e.

### 5.3. Impressão de Etiquetas (`LabelPrinter.tsx`)
- **Comportamento**: Selecionar produtos e quantidade de etiquetas.
- **Saída**: Gerar PDF formatado para etiquetas (ex: 3x10 ou rolo térmico) com código de barras/EAN.

---

## 6. PWA e Offline

### 6.1. Background Sync (`sw.js`)
- **Comportamento**:
    - Utilizar a API de `SyncManager`.
    - Registrar tag `sync-sales` ao salvar venda offline.
    - O Service Worker deve tentar processar a fila do IndexedDB mesmo com a aplicação em background.

### 6.2. Manifesto PWA
- **Arquivo**: `public/manifest.json`
- **Requisito**: Definir `short_name`, `icons` (vários tamanhos), `theme_color` e `display: standalone`.
