# Issue 01 - Finalização do Módulo Fiscal e Documentos Eletrônicos (NFe / NFCe)

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Fiscal & Documentos Eletrônicos  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.1  
**Criticidade:** Alta  

---

## 1. Descrição do Problema
As rotinas de emissão de NFe/NFCe, visualização de DANFE e painel de regras tributárias estão disponíveis na interface, porém faltam ajustes para garantir a sincronização imediata de status quando ocorre cancelamento ou inutilização na SEFAZ, o fallback de busca de XMLs para download em lote e a validação preventiva do certificado A1.

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Sincronização de Cancelamento e Inutilização com a Venda
- **Arquivo:** `src/pages/Fiscal.tsx`, `src/components/Fiscal/InutilizacaoModal.tsx`
- **Ação:**
  1. Ao receber a resposta positiva de cancelamento/inutilização da SEFAZ, executar a atualização síncrona na coleção `invoices` (`status: 'Cancelada'`, `protocol_cancelamento`, `cancel_reason`, `canceled_at`).
  2. Atualizar o documento da venda associada em `sales` (`nfe_status: 'Cancelada'`).

### 2.2. Exportação de XMLs em Lote com Fallback
- **Arquivo:** `src/pages/Fiscal.tsx`
- **Ação:**
  1. Na rotina de download de XMLs em lote em formato `.zip`, verificar se o campo `xml_content` está preenchido no objeto da nota fiscal.
  2. Se ausente, invocar a API fiscal para recuperar o XML antes de empacotar no arquivo compactado.

### 2.3. Validação Preventiva de Certificado Digital A1
- **Arquivo:** `src/pages/Fiscal.tsx`, `src/pages/CertificateManager.tsx`
- **Ação:**
  1. Antes de iniciar qualquer transmissão de documento fiscal, validar se existe certificado ativo e se a data de validade (`valid_until`) não está expirada.
  2. Caso o certificado esteja ausente ou vencido, exibir aviso impeditivo antes de realizar requisições externas desnecessárias.

### 2.4. Mapeamento Dinâmico de Tributos nos Itens da Nota
- **Arquivo:** `src/lib/fiscal.ts`
- **Ação:**
  1. Assegurar que os tributos definidos nas regras fiscais (`tax_rules`) como ICMS, IPI, PIS, COFINS, CFOP, NCM e CST/CSOSN sejam corretamente injetados no payload dos itens da NFe.

---

## 3. Critérios de Aceite
- [ ] O cancelamento de uma NFe atualiza o status em `invoices` e `sales` simultaneamente.
- [ ] A exportação de XMLs em lote não falha caso alguma nota esteja sem o cache local de XML.
- [ ] Tentativa de emissão com certificado vencido ou ausente apresenta feedback claro e bloqueia a transmissão.
- [ ] Payload da NFe transporta as alíquotas tributárias corretas por item.
