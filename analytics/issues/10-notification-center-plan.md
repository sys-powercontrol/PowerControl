# Plano de Implementação: Centro de Notificações - Issue 10

Este documento detalha o plano para implementar o Centro de Notificações no sistema.

## 1. Objetivos
- Fornecer feedback visual imediato sobre pendências urgentes e eventos críticos do sistema.
- Centralizar alertas de diferentes módulos (Estoque, Financeiro, Fiscal) em um único local acessível.

## 2. Análise da Situação Atual
A funcionalidade já foi previamente implementada no componente `src/components/NotificationCenter.tsx` e integrada no cabeçalho do `Layout.tsx`.

### Funcionalidades já presentes que atendem aos requisitos:
- **Alertas de Estoque Baixo**: O sistema verifica produtos onde `stock_quantity <= min_stock` e gera um alerta do tipo 'warning'.
- **Lembretes de Vencimento Financeiro**: O sistema verifica Contas a Pagar e Contas a Receber com `due_date` igual ao dia atual e `status === "Pendente"`, gerando alertas do tipo 'error' (pagar) e 'info' (receber).
- **Erros de Processamento Fiscal**: O sistema verifica Notas Fiscais com `status === "Rejeitada"` e gera um alerta do tipo 'error'.
- **Componente no Cabeçalho**: O `NotificationCenter` está posicionado no header, com um ícone de sino (`Bell`) que exibe um badge pulsante com a quantidade de alertas ativos.
- **Navegação Rápida**: Cada alerta possui um link ("Ver Detalhes") que redireciona o usuário para a página correspondente para resolver a pendência.

## 3. Próximos Passos (Melhorias Futuras)
Embora a funcionalidade principal já esteja implementada e funcional, podemos considerar as seguintes melhorias futuras:
1. **Notificações Push**: Integrar com a API de Notificações do navegador ou Firebase Cloud Messaging (FCM) para alertar o usuário mesmo quando a aba do sistema estiver em segundo plano.
2. **Configuração de Alertas**: Permitir que o usuário configure quais tipos de alertas deseja receber (ex: desativar alertas de contas a receber, mas manter os de contas a pagar).
3. **Alertas de Vencimento Próximo**: Além de alertar no dia do vencimento, alertar com antecedência (ex: 3 dias antes).

## 4. Conclusão
A Issue 10 já está implementada e funcional no sistema. O componente `NotificationCenter` atende a todos os requisitos e critérios de aceite definidos.
