# Relatório de Análise Geral do Sistema - Finalizações Pendentes

**Data e Hora de Geração:** 29 de Agosto de 2026 às 16:18:38 (Horário de Brasília - UTC-3)  
**Escopo:** Mapeamento exclusivo de finalizações, amarrações de integridade e consistência de dados dos módulos existentes (SEM inclusão de novas funcionalidades ou escopos não solicitados).

---

## 1. Visão Executiva e Diagnóstico Geral da Arquitetura

O sistema **PowerControl ERP & PDV** apresenta uma base técnica com frontend em React 18+ (Vite, TypeScript, Tailwind CSS), backend Express/Node, banco de dados Cloud Firestore e contingência local PWA/IndexedDB (`idb`).

A análise do código-fonte revelou que a arquitetura geral e as rotas estão estruturadas, porém existem pontos específicos onde fluxos transacionais, estornos em cascata, sincronizações de status e validações de integridade precisam ser finalizados para garantir estabilidade operacional e contábil.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MATRIZ DE FINALIZAÇÕES POR MÓDULO                     │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ 1. Módulo Fiscal         │ • Cancelamento em cascata (SEFAZ/Invoice/Venda)  │
│    (NFe / NFCe / Regras) │ • Exportação mensal ZIP com fallback remoto      │
│                          │ • Alerta preventivo de validade do Certificado A1│
│                          │ • Log de auditoria nas mutações de regras fiscais│
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Módulo Financeiro     │ • Estorno atômico de liquidações (Caixa/Banco)   │
│    (Pagar / Receber / OFX│ • Bloqueio de exclusão em títulos baixados       │
│                          │ • Deduplicação de lançamentos OFX via FITID      │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 3. Módulo de Estoque     │ • Dedução/devolução recursiva de insumos BOM     │
│    (BOM / Transferência) │ • Transferência atômica entre filiais e depósitos│
│                          │ • Enforcement da trava de estoque negativo       │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Vendas e PDV          │ • Ciclo de polling e aprovação de PIX no Gateway │
│    (Gateway / Histórico) │ • Cancelamento integrado de vendas e parcelas    │
│                          │ • Purga e sincronização segura da fila offline   │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 5. Usuários & Empresas   │ • Desvinculação atômica de filiais (Employees)   │
│    (Equipe / Planos)     │ • Camada prioritária e foco na UpgradePlanModal  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 6. Suporte e Auditoria   │ • Modal Lightbox e download de anexos no Suporte │
│    (Chamados / Logs)     │ • Rastreabilidade automática em api.delete()     │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 2. Levantamento Detalhado por Módulo

### 2.1. Módulo Fiscal e Tributário (`src/pages/Fiscal.tsx`, `src/pages/TaxSettings.tsx`, `src/pages/CertificateManager.tsx`, `src/services/fiscalApi.ts`)
1. **Cancelamento em Cascata da Nota Fiscal:**
   - Ao executar o cancelamento de uma NF-e/NFC-e na SEFAZ via `fiscalApi.cancel()`, o sistema deve garantir que o status em `invoices/{id}` seja alterado para `"Cancelada"`, salvando a justificativa e o protocolo retornado.
   - De forma síncrona, a venda atrelada (`sales/{sale_id}`) deve ter o status fiscal (`nfe_status`) atualizado para `"Cancelada"`.
2. **Exportação Mensal de XMLs em Lote (.zip):**
   - Na rotina de exportação mensal em `Fiscal.tsx`, quando uma nota emitida não possui `xml_content` em cache local, deve-se realizar a busca remota pelo status/URL e incluir o arquivo XML no pacote compactado (`JSZip`).
3. **Alerta Preventivo de Vencimento do Certificado A1:**
   - Em `CertificateManager.tsx` e no cabeçalho do `Fiscal.tsx`, validar a data de expiração (`expiration_date`). Se o certificado estiver vencido ou com menos de 15 dias de validade, exibir avisos visuais claros para prevenir rejeições na SEFAZ.
4. **Auditoria de Regras Fiscais:**
   - Em `TaxSettings.tsx`, registrar chamadas a `api.log()` nas operações de criação, edição e exclusão de regras tributárias por NCM.

---

### 2.2. Módulo Financeiro e Conciliação Bancária (`src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/components/Financial/OFXImporter.tsx`, `src/lib/finance.ts`)
1. **Estorno Atômico de Baixas Financeiras:**
   - No estorno de recebimentos ou pagamentos, executar `reverseAccountReceipt` e `reverseAccountPayment` de forma transacional, revertendo os saldos da conta bancária (`bankAccounts`) ou caixa físico (`cashiers`), gerando o movimento de estorno e restaurando o status para `"Pendente"`.
2. **Bloqueio de Exclusão de Títulos Baixados:**
   - Impedir a remoção direta de títulos com status `"Recebido"` ou `"Pago"`. O botão de exclusão deve ficar desabilitado ou interceptado com mensagem explicativa exigindo o estorno prévio do saldo.
3. **Deduplicação de Extratos OFX por FITID:**
   - No `OFXImporter.tsx`, cruzar o identificador único `<FITID>` de cada lançamento com os registros já gravados em `accountsPayable` e `accountsReceivable` (`ofx_fitid`), desmarcando automaticamente itens já importados.

---

### 2.3. Módulo de Estoque, Composição (BOM) e Transferências (`src/lib/inventory.ts`, `src/pages/Transfers.tsx`, `src/pages/InventoryAdjustments.tsx`)
1. **Dedução e Devolução Recursiva de Ficha Técnica (BOM):**
   - Nas vendas com produtos do tipo Kit/Composto (`bom_items`), garantir a baixa individual no estoque de cada insumo.
   - No cancelamento de vendas (`reverseSaleStock`), devolver ao estoque todos os componentes que foram deduzidos.
2. **Transferência Atômica Entre Filiais/Locais:**
   - Em `inventory.processTransfer`, garantir execução via `runTransaction`, subtraindo o estoque da origem, somando no destino e gerando as movimentações `TRANSFER_OUT` e `TRANSFER_IN`.
3. **Enforcement da Trava de Estoque Negativo:**
   - Respeitar a configuração `allow_negative_stock` da empresa no PDV, ajustes manuais e transferências, impedindo transações com saldo insuficiente quando a trava estiver ativa.

---

### 2.4. Módulo de Vendas, PDV e Contingência Offline (`src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/components/Sales/PaymentGateway.tsx`, `src/lib/offlineStore.ts`)
1. **Ciclo Completo do Gateway PIX:**
   - Em `PaymentGateway.tsx`, manter o polling a cada 4 segundos em `/api/payments/status/:id`. Ao identificar confirmação (`CONFIRMED`, `APPROVED`, `PAID`), fechar a modal e acionar `onSuccess` para gravar a venda.
2. **Cancelamento Integrado de Venda:**
   - Em `SalesHistory.tsx`, a rotina de cancelamento deve: reverter o estoque (produtos simples e insumos BOM), cancelar títulos gerados em contas a receber, anular comissões do vendedor e registrar o log de auditoria.
3. **Sincronização e Purga da Fila Offline:**
   - Em `offlineStore.ts`, ao detectar reconexão e sincronizar as vendas com o Firestore, purgar imediatamente do IndexedDB cada registro concluído para eliminar duplicidades.

---

### 2.5. Usuários, Multi-Empresa e Limites de Planos (`src/pages/Employees.tsx`, `src/components/UpgradePlanModal.tsx`, `src/pages/Company.tsx`)
1. **Desvinculação Segura de Filiais:**
   - Em `Employees.tsx`, ao remover o vínculo de um funcionário com a empresa, atualizar o documento em `employees` e remover o `company_id` do array `company_ids` em `users/{userId}` via `writeBatch`.
2. **Camada Prioritária da Modal de Upgrade:**
   - Em `UpgradePlanModal.tsx`, assegurar que o container possua `z-[999999]` e bloqueio de scroll de fundo para exibição clara quando limites de plano forem atingidos.

---

### 2.6. Módulo de Suporte Técnico e Auditoria (`src/pages/Support.tsx`, `src/pages/AuditLogs.tsx`, `src/lib/api.ts`)
1. **Lightbox de Anexos no Suporte:**
   - Em `Support.tsx`, permitir a abertura em tela cheia (lightbox) e download direto de imagens ou capturas de tela anexadas aos chamados.
2. **Rastreabilidade de Exclusões:**
   - Em `src/lib/api.ts`, garantir que `api.delete()` registre automaticamente a ação `DELETE` na coleção `audit_logs`, preservando o histórico de exclusões.

---

## 3. Conclusão e Próximos Passos

O diagnóstico confirma que não há necessidade de inclusão de novas páginas ou arquiteturas. O foco restringe-se estritamente à finalização dos fluxos e comportamentos listados, conforme detalhado no documento `analytics/Spec.md` e dividido nas issues de `/analytics/issues/`.
