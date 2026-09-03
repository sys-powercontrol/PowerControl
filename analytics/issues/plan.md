# Plano de Implementação das Issues (Plan) — [CONCLUÍDO]

**Data e Hora de Geração Inicial:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data e Hora de Conclusão da Execução:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Documento de Referência:** `analytics/Spec.md` e `/analytics/issues/`  
**Status Geral:** **100% Concluído e Validado (Lint e Compilação OK)**

---

## 1. Visão Geral e Ordem de Execução

Todas as issues foram executadas e verificadas de ponta a ponta sem introdução de escopos não solicitados:

```
[Onda 1: Fiscal e Integridade de Dados] — [CONCLUÍDO]
  ├── [x] ISSUE-04: Consistência de Cancelamento de Notas SEFAZ
  └── [x] ISSUE-02: Sincronização de Validade do Certificado Digital

[Onda 2: Roteamento e Isolamento Multi-Tenant] — [CONCLUÍDO]
  ├── [x] ISSUE-01: Resolução de Rota /Categorias e /Auditoria
  └── [x] ISSUE-07: Consistência Multi-Tenant em Serviços e Vendedores

[Onda 3: Ações e Automação Operacional] — [CONCLUÍDO]
  ├── [x] ISSUE-06: Pagamento em Lote de Comissões
  └── [x] ISSUE-05: Histórico e Auditoria de Importação OFX

[Onda 4: Parametrização e Integração HTTP] — [CONCLUÍDO]
  ├── [x] ISSUE-08: Taxas de Cartão na Aba de Pagamentos
  └── [x] ISSUE-03: Disparo HTTP de E-mail de Nota Fiscal
```

---

## 2. Detalhamento e Status por Issue

### Onda 1: Fiscal e Integridade de Dados — [x] CONCLUÍDO

#### [x] ISSUE-04: Consistência de Status no Cancelamento de Notas com SEFAZ
- **Arquivos verificados:** `src/pages/SalesHistory.tsx`
- **Diagnóstico e Execução:**
  - [x] Em `cancelSaleMutation`, caso a SEFAZ rejeite o cancelamento (ou expire o prazo de 24h para NF-e / 30min para NFC-e), o status da nota é **estritamente mantido como `"Emitida"`** (`status: "Emitida"`), com auditoria de `fiscal_cancel_attempted: true` e registro da justificativa em `fiscal_cancel_error`.
  - [x] Toast e modal de aviso informam ao operador que a nota permaneceu emitida e instruem sobre a emissão obrigatória de Nota Fiscal de Devolução/Estorno.
  - [x] Em `deleteSaleMutation`, há bloqueio explícito impedindo a exclusão de vendas com notas fiscais com status `"Emitida"`.
- **Status:** **[x] Concluído**

#### [x] ISSUE-02: Sincronização de Validade do Certificado na Empresa
- **Arquivos verificados:** `src/pages/CertificateManager.tsx`
- **Diagnóstico e Execução:**
  - [x] No upload do certificado A1 (.pfx), após extrair a validade via `node-forge`, os campos `fiscal_certificate_expiration`, `certificate_expiration` e `has_certificate: true` são gravados de forma atômica no documento da empresa ativa (`companies/{currentCompanyId}`).
  - [x] Invalidação reativa imediata das chaves `["company", currentCompanyId]`, `["companies"]` e `["certificates"]`.
  - [x] No cancelamento/exclusão de certificado ativo, o sistema promove o próximo certificado ou reseta `has_certificate: false`.
- **Status:** **[x] Concluído**

---

### Onda 2: Roteamento e Isolamento Multi-Tenant — [x] CONCLUÍDO

#### [x] ISSUE-01: Conflito de Rota `/Categorias` e Inclusão de `/Auditoria`
- **Arquivos verificados:** `src/App.tsx` e `src/components/Layout.tsx`
- **Diagnóstico e Execução:**
  - [x] Em `src/App.tsx`, rota do Centro de Custos configurada para `path="CentroDeCustos"` apontando para `<Categories />`, preservando `path="Categorias"` para `<Products defaultTab="Categorias" />`.
  - [x] Em `src/App.tsx`, rota `<Route path="Auditoria" element={<AuditLogs />} />` devidamente registrada.
  - [x] Em `src/components/Layout.tsx`, link de "Centro de Custos" no submenu financeiro configurado para `/CentroDeCustos`.
  - [x] Em `src/components/Layout.tsx`, item "Auditoria" incluído no menu lateral sob a permissão `audit.view`.
- **Status:** **[x] Concluído**

#### [x] ISSUE-07: Consistência Multi-Tenant em Serviços e Vendedores
- **Arquivos verificados:** `src/pages/Services.tsx` e `src/pages/Sellers.tsx`
- **Diagnóstico e Execução:**
  - [x] Em `Services.tsx`, `serviceMutation` utiliza `activeCompanyId = currentCompanyId || user?.company_id`, onde `currentCompanyId = api.getCompanyId() || user?.company_id`.
  - [x] Em `Sellers.tsx`, `sellerMutation` utiliza `activeCompanyId = currentCompanyId || user?.company_id`.
  - [x] Ambas as telas respeitam a empresa selecionada no cabeçalho global, mantendo o isolamento multi-tenant.
- **Status:** **[x] Concluído**

---

### Onda 3: Ações e Automação Operacional — [x] CONCLUÍDO

#### [x] ISSUE-06: Botão e Gatilho para Pagamento em Lote de Comissões
- **Arquivos verificados:** `src/pages/CommissionPayouts.tsx`
- **Diagnóstico e Execução:**
  - [x] Botão "Pagar Todas as Comissões Filtradas" inserido na barra de ações superiores com `id="btn-batch-payout-trigger"`.
  - [x] Desabilitado dinamicamente quando `filteredSales.length === 0` ou durante `batchPayoutMutation.isPending`.
  - [x] Modal de confirmação (`isConfirmBatchModalOpen`) exibe quantidade de vendas e montante total formatado, disparando `batchPayoutMutation.mutate(filteredSales)`.
- **Status:** **[x] Concluído**

#### [x] ISSUE-05: Histórico e Auditoria de Importação OFX
- **Arquivos verificados:** `src/components/Financial/OFXImporter.tsx` e `src/pages/BankReconciliation.tsx`
- **Diagnóstico e Execução:**
  - [x] Ao concluir a conciliação em `OFXImporter.tsx`, um registro de lote é gravado na coleção `bank_imports` com nome do arquivo, contagem de transações, conciliadas, data/hora e operador.
  - [x] Invalidação reativa da query `["bank_imports"]`.
  - [x] Em `BankReconciliation.tsx`, query reativa carrega os lotes por `bank_account_id` e renderiza a tabela de "Últimas Importações OFX" com badge de contagem de lotes.
- **Status:** **[x] Concluído**

---

### Onda 4: Parametrização e Integração HTTP — [x] CONCLUÍDO

#### [x] ISSUE-08: Campos de Taxas de Cartão na Aba de Pagamentos
- **Arquivos verificados:** `src/pages/Configurations.tsx`
- **Diagnóstico e Execução:**
  - [x] Na aba `payments`, adicionados inputs numéricos com `step="0.01"` para `credit_card_rate` (Taxa Cartão de Crédito %) e `debit_card_rate` (Taxa Cartão de Débito %).
  - [x] Valores persistidos e convertidos para número no documento `companies/{companyId}` e carregados no estado inicial da tela.
- **Status:** **[x] Concluído**

#### [x] ISSUE-03: Disparo HTTP de E-mail de Nota Fiscal
- **Arquivos verificados:** `src/pages/Fiscal.tsx` e `src/serverApp.ts`
- **Diagnóstico e Execução:**
  - [x] Em `Fiscal.tsx`, `handleSendEmail` dispara requisição POST via `fetch("/api/fiscal/send-email")` com `invoice_id`, `recipient_email` e `company_id`.
  - [x] No backend Express (`src/serverApp.ts`), rota `POST /api/fiscal/send-email` valida os parâmetros, consulta a nota fiscal no Firestore e responde com status 200 e mensagem de sucesso.
  - [x] Feedback exibido ao operador via Sonner Toast.
- **Status:** **[x] Concluído**

---

## 3. Critérios de Validação e Portões de Aceite — [x] CONCLUÍDO

- [x] **Lint:** `npm run lint` (`eslint` + `tsc --noEmit`) executado com sucesso (zero erros e zero avisos).
- [x] **Build:** `compile_applet` (`vite build` + `esbuild`) compilou cliente e servidor com sucesso total.
- [x] **Escopo Estrito:** Nenhuma tela, menu ou biblioteca fora das 8 issues foi adicionada.
