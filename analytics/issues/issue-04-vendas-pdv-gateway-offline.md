# Issue 04 - Finalização do Módulo de Vendas, PDV e Gateway de Pagamentos

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Vendas & PDV  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.4  
**Criticidade:** Alta  

---

## 1. Descrição do Problema
O PDV conta com interface de atendimento rápido, modal de gateway para PIX/Cartão e fila de contingência offline. É necessário finalizar a rotina de polling para fechamento automático da venda após liquidação do PIX, o cancelamento completo de vendas no histórico (com estoque, financeiro e comissões) e a purga dos registros locais após sincronização offline bem-sucedida.

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Polling e Conclusão Automática do Pagamento PIX
- **Arquivos:** `src/components/Sales/PaymentGateway.tsx`, `src/pages/Sales.tsx`
- **Ação:**
  1. Durante a exibição do QR Code PIX no modal, executar checagens periódicas de status do pagamento.
  2. Ao detectar confirmação de pagamento (`status === 'paid'`), fechar o modal automaticamente e acionar a finalização da venda no PDV.

### 2.2. Cancelamento Integrado no Histórico de Vendas
- **Arquivos:** `src/pages/SalesHistory.tsx`
- **Ação:**
  1. Ao cancelar uma venda, executar a reversão completa:
     - Devolução dos produtos e componentes da BOM para o estoque da empresa.
     - Cancelamento dos títulos no Contas a Receber vinculados à venda.
     - Cancelamento do registro de comissão gerado para o vendedor.
     - Atualização do status da venda para `cancelada`.

### 2.3. Saneamento e Purga da Fila de Contingência Offline
- **Arquivos:** `src/lib/offlineStore.ts`
- **Ação:**
  1. Ao restabelecer conexão e persistir com sucesso uma venda no Firestore, remover imediatamente o item da fila local (IndexedDB/localStorage).
  2. Atualizar o contador de pendências offline na barra de status.

---

## 3. Critérios de Aceite
- [ ] Confirmação de PIX fecha o modal e finaliza a venda sem necessidade de clique manual.
- [ ] Cancelamento no histórico reverte estoque, financeiro e comissão simultaneamente.
- [ ] Vendas sincronizadas não permanecem na fila offline local.
