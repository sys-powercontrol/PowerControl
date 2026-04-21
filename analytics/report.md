# Relatório de Planejamento: Ajustes e Correções na Contabilização Financeira

**Objetivo:** Analisar o estado atual da lógica de Recebimentos (`Contas a Receber`) e Pagamentos (`Contas a Pagar`), identificar riscos na consistência financeira e desenhar um plano de ação para corrigir as falhas antes de alterar o código-fonte.

## 1. Estado Atual da Contabilização (As-Is)

- Quando uma **Conta a Receber** é liquidada, o sistema invoca `processAccountReceipt` e altera o `$status` para `Recebido`. O valor é injetado no Saldo do Caixa ou Conta Bancária escolhida, e um registro na collection `movements` (Movimentações) é criado (`Entrada`).
- Quando uma **Conta a Pagar** é liquidada, de modo análogo, chama-se `processAccountPayment` e o status da conta vira `Pago`. O valor é subtraído da fonte pagadora, também populando `movements` (`Saída`).
- **Sistema de Reparação/Estorno Atual:** A única maneira estabelecida atualmente para reverter um pagamento/recebimento é através do **Botão de Exclusão** das próprias Contas. Ao ser disparado em uma conta já paga/recebida, o sistema primeiro engatilha um estorno por meio de `reverseAccountReceipt` / `reverseAccountPayment`, subtraindo/somando de volta o saldo na origem antes de `DELETE` do documento.
- **Botão de Alterar Vencimento:** Encontra-se protegido de contas já liquidadas apenas bloqueando a renderização na interface (`display: none` lógico). Se ativado externamente, a query de alteração de data voltará o status da conta para `Pendente`, o que anula o status do pagamento sem corrigir o caixa.

## 2. Pontos Críticos e Vulnerabilidades (Riscos)

1. **Baixa Flexibilidade (Obrigatoriedade de Exclusão):** O usuário NÃO tem a opção de apenas estornar um erro de pagamento e manter o registro original do título como `Pendente`. A obrigatoriedade de excluir o registro para estorná-lo destrói o histórico de faturamento da conta.
2. **Caixas Fechados (Inconsistência de Reversão):** Durante `reverseAccountReceipt/Payment`, se a conta pagadora for um Caixa que possui status atual `Fechado`, injetar saldos retroativos nesse caixa fechará o fluxo de reconciliação, desequilibrando as somas e subtrações dos turnos financeiros já impressos.
3. **Ausência da Fonte Pagadora (Orphaned Write):** O estorno, na biblioteca `finance.ts`, tenta buscar o banco ou caixa. Se o destino não existir mais no banco de dados (`!docSnap.exists()`), a transação de reversão retorna `{ success: true }` silenciosamente. Assim, a exclusão da cobrança tem sucesso e o estorno é **perdido**, destruindo o dinheiro no vazio e gerando disparidade no painel global.
4. **Pagamentos Parciais Inexistentes:** A liquidação atual só processa `100%` da nota (baixando via `parseFloat` total). Não existe tratativa para pagamentos com desconto ou acréscimo de juros no ato da liquidação de forma limpa, apenas informando o total que o usuário quer.

## 3. Plano de Melhorias (To-Be)

Para garantir integridade contabilística robusta, devem ser implementadas as seguintes ações (nesta exata ordem de segurança):

### Fase 1: Isolamento da Ação de Estorno da Ação de Exclusão
- **Adicionar Botão "Estornar Pagamento":** Ao invés de usar o ícone de lixeira, inserir na listagem um botão dedicado de estorno (ex: `RotateCcw`) visível *apenas* em contas `Recebido`/`Pago`.
- **Lógica de Estorno:** Engatilhar uma nova Mutation que não exclua a fatura, mas recoloque o status original como `Pendente` (ou `Atrasado` dependendo do `due_date`), e invoque as rotinas de `reverseAccount()`.
- O botão de Exclusão passará a avisar que *primeiro* a fatura deve ser estornada, evitando exclusões letais com efeitos em cascata difíceis de rastrear ou, alternativamente, mantendo o processo atual mas com avisos duplos.

### Fase 2: Blindagem do Estorno
- Modificar `src/lib/finance.ts` nos blocos de `reverseAccount[X]`. Caso a conta bancária não seja encontrada:
  * Em vez de retornar `true`, **Lançar Exceção** (`throw new Error(...)`), paralisando a ação de estorno e orientando o usuário.
- Incluir regra: Impedir o estorno caso ele pertença a um *Caixa Fechado* (onde é estritamente proibido alterar o saldo total). Aconselhar uma devolução ou entrada em caixa aberto via módulo "Movimentações".

### Fase 3: Validação Explícita do Botão "Alterar Data"
- Em `AccountsPayable.tsx` e `AccountsReceivable.tsx`, dentro das query mutators `extendDateMutation`, forçar checagem: `if (dbAccount.status === "Recebido" || dbAccount.status === "Pago") throw new Error("Não é possível alterar dados de contas baixadas.");`. Isso impede injeções fora da UI.

## Conclusão
Estas pequenas defesas blindarão a conciliação bancária ("BankReconciliation") contra buracos contábeis resultantes de falhas e exclusões. Aguarde ordens para prosseguir com o plano da Fase 1 e 2.
