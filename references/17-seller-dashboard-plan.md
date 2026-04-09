# Plano de Implementação: Dashboard do Vendedor (Issue 17)

Este documento detalha o plano para a criação da página `SellerDashboard.tsx`, focada em fornecer aos vendedores uma visão clara de seu desempenho, comissões e metas.

## 1. Estrutura de Dados e Relacionamentos

### 1.1. Vinculação Usuário-Vendedor
Para que um usuário comum (`role: 'user'`) veja seus próprios dados, precisamos vincular o `User` do Firebase Auth ao registro na coleção `sellers`.
- **Estratégia**: Busca por e-mail. Ao carregar o dashboard, o sistema buscará na coleção `sellers` um documento onde `email == user.email`.
- **Fallback**: Se não houver vínculo, exibir uma mensagem de "Vendedor não vinculado".

### 1.2. Atualização do `firebase-blueprint.json`
- Adicionar a entidade `Seller` e a coleção `sellers`.
- Adicionar campos `seller_id`, `seller_name` e `commission_value` à entidade `Sale`.
- Adicionar campo `monthly_goal` à entidade `Seller`.

---

## 2. Funcionalidades do Dashboard (`SellerDashboard.tsx`)

### 2.1. Indicadores de Desempenho (KPIs)
- **Vendas Totais (Mês)**: Soma do valor total das vendas do vendedor no mês atual.
- **Comissões a Receber**: Soma das comissões calculadas sobre as vendas concluídas.
- **Meta Mensal**: Progresso visual (barra de progresso) em relação à meta definida no cadastro do vendedor.
- **Ticket Médio**: Valor médio das vendas realizadas.

### 2.2. Visualizações de Dados
- **Gráfico de Vendas Diárias**: Evolução das vendas nos últimos 30 dias (usando `recharts`).
- **Lista de Vendas Recentes**: Tabela com as últimas vendas, status e valor da comissão.
- **Ranking (Opcional)**: Posição do vendedor em relação aos outros da mesma empresa (mantendo a privacidade dos valores dos outros).

---

## 3. Implementação Técnica

### 3.1. Lógica de Cálculo
- As comissões serão calculadas em tempo real no dashboard: `venda.total * (vendedor.commission_rate / 100)`.
- Filtros automáticos por `seller_id` e `company_id`.

### 3.2. Navegação e Acesso
- O `SellerDashboard` será a página inicial (`/`) para usuários com `role: 'user'`.
- Administradores também poderão visualizar o dashboard de um vendedor específico através da página de Vendedores.

---

## 4. Próximos Passos (Ordem de Execução)
1.  [ ] Atualizar `firebase-blueprint.json` com as novas definições.
2.  [ ] Criar a página `/src/pages/SellerDashboard.tsx`.
3.  [ ] Atualizar `App.tsx` para incluir a nova rota.
4.  [ ] Modificar `Layout.tsx` para redirecionar usuários 'user' para o dashboard.
5.  [ ] Atualizar `Sales.tsx` para gravar o `commission_value` no momento da venda (opcional, mas recomendado para histórico).
