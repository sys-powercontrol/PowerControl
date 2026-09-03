# Especificação Técnica de Finalizações do Sistema (Spec)

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Documento de Referência:** `analytics/report.md`  
**Escopo:** Especificação técnica detalhada estritamente do que falta finalizar e conectar no sistema (páginas, comportamentos e componentes), **sem introdução de novas funcionalidades ou escopos não solicitados**.

---

## 1. Roteamento & Navegação

### 1.1 Resolução do Conflito de Rota `/Categorias` e Acesso ao Centro de Custos
- **Página:** `src/App.tsx` e `src/components/Layout.tsx`
- **Componente:** `<Route>` e item de menu `Centro de Custos`
- **Comportamento Atual:**
  - `App.tsx` possui duas rotas com caminho `Categorias`:
    - Rota 1: `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />`
    - Rota 2: `<Route path="Categorias" element={<Categories />} />`
  - O item "Centro de Custos" no menu lateral aponta para `/Categorias`, resolvendo indevidamente na tela de produtos.
- **Comportamento Especificado:**
  - Em `src/App.tsx`:
    - Definir rota explícita para o Centro de Custos financeiro: `<Route path="CentroDeCustos" element={<Categories />} />`.
    - Manter `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />` para a gestão de categorias de produtos.
  - Em `src/components/Layout.tsx`:
    - Atualizar o link do menu "Centro de Custos" no submenu Financeiro para `path: "/CentroDeCustos"`.

### 1.2 Registro da Rota Órfã de Auditoria
- **Página:** `src/App.tsx` e `src/components/Layout.tsx`
- **Componente:** `src/pages/AuditLogs.tsx`
- **Comportamento Atual:**
  - O componente `AuditLogs.tsx` está pronto para uso mas sem rota configurada em `App.tsx` nem item de menu lateral.
- **Comportamento Especificado:**
  - Em `src/App.tsx`:
    - Adicionar a rota protegida: `<Route path="Auditoria" element={<AuditLogs />} />`.
  - Em `src/components/Layout.tsx`:
    - Adicionar o item "Auditoria" no menu de navegação, condicionado à permissão `audit.view`.

---

## 2. Módulo Fiscal & Certificado Digital

### 2.1 Sincronização da Validade do Certificado na Empresa Ativa
- **Página:** `src/pages/CertificateManager.tsx` e `src/pages/Fiscal.tsx`
- **Componente:** `CertificateManager.tsx`
- **Comportamento Atual:**
  - No upload do certificado A1 (.pfx), a validade é extraída e salva na coleção `certificates`, mas o documento da empresa ativa (`companies/{id}`) não é atualizado com `fiscal_certificate_expiration` e `has_certificate: true`.
  - A tela `Fiscal.tsx` consulta o documento da empresa para os alertas e continua acusando falta de certificado.
- **Comportamento Especificado:**
  - Em `src/pages/CertificateManager.tsx`:
    - Após salvar o registro do certificado, atualizar a empresa ativa:
      ```typescript
      await api.put("companies", currentCompanyId, {
        fiscal_certificate_expiration: certData.expiration_date,
        certificate_expiration: certData.expiration_date,
        has_certificate: true,
        updated_at: new Date().toISOString()
      });
      ```
    - Invalidar as queries `["company", currentCompanyId]` e `["companies"]`.

### 2.2 Disparo HTTP de E-mail de Nota Fiscal
- **Página:** `src/pages/Fiscal.tsx` e `src/serverApp.ts`
- **Componente:** Modal de envio de e-mail fiscal
- **Comportamento Atual:**
  - A função `handleSendEmail` faz `api.post("fiscal/send-email", ...)` em coleção do Firestore em vez de requisição HTTP à rota do Express.
- **Comportamento Especificado:**
  - Em `src/pages/Fiscal.tsx`:
    - Acionar `fetch("/api/fiscal/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id, recipient_email, company_id }) })`.
    - Apresentar feedback com toast de sucesso ou erro.
  - No backend Express (`src/serverApp.ts`):
    - Validar o payload e retornar `{ status: "ok", success: true, message: "..." }`.

### 2.3 Consistência de Status no Cancelamento de Notas Fiscais com a SEFAZ
- **Página:** `src/pages/SalesHistory.tsx`
- **Componente:** `cancelSaleMutation` e `deleteSaleMutation`
- **Comportamento Atual:**
  - Caso a SEFAZ rejeite o cancelamento de uma nota emitida (ex: prazo regulamentar expirado), o sistema marcava localmente a nota como "Cancelada", criando divergência cadastral com o fisco.
- **Comportamento Especificado:**
  - Em `src/pages/SalesHistory.tsx`:
    - Quando o cancelamento na SEFAZ for rejeitado ou falhar, **manter a nota fiscal com status `"Emitida"`**.
    - Registrar os detalhes da rejeição nos metadados da nota e alertar o usuário para a emissão de Nota de Devolução/Estorno.
    - Bloquear a exclusão direta de vendas que possuam nota fiscal homologada ativa (`nfe_status === "Emitida"`).

---

## 3. Módulo Financeiro & Caixas

### 3.1 Histórico e Auditoria de Importação OFX
- **Página:** `src/pages/BankReconciliation.tsx` e `src/components/Financial/OFXImporter.tsx`
- **Componente:** Card "Últimas Importações OFX" e finalização do `OFXImporter`
- **Comportamento Atual:**
  - O importador OFX processa o arquivo mas não grava o registro de auditoria na coleção `bank_imports`. O card na tela de conciliação exibe apenas texto estático de indisponibilidade.
- **Comportamento Especificado:**
  - Em `src/components/Financial/OFXImporter.tsx`:
    - Gravar na coleção `bank_imports` o lote com: nome do arquivo, total de transações, contagem de conciliações, data/hora e operador.
    - Invalidar a query `["bank_imports"]`.
  - Em `src/pages/BankReconciliation.tsx`:
    - Carregar e exibir reativamente a lista de lotes importados para a conta bancária selecionada.

---

## 4. Módulo de Vendas & Comissões

### 4.1 Gatilho Visual e Baixa em Lote de Comissões
- **Página:** `src/pages/CommissionPayouts.tsx`
- **Componente:** Barra de ações superiores e modal `isConfirmBatchModalOpen`
- **Comportamento Atual:**
  - A mutação `batchPayoutMutation` existe e funciona, mas não há botão nem trigger visual na interface para disparar o pagamento em lote das comissões filtradas.
- **Comportamento Especificado:**
  - Em `src/pages/CommissionPayouts.tsx`:
    - Renderizar botão "Pagar Comissões Filtradas" com `id="btn-batch-payout-trigger"`.
    - Desabilitar se não houver vendas pendentes filtradas ou durante a execução da mutação.
    - Conectar a confirmação do modal à execução de `batchPayoutMutation.mutate(filteredSales)`.

---

## 5. Governança Multi-Tenant

### 5.1 Isolamento de Empresa Ativa em Serviços e Vendedores
- **Página:** `src/pages/Services.tsx` e `src/pages/Sellers.tsx`
- **Componente:** `serviceMutation` e `sellerMutation`
- **Comportamento Atual:**
  - Os formulários utilizam `company_id: user?.company_id`, ignorando a troca de filial/empresa ativa feita no cabeçalho por usuários administradores/master.
- **Comportamento Especificado:**
  - Obter `currentCompanyId = api.getCompanyId() || user?.company_id` e utilizá-lo nas gravações de novos serviços e vendedores, assegurando o isolamento dos dados por empresa.

---

## 6. Configurações & Parametrização

### 6.1 Taxas de Cartão de Crédito e Débito na Aba Pagamentos
- **Página:** `src/pages/Configurations.tsx`
- **Componente:** Aba `payments`
- **Comportamento Atual:**
  - A aba exibe apenas a chave PIX, sem permitir configurar as taxas percentuais de cartão de crédito e débito previstas nas operações da empresa.
- **Comportamento Especificado:**
  - Adicionar inputs numéricos para `credit_card_rate` e `debit_card_rate`.
  - Vincular esses campos à gravação do documento da empresa (`companies/{id}`) e preencher os valores padrão ao carregar a página.
