# Issue 09: Automação de Contas Recorrentes

## Descrição
Implementar a automação de geração de lançamentos financeiros recorrentes (ex: aluguel, mensalidades).

## Critérios de Aceite
- [ ] **Lógica**: Script/Função que verifica contas marcadas como "recorrentes" e gera o próximo lançamento automaticamente ao marcar a atual como paga.
- [ ] **Configuração**: Adicionar um campo `is_recurring` e `frequency` (MONTHLY/WEEKLY/YEARLY) ao cadastro de contas a pagar/receber.
- [ ] **Geração**: Gerar o próximo lançamento com a data de vencimento baseada na frequência configurada.
- [ ] **Status**: Definir o status inicial do novo lançamento como `PENDING`.

## Detalhes Técnicos
- **Coleção Firestore**: `accountsPayable`, `accountsReceivable`.
- **Campos sugeridos**: `is_recurring` (bool), `frequency` (string), `next_due_date` (timestamp).
- **Trigger**: Utilizar um `useEffect` ou Firebase Cloud Functions para verificar e gerar os lançamentos recorrentes.
- **Validação**: Verificar se a conta já foi paga antes de gerar o próximo lançamento.
- **Componente**: Adicionar uma opção de recorrência ao formulário de cadastro de contas.
