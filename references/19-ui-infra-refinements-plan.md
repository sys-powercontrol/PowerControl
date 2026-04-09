# Plano de Implementação: Refinamentos de UI e Infraestrutura (Issue 19)

Este documento detalha o plano para melhorias de usabilidade, suporte a PWA e otimização de performance no banco de dados.

## 1. Máscaras de Input Globais

Utilizaremos a biblioteca `react-imask` (já instalada) para padronizar a entrada de dados sensíveis.

### 1.1. Componente `MaskedInput`
Criar `src/components/ui/MaskedInput.tsx` que suporte:
- **CPF**: `000.000.000-00`
- **CNPJ**: `00.000.000/0000-00`
- **Telefone**: `(00) 00000-0000`
- **CEP**: `00000-000`
- **Moeda**: Formatação em tempo real para R$ (BRL).

### 1.2. Pontos de Aplicação
- **Clientes**: CPF/CNPJ, Telefone e CEP.
- **Fornecedores**: CNPJ e Telefone.
- **Empresa**: CNPJ e Telefone.
- **Vendedores**: Telefone.

---

## 2. Suporte a PWA (Progressive Web App)

Transformar o PowerControl em um aplicativo instalável no Android, iOS e Desktop.

### 2.1. Configuração Vite
- Instalar `vite-plugin-pwa`.
- Configurar `vite.config.ts` para gerar o `service-worker`.

### 2.2. Ativos (Assets)
- Criar `public/manifest.webmanifest` com cores da marca e ícones.
- Adicionar ícones de alta resolução (192x192, 512x512) em `public/icons/`.

### 2.3. Registro
- Adicionar lógica de registro do Service Worker em `src/main.tsx`.

---

## 3. Otimização Mobile

### 3.1. PDV (Ponto de Venda)
- Ajustar o layout de `Sales.tsx` para que o carrinho e a busca de produtos sejam empilhados de forma eficiente em telas pequenas.
- Aumentar áreas de toque (touch targets) para botões de quantidade e finalização.

### 3.2. Tabelas Responsivas
- Garantir que todas as tabelas possuam `overflow-x-auto` e cabeçalhos fixos se necessário.

---

## 4. Índices Compostos no Firestore

Para evitar erros de "Query requires an index" e melhorar a performance de ordenação.

### 4.1. Índices Necessários
- **Coleção `sales`**: `company_id` (ASC) + `sale_date` (DESC).
- **Coleção `invoices`**: `company_id` (ASC) + `emission_date` (DESC).
- **Coleção `audit_logs`**: `company_id` (ASC) + `timestamp` (DESC).
- **Coleção `accountsPayable`**: `company_id` (ASC) + `due_date` (ASC) + `status` (ASC).

---

## 5. Próximos Passos (Ordem de Execução)
1.  [ ] Criar o componente `MaskedInput.tsx`.
2.  [ ] Aplicar as máscaras nos formulários de Clientes e Empresa.
3.  [ ] Configurar o `vite-plugin-pwa` e manifest.
4.  [ ] Revisar a responsividade do PDV.
5.  [ ] Documentar os links para criação de índices no console do Firebase.
