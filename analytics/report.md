# Relatório de Análise Geral do Sistema - Implementações Pendentes de Finalização

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Status do Projeto:** Análise Concluída - Escopo Estrito de Finalização (Sem Implementação de Novas Funcionalidades)

---

## 1. Visão Geral Executiva

Este relatório apresenta o diagnóstico técnico estruturado de todas as **rotinas, integrações, regras de negócio e fluxos operacionais já existentes no sistema PowerControl ERP que requerem finalização, amarração de ponta a ponta e garantia de integridade transacional**.

Seguindo estritamente a diretriz do projeto, **nenhuma nova funcionalidade ou módulo fora do escopo original foi adicionado**. O foco exclusivo é fechar ciclos pendentes, assegurar a consistência dos dados nas operações atômicas (Firestore transactions / batch writes) e garantir que os componentes já desenhados na interface cumpram seus comportamentos de ponta a ponta.

---

## 2. Diagnóstico Detalhado por Módulo do Sistema

### 2.1. Módulo Fiscal e Documentos Eletrônicos (NFe / NFCe)
* **Arquivos do Módulo:** `src/pages/Fiscal.tsx`, `src/pages/TaxSettings.tsx`, `src/pages/CertificateManager.tsx`, `src/components/Fiscal/*`, `src/lib/fiscal.ts`
* **Status Atual:** Telas de emissão, listagem de notas, visualização de DANFE e painel de regras tributárias implementados na interface.
* **Pontos de Finalização Pendentes:**
  1. **Sincronização de Cancelamento e Inutilização com a Venda:** Assegurar que, ao receber o protocolo de cancelamento/inutilização da SEFAZ, o status seja atualizado tanto na coleção `invoices` (`Cancelada` / `Inutilizada`) quanto no documento da venda de origem em `sales` (`nfe_status = 'Cancelada'`), incluindo protocolo e justificativa da SEFAZ.
  2. **Tratamento de Exportação de XMLs em Lote:** Tratar fallback nas rotinas de download de XMLs em lote (`.zip`) caso alguma nota da lista não possua o XML gravado no cache local, buscando o payload na API fiscal.
  3. **Validação Preventiva de Certificado Digital A1:** Bloquear tentativas de transmissão quando o certificado A1 da empresa estiver ausente ou com data de validade expirada, disparando aviso contextual ao operador.
  4. **Herança Dinâmica de Tributação por Item:** Assegurar a injeção dos tributos (ICMS, IPI, PIS, COFINS, CFOP, NCM e CST/CSOSN) configurados nas regras fiscais para os itens enviados na NFe.

---

### 2.2. Módulo Financeiro, Fluxo de Caixa e Conciliação Bancária
* **Arquivos do Módulo:** `src/pages/AccountsReceivable.tsx`, `src/pages/AccountsPayable.tsx`, `src/pages/BankReconciliation.tsx`, `src/pages/Cashiers.tsx`, `src/components/Financial/OFXImporter.tsx`, `src/lib/finance.ts`
* **Status Atual:** Telas de Contas a Receber/Pagar, controle de sessões de caixa (PDV), extrato bancário e importação de arquivos OFX funcionais.
* **Pontos de Finalização Pendentes:**
  1. **Estorno Transacional Atômico de Títulos Baixados:** Ao estornar uma conta a receber ou a pagar já liquidada, reverter atomicamente o saldo da conta bancária (`bank_accounts`) e os totais da sessão de caixa (`cashiers`), registrando a movimentação no extrato.
  2. **Bloqueio de Exclusão Direta de Títulos Liquidados:** Exigir formalmente o estorno prévio antes de permitir a exclusão de qualquer título com status `pago` / `recebido`.
  3. **Identificador Unívoco (`fitid`) na Conciliação OFX:** Persistir a chave unívoca de cada transação do extrato OFX para impedir importações e conciliações duplicadas no mesmo período bancário.

---

### 2.3. Módulo de Estoque, Movimentações e Fichas Técnicas (BOM)
* **Arquivos do Módulo:** `src/pages/Products.tsx`, `src/pages/Transfers.tsx`, `src/pages/InventoryAdjustments.tsx`, `src/pages/InventoryHistory.tsx`, `src/components/BOMBuilder.tsx`, `src/lib/inventory.ts`
* **Status Atual:** Cadastro de produtos com variações, montagem de fichas técnicas (BOM), transferências entre estoques e histórico de movimentações.
* **Pontos de Finalização Pendentes:**
  1. **Baixa e Estorno Automático de Insumos da BOM:** Ao confirmar a venda de um produto composto, deduzir automaticamente as quantidades proporcionais de cada insumo (`bom_items`) e, no cancelamento da venda, recompor o saldo desses insumos no estoque.
  2. **Atomicidade em Transferências entre Filiais/Locais:** Garantir que a saída da origem e a entrada no destino ocorram em operação atômica indivisível, criando as respectivas entradas em `inventory_movements`.
  3. **Controle de Bloqueio de Estoque Negativo:** Respeitar rigidamente a configuração `allow_negative_stock` da empresa no momento da emissão da venda e transferência.

---

### 2.4. Módulo de Vendas, PDV e Gateway de Pagamento
* **Arquivos do Módulo:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/components/Sales/PaymentGateway.tsx`, `src/serverApp.ts`, `src/lib/offlineStore.ts`
* **Status Atual:** Frente de caixa (PDV) com busca rápida, histórico de vendas, modal de pagamento PIX/Cartão e fila de contingência offline.
* **Pontos de Finalização Pendentes:**
  1. **Polling e Conclusão Automática de Pagamento PIX:** Finalizar e imprimir o comprovante/cupom no PDV imediatamente após a confirmação via webhook ou polling da transação PIX.
  2. **Cancelamento Integral de Venda no Histórico:** Reverter em lote: devolução dos itens ao estoque (inclusive itens compostos), estorno dos títulos no Contas a Receber e anulação das comissões do vendedor.
  3. **Limpeza e Confirmação da Fila Offline:** expurgar da base local IndexedDB/localStorage os pedidos offline sincronizados com sucesso com o Firestore para evitar reprocessamento.

---

### 2.5. Gestão de Usuários, Empresas e Restrições de Planos
* **Arquivos do Módulo:** `src/pages/Employees.tsx`, `src/pages/Products.tsx`, `src/components/ProductDetailsModal.tsx`, `src/components/UpgradePlanModal.tsx`
* **Status Atual:** Cadastro de colaboradores, gestão multiempresa e modal de upgrade para planos superiores.
* **Pontos de Finalização Pendentes:**
  1. **Desvinculação Segura de Usuário/Empresa:** Ao desativar ou desvincular um funcionário, atualizar atomicamente o array `company_ids` do usuário em `users` e o registro em `employees`.
  2. **Bloqueio e Chamada do Modal de Upgrade (`disable_product_images`):** Garantir que planos sem suporte a fotos de produtos exibam o `UpgradePlanModal` com sobreposição adequada (`z-[999999]`) tanto no formulário quanto nos modais de visualização.

---

### 2.6. Atendimento, Suporte e Auditoria Operacional
* **Arquivos do Módulo:** `src/pages/Support.tsx`, `src/pages/AuditLogs.tsx`
* **Status Atual:** Central de chamados com múltiplos canais e tela de visualização de logs de auditoria.
* **Pontos de Finalização Pendentes:**
  1. **Upload e Visualização de Anexos em Chamados:** Permitir inclusão de imagens nos tickets de suporte com visualização em modal/lightbox.
  2. **Cobertura Completa de Logs Sensíveis (`audit_logs`):** Disparar logs estruturados para cancelamentos fiscais, estornos financeiros e exclusões de cadastros centrais.

---

## 3. Matriz de Priorização de Finalizações

| Identificador | Módulo | Escopo de Finalização | Criticidade |
| :--- | :--- | :--- | :---: |
| **ISSUE-01** | Fiscal & NFe | Cancelamento síncrono com venda, regras tributárias dinâmicas e validação A1 | Alta |
| **ISSUE-02** | Financeiro | Estorno atômico de baixas, trava de exclusão de títulos e unicidade OFX | Alta |
| **ISSUE-03** | Estoque & BOM | Baixa de insumos compostos, atomicidade em transferências e trava de saldo | Alta |
| **ISSUE-04** | Vendas & PDV | Polling de pagamento PIX, cancelamento em cascata e limpeza da fila offline | Alta |
| **ISSUE-05** | Usuários & Planos | Desvinculação atômica multiempresa e modal de upgrade para recursos restritos | Média |
| **ISSUE-06** | Suporte & Logs | Anexos com lightbox em tickets e cobertura de auditoria em ações críticas | Média |
