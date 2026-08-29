# Especificação Técnica e Funcional - Finalizações do Sistema (Spec.md)

**Data e Hora de Geração:** 29 de Agosto de 2026 às 16:18:38 (Horário de Brasília - UTC-3)  
**Documento de Referência:** `analytics/report.md`  
**Escopo:** Especificação exclusiva dos comportamentos, páginas e componentes que demandam finalização e amarração de integridade (SEM adição de novas funcionalidades).

---

## 1. Módulo Fiscal e Tributário

### 1.1. Página: `src/pages/Fiscal.tsx`
* **Behavior (Cancelamento em Cascata da Nota Fiscal):**
  - Ao receber a confirmação de cancelamento via SEFAZ (`fiscalApi.cancel`), atualizar o documento `invoices/{invoiceId}` com `status: "Cancelada"`, `cancel_reason`, `cancel_protocol` e `cancelled_at`.
  - Atualizar o documento correspondente em `sales/{saleId}` com `nfe_status: "Cancelada"` e `nfe_cancel_reason`.
  - Registrar log de auditoria via `api.log({ action: 'UPDATE', entity: 'invoices', ... })`.
* **Behavior (Exportação Mensal de XMLs em Lote):**
  - Ao acionar "Exportar XMLs (.zip)", filtrar as notas emitidas/autorizadas do mês e ano selecionados.
  - Para notas sem `xml_content` em cache local, realizar fallback de consulta remota da URL do XML ou status na API fiscal, baixar o arquivo XML via `fetch` e compactar no arquivo ZIP via biblioteca `JSZip`.
* **Component & Behavior: Indicador de Validade do Certificado Digital:**
  - Avaliar a data `expiration_date` da empresa/certificado.
  - Exibir badge e banner de aviso visual caso o certificado esteja vencido ou a menos de 15 dias do vencimento.

### 1.2. Página: `src/pages/TaxSettings.tsx`
* **Behavior (Auditoria de Regras Tributárias):**
  - Registrar evento de auditoria (`api.log`) em todas as mutações (`CREATE`, `UPDATE`, `DELETE`) na coleção `tax_rules`.

---

## 2. Módulo Financeiro e Conciliação Bancária

### 2.1. Páginas: `src/pages/AccountsReceivable.tsx` e `src/pages/AccountsPayable.tsx`
* **Behavior (Estorno Atômico de Baixas):**
  - No estorno de recebimento ou pagamento (`reverseAccountReceipt` / `reverseAccountPayment`), reverter atomicamente os saldos em `bankAccounts` ou `cashiers`.
  - Gravar movimentação de estorno na coleção `movements` e restaurar o status do título para `"Pendente"`.
* **Component & Behavior (Bloqueio de Exclusão de Títulos Baixados):**
  - Desabilitar visual e funcionalmente o botão de exclusão (`Trash2`) em títulos com status `"Recebido"` ou `"Pago"`.
  - Exibir tooltip e alerta orientando o operador a realizar o estorno financeiro antes da exclusão física do documento.

### 2.2. Componente: `src/components/Financial/OFXImporter.tsx`
* **Behavior (Deduplicação de Extratos por FITID):**
  - Na leitura dos blocos `<STMTTRN>` do arquivo OFX, extrair o campo `<FITID>`.
  - Comparar com os identificadores `ofx_fitid` já existentes nas coleções `accountsPayable` e `accountsReceivable`.
  - Desmarcar previamente da lista de importação transações que já foram importadas ou conciliadas anteriormente.

---

## 3. Módulo de Estoque, Ficha Técnica (BOM) e Transferências

### 3.1. Biblioteca & Helper: `src/lib/inventory.ts`
* **Behavior (Dedução e Devolução Recursiva de Insumos BOM):**
  - Na finalização de vendas (`processSale`), verificar a existência de `bom_items` no produto. Se houver composição, deduzir a quantidade proporcional do estoque de cada insumo e registrar movimentação `SALE_KIT_COMPONENT`.
  - No cancelamento de vendas (`reverseSaleStock`), devolver ao estoque a quantidade exata de cada componente que compõe o produto.
* **Behavior (Trava de Saldo Negativo):**
  - Respeitar a flag `allow_negative_stock` da empresa, impedindo transações caso a quantidade disponível de produto ou insumo seja menor que a quantidade requisitada.

### 3.2. Página: `src/pages/Transfers.tsx`
* **Behavior (Transferência Atômica Inter-Filiais):**
  - Executar a transferência entre locais de estoque via `runTransaction`, debitando na filial de origem, creditando na filial de destino e criando registros `TRANSFER_OUT` e `TRANSFER_IN` em `inventory_movements`.

---

## 4. Módulo de Vendas, PDV e Contingência Offline

### 4.1. Componente: `src/components/Sales/PaymentGateway.tsx`
* **Behavior (Polling e Confirmação de PIX):**
  - Realizar polling a cada 4 segundos no endpoint `/api/payments/status/:paymentId`.
  - Ao receber status de aprovação (`CONFIRMED`, `APPROVED`, `PAID`), atualizar o estado visual para sucesso, fechar a modal e disparar o callback `onSuccess` para gravar a venda.

### 4.2. Página: `src/pages/SalesHistory.tsx`
* **Behavior (Cancelamento Completo de Venda):**
  - Ao cancelar uma venda:
    1. Devolver os produtos e componentes BOM ao estoque (`inventory.reverseSaleStock`).
    2. Cancelar as parcelas pendentes geradas em `accountsReceivable`.
    3. Anular as comissões calculadas para o vendedor.
    4. Solicitar o cancelamento da NF-e vinculada (se houver).
    5. Registrar log de auditoria.

### 4.3. Biblioteca: `src/lib/offlineStore.ts`
* **Behavior (Sincronização e Purga da Fila):**
  - Ao restaurar conexão à internet, processar a fila de vendas e compras offline gravando no Firestore.
  - Purgar imediatamente do IndexedDB cada registro finalizado com sucesso para prevenir duplicação de dados.

---

## 5. Módulo de Usuários, Multi-Empresa e Planos

### 5.1. Página: `src/pages/Employees.tsx`
* **Behavior (Desvinculação Segura de Filiais):**
  - Ao desvincular um funcionário de uma empresa, atualizar o registro em `employees` e remover o `company_id` do array `company_ids` no documento `users/{userId}` em um lote atômico (`writeBatch`).

### 5.2. Componente: `src/components/UpgradePlanModal.tsx`
* **Behavior & Layout (Camada Visual Prioritária):**
  - Garantir z-index máximo (`z-[999999]`) e bloqueio de scroll de fundo quando a modal for exibida por atingimento de limite contratual de usuários, filiais ou cadastros.

---

## 6. Módulo de Suporte Técnico e Auditoria

### 6.1. Página: `src/pages/Support.tsx`
* **Component & Behavior (Visualizador Lightbox de Anexos):**
  - Abrir visualização ampliada (lightbox) ao clicar em capturas de tela ou imagens anexadas aos chamados de suporte, disponibilizando botão de download direto.

### 6.2. Biblioteca: `src/lib/api.ts` e Página: `src/pages/AuditLogs.tsx`
* **Behavior (Rastreabilidade Automática em Exclusões):**
  - No método `api.delete(entity, id)`, registrar automaticamente evento em `audit_logs` com `action: 'DELETE'`, informando entidade, ID e metadados da operação.
