# Relatório de Implementações Pendentes (Análise de Finalização)

**Data e Hora de Geração:** 28/07/2026 18:05:00 (Horário de Brasília)

---

## 1. Introdução e Objetivo da Análise
Este relatório apresenta uma auditoria detalhada de finalizações técnicas necessárias no sistema **PowerControl** (ERP/PDV). O objetivo principal é identificar e mapear lacunas existentes entre as telas, fluxos de controle e APIs desenvolvidas, especificando **exclusivamente o que falta para finalizar os fluxos já iniciados**, sem propor ou introduzir novos escopos ou funcionalidades não solicitadas no projeto original.

---

## 2. Mapeamento das Pendências por Módulo

### Módulo A: Segurança e Perfil de Usuário
*   **Páginas:** `/MeuPerfil` (`src/pages/Profile.tsx`)
*   **Contexto Atual:** A reautenticação para troca de senha usando `requires-recent-login` já está integrada com o modal, porém a ativação de Autenticação de Dois Fatores (MFA/2FA) ainda está pendente de uma implementação real/simulada robusta para usuários com cargos `master` e `admin`.
*   **O que falta finalizar:** 
    *   Criação de um seletor visual e configuração persistente no perfil para habilitar MFA/2FA.
    *   Simular ou conectar com o fluxo de segurança do Firebase Auth para garantir a proteção extra em contas administrativas.

### Módulo B: Conciliação de Pagamentos no PDV
*   **Páginas/Servidor:** `src/components/Sales/PaymentGateway.tsx`, `/server.ts`
*   **Contexto Atual:** Integração com Mercado Pago (PIX e Cartão simulado) está configurada, mas o PDV carece de tratamento contínuo de status se o pagamento expirar ou for cancelado.
*   **O que falta finalizar:**
    *   No modal de pagamento no PDV, quando a consulta contínua (polling) retornar status `EXPIRED` ou `CANCELLED`, exibir feedback sonoro/visual, habilitando um botão para "Gerar Novo Código PIX" ou "Tentar Novamente" de forma direta.
    *   Garantir a atualização do status da venda correspondente no Firestore por meio do webhook do Mercado Pago em `/api/webhooks/mercadopago`.

### Módulo C: Gestão e Download de Documentos Fiscais
*   **Páginas/Servidor:** `/Fiscal` (`src/pages/Fiscal.tsx`), `src/components/NotificationCenter.tsx`, `/server.ts`
*   **Contexto Atual:** O backend recebe webhooks da FocusNFe ou WebmaniaBR e salva o XML em `xml_storage_url`, mas o usuário final não tem acesso simples de download na tabela.
*   **O que falta finalizar:**
    *   Adicionar um botão de ação "Download XML" na tabela de Notas Fiscais em `Fiscal.tsx`, acessando o `xml_storage_url` de forma transparente.
    *   Integrar a invalidação de cache automática (`queryClient.invalidateQueries({ queryKey: ["invoices"] })`) quando notificações fiscais forem disparadas por webhook ou no `NotificationCenter.tsx`.

### Módulo D: Indicador de Conectividade e Fila Offline
*   **Páginas/Componentes:** Layout Principal (`src/components/Layout.tsx`), `src/App.tsx`, `src/lib/queryClient.ts`
*   **Contexto Atual:** Estrutura de cache persistente com `@tanstack/react-query-persist-client` e `idb-keyval` está funcional para uso offline, mas falta feedback visual de status para o operador.
*   **O que falta finalizar:**
    *   Adicionar no cabeçalho do `Layout.tsx` um indicador dinâmico do estado de rede: um badge de conectividade (`On-line` / `Off-line`).
    *   Ler o banco IndexedDB (`idb-keyval`) e apresentar o número de vendas guardadas localmente aguardando sincronização com a nuvem quando o sistema estiver sem conexão.

### Módulo E: Auditoria de Transferências Inter-Filiais
*   **Páginas:** `/HistoricoEstoque` (`src/pages/InventoryHistory.tsx`), `/Transferencias` (`src/pages/Transfers.tsx`)
*   **Contexto Atual:** A funcionalidade de transferência decrementa na origem e incrementa no destino, mas a rastreabilidade dessas movimentações de estoque não está exposta no histórico.
*   **O que falta finalizar:**
    *   Implementar filtros na tabela de `InventoryHistory.tsx` permitindo visualizar especificamente os tipos `TRANSFER_OUT` e `TRANSFER_IN`.
    *   Exibir colunas com a filial de origem e a filial de destino em cada linha do histórico para propósitos de auditoria de inventário.

### Módulo F: Impressão de Compras e Padronização de Exportação de Relatórios
*   **Páginas:** `/HistoricoCompras` (`src/pages/PurchaseHistory.tsx`), `/RelatorioGiro` (`src/pages/InventoryTurnoverReport.tsx`), `/RelatorioDRE` (`src/pages/CashFlowReport.tsx`), `/RelatorioLucratividade` (`src/pages/ProfitabilityReport.tsx`)
*   **Contexto Atual:** O sistema possui recursos avançados de PDF/Excel via `ExportButton.tsx` e impressões no PDV, mas alguns relatórios e o histórico de compras não possuem essa integração.
*   **O que falta finalizar:**
    *   Em `PurchaseHistory.tsx`, adicionar um botão de impressão do recibo de compra (conferência do fornecedor).
    *   Integrar o componente `ExportButton.tsx` nos relatórios de Giro de Estoque, DRE (Fluxo de Caixa) e Lucratividade para possibilitar a exportação das respectivas tabelas para Excel (.xlsx) e CSV.

---
**Status da Análise:** Concluída para especificação técnica subsequente.
