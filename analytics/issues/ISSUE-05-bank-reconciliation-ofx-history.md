# ISSUE-05: Histórico e Auditoria de Importação OFX — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Financeiro / Conciliação Bancária  
**Prioridade:** Média  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- O modal `OFXImporter.tsx` efetuava a importação e conciliação do extrato bancário, mas não gravava o histórico do lote importado.
- A tela de conciliação bancária (`BankReconciliation.tsx`) exibia um quadro de "Últimas Importações OFX" apenas com texto fixo informando que não havia histórico.

---

## 2. Escopo da Finalização Executado
- **Em `src/components/Financial/OFXImporter.tsx`:**
  - [x] Ao finalizar a conciliação do arquivo OFX, persiste documento na coleção `bank_imports` com os metadados do lote (nome do arquivo, total de transações, conciliadas, ignoradas, data e operador).
  - [x] Invalidação reativa da query `["bank_imports"]`.
- **Em `src/pages/BankReconciliation.tsx`:**
  - [x] Consulta reativa com `useQuery` para carregar `bank_imports` filtrando pela conta bancária selecionada.
  - [x] Listagem dos lotes importados com nome do arquivo, data/hora, contagem de transações, valor total e operador responsável.

---

## 3. Critérios de Aceite Verificados
- [x] Ao importar um extrato OFX, o lote correspondente é persistido e exibido na listagem de "Últimas Importações" da conta bancária selecionada.
