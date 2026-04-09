# Documento de Arquitetura de Software - PowerControl

## 1. Introdução
Este documento descreve a arquitetura do sistema **PowerControl**, um ERP SaaS (Software as a Service) multi-tenant desenvolvido para gestão empresarial. O sistema foca em escalabilidade, isolamento de dados e uma experiência de usuário fluida.

## 2. Visão Geral do Sistema
O PowerControl utiliza uma arquitetura **Serverless-First** baseada na Google Cloud Platform (GCP) e Firebase. A aplicação é um Single Page Application (SPA) que interage diretamente com serviços de backend gerenciados.

### 2.1. Stack Tecnológica
- **Frontend**: React 18 (Vite)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Gerenciamento de Estado**: TanStack Query (Server State) + React Context (Auth/UI State)
- **Backend/Database**: Firebase Firestore (NoSQL)
- **Autenticação**: Firebase Auth (Google + Email/Senha)
- **Infraestrutura**: Google Cloud Run (Hosting do Servidor Node/Vite)

## 3. Arquitetura Frontend
O frontend segue padrões modernos de composição de componentes e hooks customizados.

### 3.1. Estrutura de Pastas
- `/src/components`: Componentes UI reutilizáveis e Layouts.
- `/src/lib`: Core da aplicação (Firebase config, API Client, Auth Context).
- `/src/pages`: Componentes de página (rotas).
- `/src/hooks`: Lógica de UI e integração com queries.

### 3.2. Gerenciamento de Estado
- **Server State**: O `TanStack Query` é utilizado para cache, sincronização e gerenciamento de dados do Firestore. Isso reduz a necessidade de estados globais complexos (como Redux).
- **Auth State**: O `AuthProvider` (`/src/lib/auth.tsx`) gerencia a sessão do usuário e persiste o perfil carregado.
- **Multi-Tenancy Context**: O `api.ts` mantém o `company_id` ativo para filtrar requisições automaticamente.

## 4. Arquitetura de Dados e Multi-Tenancy
O sistema implementa **Multi-Tenancy no nível de aplicação e banco de dados**.

### 4.1. Estratégia de Isolamento (Firestore)
Diferente de abordagens com bancos separados, o PowerControl utiliza **Isolamento por Atributo (Discriminator Column)**:
- Quase todos os documentos (Produtos, Vendas, Clientes) possuem um campo `company_id`.
- As **Firestore Security Rules** garantem que um usuário só possa ler/escrever documentos onde o `company_id` do documento corresponda ao `company_id` do seu perfil de usuário.

### 4.2. Entidades Principais
- **Users**: Armazena perfil, role (`master`, `admin`, `user`) e `company_id`.
- **Companies**: Dados cadastrais das empresas clientes.
- **Transactional Data**: Vendas, Compras, Financeiro (sempre vinculados a uma empresa).

## 5. Modelo de Segurança e RBAC
A segurança é aplicada em camadas:

### 5.1. Níveis de Acesso (Roles)
1.  **Master Admin (`sys.powercontrol@gmail.com`)**:
    - Acesso global e irrestrito.
    - Ignora filtros de `company_id` nas Security Rules.
    - Gerencia empresas e usuários globais.
2.  **Admin**:
    - Acesso total dentro de sua própria empresa (`company_id`).
    - Pode gerenciar funcionários e configurações da empresa.
3.  **User**:
    - Acesso operacional limitado (ex: apenas PDV/Vendas).

### 5.2. Firestore Security Rules
As regras (`firestore.rules`) são a última linha de defesa. Elas validam:
- Autenticação (`request.auth != null`).
- Propriedade do dado (`resource.data.company_id == user.company_id`).
- Integridade de campos imutáveis (ex: `created_at`).

## 6. Fluxo de Dados (Data Flow)
1.  **Requisição**: O componente React chama um método do `api` (ex: `api.get('products')`).
2.  **Intermediação**: O `api.ts` injeta o `company_id` atual ou aplica lógica de Admin Master.
3.  **Firestore SDK**: O SDK do Firebase envia a query para o backend.
4.  **Validação**: O Firestore processa as Security Rules.
5.  **Resposta**: Os dados retornam, são cacheados pelo TanStack Query e renderizados.

## 7. Integrações e Escalabilidade
- **Vite Middleware**: O `server.ts` atua como um proxy leve para desenvolvimento e serve arquivos estáticos em produção.
- **Performance**: O uso de índices no Firestore e a estratégia de cache no frontend garantem baixa latência mesmo com crescimento da base de dados.

## 8. Diretrizes de Desenvolvimento
- **Type Safety**: Uso rigoroso de interfaces TypeScript para todas as entidades.
- **Componentização**: Seguir o princípio de responsabilidade única.
- **Segurança**: Nunca confiar apenas no frontend para filtragem de dados; as Security Rules devem ser o espelho da lógica de negócio.
