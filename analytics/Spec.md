# Especificação Técnica de Finalizações do Sistema (Spec)

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:00:00 (Horário de Brasília - UTC-3)  
**Documento de Referência:** `analytics/report.md`  
**Escopo:** Especificação técnica detalhada estritamente do que falta finalizar e conectar no sistema (páginas, comportamentos e componentes), **sem introdução de novas funcionalidades ou escopos não solicitados**.

---

## 1. Roteamento & Navegação

### 1.1 Resolução do Conflito de Rota `/Categorias` e Acesso ao Centro de Custos
- **Arquivos:** `src/App.tsx` e `src/components/Layout.tsx`
- **Componente:** `<Route>` e item de menu `Centro de Custos`
- **Comportamento Atual:**
  - `App.tsx` possui duas rotas idênticas para `Categorias`:
    - Linha 129: `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />`
    - Linha 153: `<Route path="Categorias" element={<Categories />} />`
  - O menu "Centro de Custos" em `Layout.tsx` aponta para `/Categorias`. Como a primeira rota casa primeiro, o usuário é redirecionado para a listagem de Produtos com a aba Categorias ativa, impossibilitando a gestão de Centro de Custos.
- **Comportamento Especificado:**
  - Em `src/App.tsx`:
    - Definir rota explícita para o Centro de Custos financeiro: `<Route path="CentroDeCustos" element={<Categories />} />` (ou manter redirect de compatibilidade).
    - Preservar `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />` para a gestão de categorias de produtos.
  - Em `src/components/Layout.tsx`:
    - Atualizar o link do menu "Centro de Custos" no submenu Financeiro para `path: "/CentroDeCustos"`.

### 1.2 Registro da Rota Órfã de Auditoria
- **Arquivos:** `src/App.tsx` e `src/components/Layout.tsx`
- **Componente:** `src/pages/AuditLogs.tsx`
- **Comportamento Atual:**
  - O componente `AuditLogs.tsx` está implementado com filtros por empresa, usuário, ação, período, paginação por cursor e exportação CSV, mas não possui rota em `App.tsx` nem link de acesso no menu lateral.
- **Comportamento Especificado:**
  - Em `src/App.tsx`:
    - Importar `AuditLogs` via lazy import ou import direto.
    - Adicionar a rota autenticada: `<Route path="Auditoria" element={<AuditLogs />} />`.
  - Em `src/components/Layout.tsx`:
    - Adicionar item de navegação "Auditoria" (ícone `History`, permissão `audit.view`) acessível aos perfis administrativos / master.

---

## 2. Módulo Fiscal & Certificado Digital

### 2.1 Sincronização da Validade do Certificado na Empresa Ativa
- **Arquivos:** `src/components/Fiscal/CertificateManager.tsx` e `src/pages/Fiscal.tsx`
- **Componente:** `CertificateManager.tsx` (fluxo pós-upload de PFX)
- **Comportamento Atual:**
  - Ao fazer upload e validação de um certificado digital A1, o componente grava os metadados na coleção `certificates`. Contudo, ele não atualiza o documento da empresa ativa em `companies/{companyId}` com `fiscal_certificate_expiration` e `has_certificate: true`.
  - A tela `Fiscal.tsx` consulta `company?.fiscal_certificate_expiration` para exibir a vigência e validar bloqueios preventivos. Com o campo não preenchido na empresa, a tela apresenta avisos de certificado ausente/vencido.
- **Comportamento Especificado:**
  - Em `src/components/Fiscal/CertificateManager.tsx`:
    - Logo após salvar o certificado na coleção `certificates`, executar:
      ```typescript
      await api.put("companies", currentCompanyId, {
        fiscal_certificate_expiration: certData.valid_to,
        certificate_expiration: certData.valid_to,
        has_certificate: true,
        updated_at: new Date().toISOString()
      });
      ```
    - Invalidar as queries `["company", currentCompanyId]` e `["companies"]`.
  - Em `src/pages/Fiscal.tsx`:
    - O badge e card de certificado passam a refletir imediatamente a data de validade sincronizada.

### 2.2 Disparo HTTP de E-mail de Nota Fiscal
- **Arquivos:** `src/pages/Fiscal.tsx` e `server.ts` (ou `src/serverApp.ts`)
- **Componente:** Modal de envio de e-mail em `Fiscal.tsx`
- **Comportamento Atual:**
  - A função `handleSendEmail` invoca `api.post("fiscal/send-email", emailPayload)`, tentando gravar um documento no Firestore.
  - O endpoint Express `/api/fiscal/send-email` no backend já está montado, mas não é acionado pelo cliente.
- **Comportamento Especificado:**
  - Em `src/pages/Fiscal.tsx`:
    - Utilizar chamada HTTP direta:
      ```typescript
      const res = await fetch("/api/fiscal/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          recipient_email: targetEmail,
          company_id: currentCompanyId
        })
      });
      ```
    - Exibir toast de sucesso ou erro conforme o retorno da API.
  - No backend:
    - Retornar status 200 `{ success: true, message: "E-mail enfileirado/enviado com sucesso" }`.

### 2.3 Consistência de Status no Cancelamento de Notas Fiscais com a SEFAZ
- **Arquivos:** `src/pages/SalesHistory.tsx` e `src/services/fiscalApi.ts`
- **Componente:** `handleCancelSale` em `SalesHistory.tsx`
- **Comportamento Atual:**
  - Se a SEFAZ rejeitar o cancelamento da NF-e/NFC-e (ex: erro de prazo regulamentar expirado), o bloco `catch` loga um alerta no console e, logo a seguir, altera o status local da nota no Firestore para `"Cancelada"`.
- **Comportamento Especificado:**
  - Em `src/pages/SalesHistory.tsx`:
    - Se a chamada `fiscalApi.cancel` lançar erro ou rejeição da SEFAZ, **não atualizar o status da nota para "Cancelada"**.
    - Manter a nota com o status `"Emitida"`.
    - Apresentar alerta claro ao operador (toast ou modal informativo) informando a rejeição da SEFAZ e indicando que, devido ao prazo legal expirado, o procedimento fiscal correto é a emissão de uma Nota Fiscal de Devolução/Estorno.

---

## 3. Módulo Financeiro & Caixas

### 3.1 Histórico e Auditoria de Importação OFX
- **Arquivos:** `src/pages/BankReconciliation.tsx` e `src/components/Financial/OFXImporter.tsx`
- **Componente:** Modal `OFXImporter.tsx` e container "Últimas Importações" em `BankReconciliation.tsx`
- **Comportamento Atual:**
  - O importador processa as transações, mas não gera registro de lote na coleção `bank_imports`.
  - A seção "Últimas Importações" em `BankReconciliation.tsx` exibe mensagem estática de ausência de histórico.
- **Comportamento Especificado:**
  - Em `src/components/Financial/OFXImporter.tsx`:
    - Ao concluir a importação, registrar em `bank_imports`:
      ```typescript
      await api.post("bank_imports", {
        company_id: currentCompanyId,
        bank_account_id: bankAccountId,
        bank_account_name: bankAccountName,
        filename: file.name,
        total_transactions: transactions.length,
        reconciled_count: reconciledCount,
        ignored_count: ignoredCount,
        imported_at: new Date().toISOString(),
        imported_by_id: user?.id,
        imported_by_name: user?.full_name || user?.email,
        status: "Concluído"
      });
      ```
  - Em `src/pages/BankReconciliation.tsx`:
    - Consultar `bank_imports` via `useQuery` filtrado por `bank_account_id: selectedAccount.id`.
    - Renderizar os lotes importados exibindo: nome do arquivo, data/hora formatada, quantidade de transações e operador responsável.

### 3.2 Botão e Gatilho para Pagamento em Lote de Comissões
- **Arquivos:** `src/pages/CommissionPayouts.tsx`
- **Componente:** Barra de ações e modal `isConfirmBatchModalOpen`
- **Comportamento Atual:**
  - A mutação `batchPayoutMutation` está codificada e funcional, mas não existe botão na UI para dispará-la. O usuário precisa liquidar venda por venda.
- **Comportamento Especificado:**
  - Em `src/pages/CommissionPayouts.tsx`:
    - Inserir botão na barra superior de ações:
      ```tsx
      <button
        id="btn-batch-payout-trigger"
        onClick={() => setIsConfirmBatchModalOpen(true)}
        disabled={filteredSales.length === 0 || batchPayoutMutation.isPending}
        className="..."
      >
        Pagar Comissões Filtradas ({filteredSales.length})
      </button>
      ```
    - No modal de confirmação, exibir o total consolidado (`formatCurrency(totalPending)`) e acionar `batchPayoutMutation.mutate(filteredSales)` no clique de confirmação.

---

## 4. Governança Multi-Tenant & Configurações

### 4.1 Consistência de Empresa Ativa (`currentCompanyId`) em Serviços e Vendedores
- **Arquivos:** `src/pages/Services.tsx` e `src/pages/Sellers.tsx`
- **Componente:** Mutações de criação e atualização de registros
- **Comportamento Atual:**
  - Os formulários enviam `company_id: user?.company_id`, ignorando a empresa ativa selecionada via seletor global (`api.getCompanyId()`).
- **Comportamento Especificado:**
  - Substituir o uso de `user?.company_id` pela constante `const currentCompanyId = api.getCompanyId() || user?.company_id;` na montagem do payload de criação e edição tanto em `Services.tsx` quanto em `Sellers.tsx`.

### 4.2 Campos de Taxas de Cartão na Aba Pagamentos de Configurações
- **Arquivos:** `src/pages/Configurations.tsx` (Aba `payments`)
- **Componente:** Formulário da aba `payments`
- **Comportamento Atual:**
  - O subtítulo menciona *"Configure suas chaves PIX e taxas"*, mas o formulário contém apenas o campo de Chave PIX.
- **Comportamento Especificado:**
  - Inserir dois campos numéricos com sufixo `%`:
    - Taxa de Cartão de Crédito (`credit_card_rate`): `number`, percentual (ex: 2.99%).
    - Taxa de Cartão de Débito (`debit_card_rate`): `number`, percentual (ex: 1.49%).
  - Carregar os valores default a partir do documento `company` e salvar as alterações no `saveData` do formulário.
