# ISSUE-06: Botão e Gatilho para Pagamento em Lote de Comissões — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Vendas / Comissões  
**Prioridade:** Média  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Em `src/pages/CommissionPayouts.tsx`, existia a mutação `batchPayoutMutation` com a lógica para liquidar em lote comissões filtradas e lançar registros no Contas a Pagar.
- No entanto, não havia um botão acessível na barra de ações da interface para que o usuário pudesse acionar a operação em lote.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/CommissionPayouts.tsx`:**
  - [x] Adicionado o botão "Pagar Todas as Comissões Filtradas" na barra de ações superiores com identificador `id="btn-batch-payout-trigger"`.
  - [x] Conectada a confirmação do modal `isConfirmBatchModalOpen` à execução da mutação `batchPayoutMutation.mutate(filteredSales)`.
  - [x] Condicionado o estado desabilitado à ausência de vendas filtradas pendentes ou mutação em andamento.

---

## 3. Critérios de Aceite Verificados
- [x] O botão está visível e habilitado quando há vendas filtradas com comissão pendente.
- [x] Ao confirmar o modal, todas as comissões filtradas são marcadas como pagas e os respectivos lançamentos criados no Contas a Pagar.
