# Issue 07: Validação de Estado do Caixa

## Descrição
Implementar a validação de caixa aberto antes de permitir operações de venda ou recebimento.

## Critérios de Aceite
- [ ] **Bloqueio**: Impedir qualquer operação de venda (`Sales.tsx`) ou recebimento se não houver um caixa aberto (`cashiers`) para o usuário atual no dia.
- [ ] **Mensagem**: Exibir um alerta amigável ao tentar realizar uma venda sem caixa aberto.
- [ ] **Redirecionamento**: Adicionar um botão para abrir o caixa se não houver um aberto.

## Detalhes Técnicos
- **Coleção Firestore**: `cashiers`.
- **Campos sugeridos**: `user_id`, `status` (OPEN/CLOSED), `opening_time`, `closing_time`, `opening_balance`, `closing_balance`.
- **Consulta**: Verificar se existe um caixa aberto para o usuário atual (`user_id`) e empresa (`company_id`) com status `OPEN`.
- **Validação**: Impedir a venda se a consulta retornar vazia ou se o caixa estiver fechado.
- **Componente**: Usar um `useEffect` para verificar o estado do caixa ao carregar a página de vendas.
