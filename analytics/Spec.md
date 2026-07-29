# Especificação Técnica de Finalizações (Spec)

**Data e Hora de Geração:** 28/07/2026 18:05:00 (Horário de Brasília)

---

## 1. Escopo de Implementação Técnica
Este documento especifica os comportamentos (`behavior`), páginas (`page`) e componentes (`component`) necessários para a finalização dos módulos existentes mapeados no relatório de análise `/analytics/report.md`. Nenhuma funcionalidade nova de negócio deve ser introduzida além do detalhado abaixo.

---

## 2. Detalhamento de Especificações por Épico

### Épico 1: Autenticação de Dois Fatores (MFA/2FA) para Administradores
*   **Páginas Afetadas:** `/MeuPerfil` (`src/pages/Profile.tsx`)
*   **Componentes:**
    *   `MfaSetupToggle` (Componente de Toggle Switch para ativar/desativar MFA).
    *   `MfaModal` (Modal para configuração e verificação inicial do segundo fator, apresentando código QR ou chave secreta de backup).
*   **Comportamentos (`behavior`):**
    *   Ao habilitar o switch em `src/pages/Profile.tsx`, se o usuário possui cargo `master` ou `admin`, abrir o `MfaModal` com instruções para ler o QR Code com aplicativo autenticador (Google Authenticator, Microsoft Authenticator, etc.).
    *   Após o usuário digitar o código temporário correto, salvar no cadastro do usuário no Firestore (`users/{uid}`) o atributo `mfa_enabled: true` e a data de ativação.
    *   Se desativado, solicitar confirmação da senha e atualizar o Firestore para `mfa_enabled: false`.

### Épico 2: Tratamento de Status e Regeneração de Código PIX no PDV
*   **Páginas Afetadas:** Painel de Vendas PDV (`src/components/Sales/PaymentGateway.tsx`), Backend (`server.ts`)
*   **Componentes:**
    *   `PixFeedback` (Mensagens visuais dinâmicas com base no status do pagamento).
    *   `RetryPaymentButton` (Botão para reiniciar tentativa de geração de Pix sem fechar o modal).
*   **Comportamentos (`behavior`):**
    *   No polling em `PaymentGateway.tsx`, caso o status retornado seja `EXPIRED` ou `CANCELLED`:
        *   Parar o temporizador de verificação.
        *   Exibir erro visual amigável informando que o tempo limite expirou ou o pagamento foi cancelado pelo cliente.
        *   Ativar o botão "Gerar Novo QR Code", permitindo que o operador solicite uma nova requisição para `/api/payments/create` mantendo o mesmo fluxo da venda no PDV ativo.
    *   No backend `/server.ts`, garantir que o webhook `/api/webhooks/mercadopago` identifique e atualize a transação e o documento de caixa correspondente no Firestore quando o evento mudar para aprovado, cancelado ou expirado.

### Épico 3: Download de XML Fiscal e Atualização Automática de Notas
*   **Páginas Afetadas:** `/Fiscal` (`src/pages/Fiscal.tsx`), `src/components/NotificationCenter.tsx`
*   **Componentes:**
    *   `XmlDownloadButton` (Botão com ícone de download inserido na coluna de ações da tabela de notas).
*   **Comportamentos (`behavior`):**
    *   Na lista de Notas Fiscais, caso a nota fiscal tenha o status "Emitida" e o campo `xml_storage_url` esteja preenchido, exibir o botão `XmlDownloadButton`.
    *   O clique no botão deve baixar diretamente o arquivo `.xml` correspondente do Google Cloud Storage/Firebase Storage, aplicando o atributo HTML `download`.
    *   Ao receber notificação de webhook de autorização/cancelamento de NF-e/NFC-e, o painel fiscal deve disparar uma invalidação automática no React Query (`queryClient.invalidateQueries({ queryKey: ["invoices"] })`), mantendo a listagem atualizada em tempo real sem exigir carregamento manual da página.

### Épico 4: Indicador de Conectividade PWA e Contador de Fila Offline
*   **Páginas Afetadas:** Layout do Sistema (`src/components/Layout.tsx`), Inicialização (`src/App.tsx`)
*   **Componentes:**
    *   `ConnectivityBadge` (Badge de status visual: verde com texto "On-line", laranja com texto "Off-line").
    *   `OfflineQueueCounter` (Pill indicadora com número de vendas salvas na fila IndexedDB aguardando sincronização).
*   **Comportamentos (`behavior`):**
    *   Escutar os eventos `window.addEventListener('online')` e `window.addEventListener('offline')` para atualizar o estado de rede globalmente.
    *   No cabeçalho de `Layout.tsx`, exibir o `ConnectivityBadge` com base no estado atual da rede.
    *   Quando em modo `Off-line`, consultar ciclicamente ou escutar o banco IndexedDB (`idb-keyval`) para verificar se há registros de vendas locais pendentes de envio à nuvem. Se houver vendas pendentes, exibir o `OfflineQueueCounter` ao lado do badge de rede.

### Épico 5: Rastreamento de Transferências de Estoque Inter-Filiais
*   **Páginas Afetadas:** `/HistoricoEstoque` (`src/pages/InventoryHistory.tsx`), `/Transferencias` (`src/pages/Transfers.tsx`)
*   **Componentes:**
    *   `TransferFilterPanel` (Filtros de auditoria: Entradas, Saídas, Transferências).
    *   `TransferRowDetails` (Exibição estendida com filial de origem e destino na tabela de movimentos).
*   **Comportamentos (`behavior`):**
    *   Na página `InventoryHistory.tsx`, adicionar a opção "Transferências" no filtro por tipo de movimentação.
    *   Quando selecionado, renderizar as movimentações que contêm metadados ou motivos `TRANSFER_OUT` e `TRANSFER_IN`.
    *   Nas linhas correspondentes, buscar ou decodificar os nomes das filiais de origem e de destino para apresentá-los na coluna "Origem/Destino", assegurando auditoria limpa e precisa do inventário.

### Épico 6: Impressão de Compras e Exportação para Relatórios Analíticos
*   **Páginas Afetadas:** `/HistoricoCompras` (`src/pages/PurchaseHistory.tsx`), `/RelatorioGiro` (`src/pages/InventoryTurnoverReport.tsx`), `/RelatorioDRE` (`src/pages/CashFlowReport.tsx`), `/RelatorioLucratividade` (`src/pages/ProfitabilityReport.tsx`)
*   **Componentes:**
    *   `PurchaseReceiptPrint` (Serviço de geração e formatação de recibo em formato A4 ou bobina 80mm para impressão).
    *   `ExportButton` (Botão reutilizável para exportar dados para Excel/CSV).
*   **Comportamentos (`behavior`):**
    *   Em `PurchaseHistory.tsx`, adicionar coluna de ações com o botão "Imprimir Comprovante". O clique deve acionar um modal ou janela de impressão formatando os dados da compra e produtos adquiridos.
    *   Nas páginas de Giro de Estoque, DRE (Fluxo de Caixa) e Lucratividade, integrar o componente `ExportButton.tsx` passando os dados já filtrados e formatados na tabela, gerando arquivos nos formatos Excel (.xlsx) e CSV com cabeçalhos apropriados em português.

---
**Resultado Esperado:** Garantia de cobertura total dos fluxos com máxima responsividade e conformidade técnica no ERP PowerControl.
