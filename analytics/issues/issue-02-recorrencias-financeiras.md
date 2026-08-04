# Issue 02: Gestão de Baixa e Alteração em Cascata de Recorrências Financeiras

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Garantir que as ações de edição, exclusão ou liquidação de títulos financeiros pertencentes a uma série recorrente apresentem confirmação para aplicação em cascata ("Apenas este lançamento" vs. "Este e lançamentos futuros"), respeitando os limites configurados no ciclo (`max_installments` ou `until_date`).

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/AccountsPayable.tsx`, `src/pages/AccountsReceivable.tsx`, `src/lib/finance.ts`
- **Banco de Dados:** Firestore (`accountsPayable`, `accountsReceivable`)

---

## 3. Requisitos de Comportamento
1. Interceptar a ação de baixa ou edição em títulos que possuem `recurrent_id`.
2. Exibir o modal de seleção do escopo da operação.
3. Caso a opção "Este e lançamentos futuros" seja selecionada, filtrar os lançamentos com `recurrent_id` idêntico e `due_date >= data_atual` e aplicar as alterações em lote.
4. Interromper a geração automática de novos ciclos ao atingir o limite estipulado em `max_installments` ou `until_date`.
