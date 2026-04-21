# Especificação Técnica de Implementação (Pendências)

Com base no documento de planejamento (`analytics/report.md`), esta é a relação restrita *apenas ao que falta implementar* para tornar seguro e íntegro o fluxo financeiro de contas. Os tópicos estão estruturados por domínios.

---

### 1. Central de Transações do Financeiro
**Arquivo de Referência:** `src/lib/finance.ts`

#### Componente/Funções Alvo:
- `reverseAccountPayment`, `reverseAccountReceipt`, `reversePurchasePayment`, `reverseSalePayment`.

#### Behavior (Comportamento de Negócio) Faltante:
- **Proteção contra "Orphaned Writes" (Retornos Silenciosos):** Remover a linha que realiza saída silenciosa em falha (`if (!docSnap.exists()) return { success: true };`). Implementar um bloqueio absoluto com `throw new Error("Não é possível estornar: A conta bancária ou caixa atrelada a esta operação já não existe no sistema.")`.
- **Trava D0 para Caixas Fechados:** Se o `collectionName` for `"cashiers"`, injetar uma checagem validando a propriedade `status` do documento resgatado (`docSnap.data()`). Caso aponte `"Fechado"`, a função deve bloquear o estorno utilizando `throw new Error("Transação negada. O Caixa no qual este valor foi computado já está Fechado. A quantia deve ser tratada como Movimentação manual.")`.

---

### 2. Painéis Modulares de Contas a Receber e a Pagar
**Arquivos de Referência:** `src/pages/AccountsReceivable.tsx` e `src/pages/AccountsPayable.tsx`

#### A) Componente: Ações da Grade (Row Actions)
- **Behavior (Botão Estornar):** Inserir um botão específico de Estorno (ícone sugerido: `RotateCcw`, talvez na cor laranja ou cinza-alerta), visível na listagem **apenas** quando a conta assumir status de `"Recebido"` ou `"Pago"`. Ao acionar, solicitar confirmação via UI.
- **Behavior (Mutation de Estorno):** Criar a rotina responsável pelo clique. O que ela deve fazer:
  1. Identificar o registro na base de dados e travar alterações simultâneas.
  2. Acionar `reverseAccountReceipt(dbAccount)` ou `reverseAccountPayment(dbAccount)` importado da lib `finance`.
  3. Emitir payload de alteração de estado (via requisição PUT) convertendo o `status` retroativamente para `"Pendente"` (ou `"Atrasado"` dinamicamente).
  4. Apagar (definir como `null`) as chaves originárias da baixa: `payment_date`/`receipt_date`, `bank_account_id` e `cashier_id`.

#### B) Componente: Botão Excluir (`Trash2`)
- **Behavior (Bloqueio Condicional):** Refatorar o fluxo do evento atual. A exclusão de faturas e duplicatas pagas/recebidas deve ser severamente dificultada. 
  - **Fluxo Sugerido:** Se a UI detectar o status `"Recebido"`/`"Pago"`, o clique na Lixeira deve abrir modal avisando que a mesma **não pode ser apagada** em estado liquidado; a orientação recomendada na UI deve ser: "Por favor, clique no botão Estornar antes de excluir este registro de fatura.". Se continuarem desejando apagar e o estorno não puder ser feito por ser caixa travado, o título ficará apenas para fins de registro histórico incontornável.

#### C) Componente: Validação da Mutation de Editar Data
- **Behavior (Prevenção de Injeção em Alteração de Data):** Como hoje o código apenas oculta o botão dependendo do status, injetar proteção técnica final dentro das mutations de backend das páginas (`extendDateMutation`). Faltou inserir uma checagem que verifique explicitamente: `if (dbAccount.status === 'Recebido' || dbAccount.status === 'Pago') throw new Error('Não é possível modificar parâmetros de uma conta que já foi finalizada. Estorne primeiro.')`.

---

### Observações
> Todo e qualquer ajuste futuro mencionado nestas faturas financeiras deve seguir irrestritamente esta especificação. Isso vai isolar o módulo financeiro e preservar todo o histórico bancário da aplicação e garantir a concordância perante auditorias de sistemas.
