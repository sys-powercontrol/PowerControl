# Issue 03: Algoritmo de Score de Match e Conciliação OFX em Lote

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Implementar o algoritmo formal de cálculo do Score de Match (0 a 100) para conciliação bancária entre os lançamentos do arquivo OFX importado e o sistema financeiro, permitindo a conciliação e baixa em lote dos itens selecionados.

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
- **Banco de Dados:** Firestore (`bank_statements`, `movements`, `accountsPayable`, `accountsReceivable`, `bank_accounts`)

---

## 3. Requisitos de Comportamento
1. Ao processar cada linha do OFX, comparar com os títulos abertos:
   - Mesma quantia (valor absoluto): +50 pontos.
   - Diferença de data até 3 dias úteis: +30 pontos.
   - Similaridade de texto na descrição/documento: +20 pontos.
2. Exibir o indicador de nível de confiança no componente visual (Alto/Médio/Baixo).
3. Adicionar ação "Conciliar Selecionados em Lote" para alterar `reconciled: true` nos registros e atualizar o saldo da conta bancária.
