# Relatório de Análise Geral do Sistema — Pendências de Finalização

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Objetivo:** Mapeamento consolidado das implementações e amarrações de consistência pendentes no sistema, **estritamente sem inclusão de novas funcionalidades ou escopos não solicitados**.

---

## 1. Sumário Executivo

A auditoria geral da aplicação avaliou os fluxos operacionais de ponta a ponta do ERP PowerControl:
- **Navegação & Roteamento:** Consistência de rotas no `App.tsx` e submenus em `Layout.tsx`.
- **Fiscal:** Ciclo de emissão de NF-e/NFC-e, gestão de certificado digital A1 (.pfx), cancelamento SEFAZ e envio de notas fiscais por e-mail.
- **Financeiro & Caixas:** Abertura, fechamento e quebra de caixa, conciliação bancária OFX e histórico de lotes importados, liquidação de comissões em lote.
- **Vendas & Estoque:** Consistência de status em cancelamentos com notas vinculadas, histórico de estoque e integridade transacional.
- **Governança Multi-Tenant & Acessos:** Isolamento correto por `currentCompanyId` em cadastros, integridade entre filiais e matriz.
- **Configurações & Pagamentos:** Completude dos formulários existentes para parametrização de taxas de meios de pagamento.

Foram catalogadas **8 (oito) pendências técnicas de finalização** — componentes existentes com fluxos incompletos, rotas conflitantes/órfãs, mutações codificadas sem trigger na UI ou divergências de dados entre módulos.

---

## 2. Levantamento Detalhado das Finalizações Pendentes

### 2.1 Roteamento: Conflito de Rota `/Categorias` e Página Órfã de Auditoria
- **Arquivos:** `src/App.tsx` e `src/components/Layout.tsx`
- **Diagnóstico:**
  1. Em `src/App.tsx`, existiam duas rotas declaradas para `/Categorias`: uma para categorias de produtos e outra para o Centro de Custos financeiro (`Categories.tsx`). No menu lateral (`Layout.tsx`), o link "Centro de Custos" colidia com a tela de produtos.
  2. O componente `src/pages/AuditLogs.tsx` (auditoria detalhada de operações do sistema) estava implementado mas órfão de rota direta e sem item de menu visível para operadores autorizados.
- **O que falta finalizar:**
  - Desambiguar e consolidar a rota `/CentroDeCustos` apontando para `Categories.tsx`, preservando `/Categorias` para produtos.
  - Mapear o link do submenu financeiro para `/CentroDeCustos`.
  - Registrar a rota `/Auditoria` no `App.tsx` e expor no menu com a permissão `audit.view`.

---

### 2.2 Fiscal: Sincronização de Expiração do Certificado Digital
- **Arquivos:** `src/pages/CertificateManager.tsx` e `src/pages/Fiscal.tsx`
- **Diagnóstico:**
  No upload de certificado digital A1 (.pfx), a validade era extraída via `node-forge` e salva na coleção `certificates`. Porém, o documento principal da empresa ativa (`companies/{id}`) não recebia a atualização dos campos `fiscal_certificate_expiration` e `has_certificate: true`. Isso fazia com que a tela de Notas Fiscais continuasse exibindo avisos de certificado inexistente ou vencido.
- **O que falta finalizar:**
  - Garantir a atualização atômica de `fiscal_certificate_expiration`, `certificate_expiration` e `has_certificate: true` no documento da empresa ativa ao carregar o certificado.
  - Invalidar as queries de cache da empresa para reflexão imediata dos alertas no módulo fiscal.

---

### 2.3 Fiscal: Disparo de E-mail de Nota Fiscal
- **Arquivos:** `src/pages/Fiscal.tsx` e `src/serverApp.ts`
- **Diagnóstico:**
  No modal de envio de e-mail de `Fiscal.tsx`, o envio utilizava `api.post("fiscal/send-email", ...)` apontando para coleção do Firestore, enquanto o servidor Express dispõe do endpoint HTTP `/api/fiscal/send-email`.
- **O que falta finalizar:**
  - Conectar o envio à rota HTTP `/api/fiscal/send-email` via `fetch`, repassando `invoice_id`, `recipient_email` e `company_id`.
  - Responder no backend Express com validação de payload e status `{ status: "ok", success: true, message: "..." }`.

---

### 2.4 Fiscal & Vendas: Consistência no Cancelamento de Notas com SEFAZ
- **Arquivos:** `src/pages/SalesHistory.tsx` e `src/services/fiscalApi.ts`
- **Diagnóstico:**
  Ao cancelar uma venda que possua nota fiscal homologada perante a SEFAZ, caso o cancelamento seja recusado pelo fisco (por decurso do prazo regulamentar de 24h para NF-e ou 30min para NFC-e), o sistema não pode forçar o status da nota para "Cancelada" no ERP, pois perante a Receita a nota permanece ativa.
- **O que falta finalizar:**
  - Manter o status da nota fiscal estritamente como `"Emitida"` quando a SEFAZ rejeitar o cancelamento.
  - Exibir alerta instrutivo ao operador informando a rejeição e indicando a necessidade de emissão de Nota Fiscal de Devolução/Estorno.
  - Impedir a exclusão direta de vendas que possuam notas fiscais emitidas ativas.

---

### 2.5 Financeiro: Histórico e Auditoria de Importação OFX
- **Arquivos:** `src/pages/BankReconciliation.tsx` e `src/components/Financial/OFXImporter.tsx`
- **Diagnóstico:**
  O modal `OFXImporter.tsx` realiza a conciliação das transações do arquivo OFX, mas não persistia o lote importado na coleção `bank_imports`. Na tela `BankReconciliation.tsx`, o card "Últimas Importações OFX" exibia apenas texto fixo de histórico indisponível.
- **O que falta finalizar:**
  - Gravar os metadados do lote importado em `bank_imports` (nome do arquivo, quantidade de transações, conciliadas, ignoradas, data/hora e operador) ao finalizar a conciliação.
  - Conectar a listagem reativa de lotes em `BankReconciliation.tsx` filtrando por conta bancária.

---

### 2.6 Vendas: Acionamento do Pagamento em Lote de Comissões
- **Arquivos:** `src/pages/CommissionPayouts.tsx`
- **Diagnóstico:**
  O componente `CommissionPayouts.tsx` continha a mutação `batchPayoutMutation` implementada com estorno e lançamentos em Contas a Pagar, mas faltava o botão e identificador de trigger visual na interface para pagamento das comissões filtradas.
- **O que falta finalizar:**
  - Adicionar o botão "Pagar Comissões Filtradas" (`id="btn-batch-payout-trigger"`) na barra de ações superiores.
  - Vincular o acionamento ao modal de confirmação e à mutação `batchPayoutMutation`.

---

### 2.7 Governança Multi-Tenant: Isolamento em Serviços e Vendedores
- **Arquivos:** `src/pages/Services.tsx` e `src/pages/Sellers.tsx`
- **Diagnóstico:**
  Nas mutações de cadastro de serviços e vendedores, era utilizado `company_id: user?.company_id`. Para usuários administradores ou master que alternam a empresa ativa no topo do ERP, os dados eram vinculados incorretamente à matriz em vez da filial selecionada.
- **O que falta finalizar:**
  - Utilizar a empresa ativa `currentCompanyId = api.getCompanyId() || user?.company_id` nos formulários de cadastro e alteração de serviços e vendedores.

---

### 2.8 Configurações: Taxas de Cartão de Crédito e Débito na Aba Pagamentos
- **Arquivos:** `src/pages/Configurations.tsx` (Aba `payments`)
- **Diagnóstico:**
  A aba "Pagamentos" continha apenas a configuração de chave PIX, ausentando os campos para Taxa de Cartão de Crédito (%) e Taxa de Cartão de Débito (%), necessários para a parametrização de despesas de meios de pagamento no checkout e conciliação.
- **O que falta finalizar:**
  - Disponibilizar inputs numéricos para `credit_card_rate` e `debit_card_rate` na aba Pagamentos.
  - Persistir e carregar essas taxas no documento `companies/{id}`.

---

## 3. Matriz de Prioridade Técnica

| Prioridade | Módulo | Pendência Identificada | Impacto da Finalização |
| :--- | :--- | :--- | :--- |
| **Crítica** | Fiscal / Vendas | Consistência de cancelamento fiscal de venda | Impede inconsistência legal e passivo tributário com a SEFAZ |
| **Crítica** | Fiscal | Sincronização de validade do certificado na empresa | Desbloqueia emissão e status correto de certificados no módulo fiscal |
| **Alta** | Roteamento | Conflito `/Categorias` e rota de `/Auditoria` | Restaura acesso ao Centro de Custos e habilita página de auditoria |
| **Alta** | Governança | Correção multi-tenant em Serviços e Vendedores | Evita contaminação de dados entre empresas distintas |
| **Média** | Financeiro | Histórico e auditoria de importação OFX | Fornece rastreabilidade real aos lotes de extratos bancários |
| **Média** | Vendas | Acionamento de pagamento de comissões em lote | Elimina esforço operacional repetitivo do gestor |
| **Baixa** | Fiscal | Disparo HTTP de e-mail de nota fiscal | Conecta frontend ao backend Express para envio de notas |
| **Baixa** | Configurações | Inclusão de taxas de cartão na aba de pagamentos | Completa formulário previsto na interface do ERP |

---

## 4. Próximas Etapas no Ciclo de Análise

1. **Especificação Técnica:** `/analytics/Spec.md` detalhando cada página, comportamento e componente a finalizar.
2. **Desmembramento em Issues:** Pasta `/analytics/issues/` com arquivos atômicos por pendência.
3. **Plano de Implementação:** `/analytics/issues/plan.md` estruturando a ordem de execução sem implementar.
