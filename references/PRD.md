# PRD - PowerControl (Sistema de Gestão Empresarial)

## 1. Visão Geral do Produto
O **PowerControl** é uma plataforma SaaS (Software as a Service) de Gestão Empresarial (ERP) completa, projetada para atender pequenas e médias empresas. O sistema oferece controle total sobre vendas, estoque, financeiro e gestão de pessoas, com suporte nativo a multi-tenancy (múltiplas empresas isoladas).

## 2. Público-Alvo
- Pequenos e médios varejistas.
- Prestadores de serviços.
- Administradores de múltiplas unidades de negócio (Franquias ou Grupos).
- Gestores financeiros e de estoque.

## 3. Objetivos Estratégicos
- **Centralização**: Unificar todos os processos de negócio em uma única interface.
- **Escalabilidade**: Permitir que novos clientes (empresas) sejam integrados sem interferência entre dados.
- **Mobilidade**: Interface responsiva para acesso via desktop e dispositivos móveis.
- **Controle Master**: Oferecer uma visão consolidada para o administrador da plataforma.

## 4. Funcionalidades Principais

### 4.1. Dashboard e BI
- Visualização de métricas em tempo real (Vendas, Lucro, Ticket Médio).
- Gráficos de desempenho mensal e anual.
- Listagem de produtos com estoque baixo.

### 4.2. Gestão de Vendas e PDV
- Interface de vendas (Vender) com busca de produtos.
- Histórico completo de vendas com opção de cancelamento.
- Gestão de vendedores e comissões.

### 4.3. Gestão de Compras e Estoque
- Cadastro e controle de produtos e serviços.
- Gestão de fornecedores.
- Registro de compras com atualização automática de estoque.
- Histórico de compras.

### 4.4. Financeiro
- **Fluxo de Caixa**: Gestão de caixas (abertura, fechamento, saldo).
- **Contas a Pagar/Receber**: Controle de vencimentos e status de pagamento.
- **Contas Bancárias**: Gestão de saldos e conciliação.
- **Transferências**: Movimentação entre contas e caixas.

### 4.5. Gestão de Pessoas
- Cadastro de Clientes (CRM básico).
- Cadastro de Funcionários e Vendedores.
- Gestão de Fornecedores.

### 4.6. Multi-Tenancy e Administração
- **Isolamento de Dados**: Cada empresa visualiza apenas seus próprios registros.
- **Admin Master**: Painel global para o proprietário do sistema gerenciar todas as empresas e usuários. O Admin Master possui acesso total e na íntegra a todo o conteúdo do sistema, sem restrições de isolamento.
- **Configurações**: Personalização de dados da empresa, logos e parâmetros fiscais.

## 5. Requisitos Técnicos

### 5.1. Stack Tecnológica
- **Frontend**: React 18+ com Vite.
- **Estilização**: Tailwind CSS.
- **Ícones**: Lucide React.
- **Gráficos**: Recharts.
- **Gerenciamento de Estado/Cache**: TanStack Query (React Query).
- **Backend**: Firebase (Firestore para banco de dados NoSQL, Firebase Auth para autenticação).

### 5.2. Segurança e Permissões
- **Autenticação**: Login via e-mail/senha e proteção de rotas.
- **Níveis de Acesso**:
  - **Master Admin**: Acesso global a todas as empresas.
  - **Admin**: Acesso total aos dados de uma empresa específica.
  - **User**: Acesso limitado a funções operacionais (ex: apenas vendas).

### 5.3. Arquitetura de Software
- **Thin Client, Fat Server**: O frontend atua como um cliente leve, capturando intenções do usuário e reagindo aos resultados processados pelo backend. Toda a lógica de negócio complexa (estoque, financeiro, regras de multi-tenancy) é processada no servidor.
- **Segurança de Chaves**: Jamais colocar chaves de API sensíveis ou segredos no frontend. Todas as integrações com serviços externos e banco de dados são mediadas pelo backend.
- **Design Moderno**: Interface limpa com foco em usabilidade.
- **Feedback Visual**: Uso de toasts (Sonner) para confirmações de ações.
- **Responsividade**: Layout adaptável para diferentes tamanhos de tela.

## 7. Roadmap Futuro (Sugestões)
- Integração com APIs de Nota Fiscal (NFe/NFCe).
- Relatórios avançados em PDF/Excel.
- Módulo de Orçamentos e Pedidos de Venda.
- App Mobile Nativo (React Native).
