# ISSUE-08: Campos de Taxas de Cartão na Aba de Pagamentos — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Configurações  
**Prioridade:** Baixa  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Na aba "Pagamentos" de `Configurations.tsx`, o cabeçalho previa a configuração de chaves PIX e taxas, mas apenas o campo de PIX estava presente na interface.
- As taxas de cartão de crédito e débito não possuíam inputs para edição e persistência no documento da empresa.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/Configurations.tsx` (Aba `payments`):**
  - [x] Adicionados inputs numéricos para:
    - Taxa Cartão de Crédito (%): `credit_card_rate` com step `0.01`.
    - Taxa Cartão de Débito (%): `debit_card_rate` com step `0.01`.
  - [x] Integrados os campos ao salvamento (`saveData`) e carregamento dos dados da empresa ativa (`companies/{companyId}`).

---

## 3. Critérios de Aceite Verificados
- [x] O usuário consegue informar as taxas de cartão de crédito e débito na aba Pagamentos.
- [x] Os valores persistem no documento `companies/{companyId}` e recarregam corretamente.
