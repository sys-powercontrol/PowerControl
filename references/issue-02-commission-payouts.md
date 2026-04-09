# Issue 02: Fechamento de Comissões (`CommissionPayouts.tsx`)

## Descrição
Implementar interface para administradores realizarem o pagamento de comissões aos vendedores.

## Requisitos
- Criar a página `src/pages/CommissionPayouts.tsx`.
- Funcionalidades:
    - Filtro por período e vendedor.
    - Listagem de vendas com comissões pendentes.
    - Botão "Marcar como Pago".
- Comportamento:
    - Ao marcar como pago, deve gerar um lançamento automático na coleção `accountsPayable`.
- Cálculo: Baseado no `commission_rate` definido no cadastro do vendedor.
