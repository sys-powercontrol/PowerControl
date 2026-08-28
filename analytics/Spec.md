# Especificação Técnica de Finalização do Sistema - Spec.md

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Status da Especificação:** Aprovada - Escopo Estrito de Finalização (Sem Novas Funcionalidades)  
**Documento Base:** `analytics/report.md`

---

## 1. Introdução e Diretrizes

Este documento de especificação técnica formaliza **exclusivamente os comportamentos, fluxos de dados, componentes e tratamentos que faltam ser finalizados** no PowerControl ERP. Todos os requisitos aqui descritos foram extraídos diretamente do diagnóstico estruturado em `analytics/report.md`.

---

## 2. Especificação Técnica por Módulo

### 2.1. Módulo Fiscal e Documentos Eletrônicos (NFe / NFCe)

* **Páginas Afetadas:** `src/pages/Fiscal.tsx`, `src/pages/CertificateManager.tsx`
* **Componentes Afetados:** `src/components/Fiscal/InutilizacaoModal.tsx`, `src/components/Fiscal/TaxRuleForm.tsx`
* **Camadas de Serviço:** `src/lib/fiscal.ts`, `src/lib/api.ts`

#### Comportamentos a Finalizar:
1. **Sincronização de Cancelamento/Inutilização:**
   - Ao receber confirmação de cancelamento da SEFAZ, executar atualização síncrona:
     - Na coleção `invoices`: definir `status = 'Cancelada'`, gravar `protocol_cancelamento`, `cancel_reason` e `canceled_at`.
     - Na coleção `sales`: atualizar a venda vinculada para `nfe_status = 'Cancelada'`.
2. **Exportação de XMLs em Lote:**
   - Na rotina de exportação ZIP em `Fiscal.tsx`, verificar a presença da propriedade `xml_content` em cada nota selecionada.
   - Caso `xml_content` esteja ausente no registro local, realizar requisição de busca do XML à API antes do empacotamento.
3. **Validação Prévia do Certificado Digital A1:**
   - No envio de NFe/NFCe, verificar a presença e a data de validade (`valid_until`) do certificado A1 da empresa.
   - Se ausente ou expirado, abortar o envio antes da chamada externa e disparar notificação com redirecionamento opcional para a página de certificados.
4. **Mapeamento de Impostos nas Regras Fiscais:**
   - Vincular os dados de impostos (ICMS, IPI, PIS, COFINS, CFOP e CSOSN/CST) configurados em `tax_rules` diretamente aos itens transmitidos na nota.

---

### 2.2. Módulo Financeiro e Conciliação Bancária

* **Páginas Afetadas:** `src/pages/AccountsReceivable.tsx`, `src/pages/AccountsPayable.tsx`, `src/pages/BankReconciliation.tsx`, `src/pages/Cashiers.tsx`
* **Componentes Afetados:** `src/components/Financial/OFXImporter.tsx`
* **Camadas de Serviço:** `src/lib/finance.ts`, `src/lib/api.ts`

#### Comportamentos a Finalizar:
1. **Estorno Atômico de Títulos:**
   - Ao estornar recebimento (`accounts_receivable`) ou pagamento (`accounts_payable`), executar via transação Firestore (`runTransaction`):
     - Atualizar o status do título de volta para `pendente`, limpando data de pagamento e valor pago.
     - Recompor o saldo da conta bancária (`bank_accounts`) debitando ou creditando o valor estornado.
     - Se o pagamento tiver ocorrido via caixa físico (`cashiers`), deduzir ou reverter o total recebido na sessão do caixa.
     - Registrar um lançamento de estorno no extrato de movimentações financeiras.
2. **Bloqueio de Exclusão Direta:**
   - Desabilitar ou interceptar o botão de exclusão caso o título possua status `pago` ou `recebido`, instruindo o operador a realizar o estorno da baixa previamente.
3. **Identificador Unívoco em Importação OFX:**
   - Persistir o campo `fitid` (Financial Transaction ID) no documento `bank_transactions` gerado na conciliação.
   - Durante a leitura do arquivo `.ofx`, verificar se o `fitid` já existe no banco de dados para a conta bancária selecionada, prevenindo lançamentos duplicados.

---

### 2.3. Módulo de Estoque e Ficha Técnica (BOM)

* **Páginas Afetadas:** `src/pages/Transfers.tsx`, `src/pages/InventoryAdjustments.tsx`, `src/pages/Sales.tsx`
* **Componentes Afetados:** `src/components/BOMBuilder.tsx`
* **Camadas de Serviço:** `src/lib/inventory.ts`, `src/lib/api.ts`

#### Comportamentos a Finalizar:
1. **Baixa e Estorno de Insumos da BOM:**
   - Ao finalizar uma venda contendo produto com tipo `composto` (com `bom_items` cadastrados):
     - Executar a dedução no estoque de cada insumo proporcionalmente à quantidade vendida do produto pai.
     - Em caso de cancelamento da venda, recompor o saldo de estoque de cada insumo componente.
2. **Atomicidade em Transferência entre Locais de Estoque:**
   - Na tela de `Transfers.tsx`, executar o débito no local de origem e o crédito no local de destino sob a mesma transação no Firestore, gerando os registros de `inventory_movements` com tipo `TRANSFER_OUT` e `TRANSFER_IN`.
3. **Enforcement da Trava de Estoque Negativo:**
   - Consultar o parâmetro `allow_negative_stock` da empresa antes de qualquer saída de estoque (venda ou transferência) e impedir a confirmação caso o saldo final fique abaixo de zero.

---

### 2.4. Módulo de Vendas, PDV e Gateway de Pagamentos

* **Páginas Afetadas:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`
* **Componentes Afetados:** `src/components/Sales/PaymentGateway.tsx`
* **Camadas de Serviço:** `src/serverApp.ts`, `src/lib/offlineStore.ts`, `src/lib/api.ts`

#### Comportamentos a Finalizar:
1. **Polling e Conclusão Automática do Pagamento PIX:**
   - No modal `PaymentGateway.tsx`, ao gerar um QR Code PIX, iniciar polling periódico de consulta do status da cobrança (`/api/pix-status/:id` ou Firestore listener).
   - Ao receber status `paid` / `completed`, fechar automaticamente o modal, registrar o pagamento como confirmado e acionar a conclusão da venda no PDV.
2. **Cancelamento em Cascata no Histórico de Vendas:**
   - Ao cancelar uma venda na tela `SalesHistory.tsx`:
     - Devolver os produtos (e insumos de BOM) ao estoque.
     - Cancelar as contas a receber geradas por essa venda.
     - Cancelar ou estornar o registro de comissão do vendedor vinculado.
     - Atualizar o status da venda para `cancelada`.
3. **Purga da Fila de Vendas Offline:**
   - No módulo `offlineStore.ts`, após o envio e confirmação de persistência no Firestore de uma venda gravada localmente em contingência, remover o item da fila local para prevenir reenvios.

---

### 2.5. Gestão de Usuários, Empresas e Planos

* **Páginas Afetadas:** `src/pages/Employees.tsx`, `src/pages/Products.tsx`
* **Componentes Afetados:** `src/components/ProductDetailsModal.tsx`, `src/components/UpgradePlanModal.tsx`

#### Comportamentos a Finalizar:
1. **Desvinculação Segura de Colaboradores:**
   - Ao remover um colaborador em `Employees.tsx`, executar atomicamente a remoção do `company_id` do array `company_ids` no documento do usuário (`users/{userId}`) e a inativação ou exclusão do registro na coleção `employees`.
2. **Restrição de Fotos de Produtos e Upgrade Modal:**
   - Quando o parâmetro `disable_product_images` estiver ativo para a empresa, ocultar/bloquear os campos de upload de imagem e disparar o `UpgradePlanModal` com camada `z-[999999]`.

---

### 2.6. Atendimento, Suporte e Auditoria

* **Páginas Afetadas:** `src/pages/Support.tsx`, `src/pages/AuditLogs.tsx`

#### Comportamentos a Finalizar:
1. **Tratamento de Anexos nos Chamados de Suporte:**
   - Permitir que imagens anexadas aos tickets sejam renderizadas em miniatura com suporte a clique para ampliação (lightbox) e download.
2. **Consolidação de Logs de Auditoria:**
   - Garantir que chamadas críticas (cancelamento de venda, estorno financeiro, alteração de parâmetros fiscais e desassociação de usuários) invoquem `api.log({ action, entity, details })`.

---

## 3. Matriz de Componentes e Funções Técnicas

| Identificador | Página / Componente | Função / Hook Envolvido | Comportamento Esperado |
| :--- | :--- | :--- | :--- |
| **SPEC-01** | `Fiscal.tsx` / `InutilizacaoModal.tsx` | `cancelInvoiceMutation` / `api.syncSaleInvoice` | Sincronizar status `Cancelada` na NFe e na Venda |
| **SPEC-02** | `AccountsReceivable.tsx` / `AccountsPayable.tsx` | `handleReversePayment` / `finance.ts` | Recomposição atômica de banco e caixa |
| **SPEC-03** | `Transfers.tsx` / `BOMBuilder.tsx` | `transferMutation` / `inventory.ts` | Baixa de insumos de BOM e transferência atômica |
| **SPEC-04** | `PaymentGateway.tsx` / `SalesHistory.tsx` | `pollPaymentStatus` / `handleCancelSale` | Polling automático PIX e cancelamento em cascata |
| **SPEC-05** | `Employees.tsx` / `ProductDetailsModal.tsx` | `handleRemoveEmployee` / `UpgradePlanModal` | Desvinculação multiempresa e trava de imagens |
| **SPEC-06** | `Support.tsx` / `AuditLogs.tsx` | `handleCreateTicket` / `api.log` | Anexos com lightbox e logs em operações críticas |
