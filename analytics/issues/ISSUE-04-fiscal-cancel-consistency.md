# ISSUE-04: Consistência de Status no Cancelamento de Notas Fiscais com a SEFAZ — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Fiscal / Vendas  
**Prioridade:** Crítica  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Ao cancelar uma venda em `SalesHistory.tsx`, se a nota fiscal associada estivesse emitida perante a SEFAZ e a tentativa de cancelamento falhasse (ex: prazo legal de 24h para NF-e ou 30min para NFC-e expirado), o sistema forçava o status da nota para "Cancelada" no banco de dados local.
- Isso gerava grave inconformidade fiscal, pois a nota continuava autorizada perante a Receita Federal.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/SalesHistory.tsx`:**
  - [x] Na mutação `cancelSaleMutation`: se o cancelamento na SEFAZ for recusado ou não for homologado, a nota fiscal é **mantida estritamente com status `"Emitida"`**.
  - [x] Registrados os campos de auditoria da tentativa (`fiscal_cancel_attempted: true`, `fiscal_cancel_error`).
  - [x] Alerta e modal orientando o operador sobre a recusa da SEFAZ e necessidade de emissão de Nota Fiscal de Devolução/Estorno.
  - [x] Em `deleteSaleMutation`, bloqueada a exclusão direta de vendas com notas fiscais homologadas ativas (`nfe_status === "Emitida"`).

---

## 3. Critérios de Aceite Verificados
- [x] Caso o cancelamento fiscal falhe ou prazo tenha expirado, a nota fiscal não tem seu status alterado para "Cancelada".
- [x] A interface exibe aviso explícito orientando a emissão de nota de devolução.
- [x] Vendas com notas homologadas ativas não podem ser deletadas permanentemente.
