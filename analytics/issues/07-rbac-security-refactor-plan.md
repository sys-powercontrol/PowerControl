# Plano de Implementação: Refatoração de Segurança (RBAC em Firestore Rules) - Issue 07

Este documento detalha o plano para migrar a segurança do Firestore de um modelo genérico para um modelo baseado em permissões granulares e isolamento estrito.

## 1. Objetivos
- Eliminar o uso de regras genéricas (`match /{collectionName}`).
- Implementar blocos de `match` específicos para cada coleção.
- Substituir verificações de papel (`isAdmin`) por verificações de permissão (`hasPermission`) onde apropriado.
- Garantir isolamento total entre empresas (`company_id`).

## 2. Mapeamento de Permissões por Coleção

| Coleção | Leitura (Read) | Escrita (Create/Update) | Exclusão (Delete) |
| :--- | :--- | :--- | :--- |
| `products` | `products.view` | `products.manage` | `products.manage` |
| `services` | `products.view` | `products.manage` | `products.manage` |
| `sales` | `sales.view` | `sales.create` | `sales.delete` |
| `purchases` | `inventory.manage` | `inventory.manage` | `inventory.manage` |
| `inventory_movements` | `inventory.manage` | `inventory.manage` | `inventory.manage` |
| `clients` | `sales.view` | `sales.create` | `sales.delete` |
| `suppliers` | `finance.view` | `finance.manage` | `finance.manage` |
| `accountsPayable` | `finance.view` | `finance.manage` | `finance.manage` |
| `accountsReceivable` | `finance.view` | `finance.manage` | `finance.manage` |
| `bankAccounts` | `finance.view` | `finance.manage` | `finance.manage` |
| `cashiers` | `finance.view` | `finance.manage` | `finance.manage` |
| `sellers` | `sellers.manage` | `sellers.manage` | `sellers.manage` |
| `invoices` | `fiscal.manage` | `fiscal.manage` | `fiscal.manage` |
| `audit_logs` | `audit.view` | `isAuthenticated` | `false` |

## 3. Estratégia de Refatoração

### Passo 1: Atualização de Helpers
- Refinar `hasPermission(permissionId)` para garantir que `master` e `admin` tenham bypass se necessário, mas priorizando a lista de permissões do documento do usuário.
- Adicionar validadores de esquema (ex: `isValidProduct`, `isValidSale`).

### Passo 2: Implementação de Blocos Específicos
- Criar regras para `users` e `companies` (já existem, mas serão revisadas).
- Criar regras para cada coleção listada no mapeamento acima.
- Remover o bloco `match /{collectionName}/{docId}`.

### Passo 3: Validação de Dados
- Em cada `create` e `update`, validar que o `company_id` do recurso corresponde ao `company_id` do usuário autenticado.
- Validar campos obrigatórios e tipos de dados.

## 4. Critérios de Segurança (Checklist)
- [ ] Nenhum dado pode ser lido sem autenticação (exceto convites por ID).
- [ ] Um usuário da Empresa A jamais pode ler/escrever dados da Empresa B.
- [ ] O campo `role` e `permissions` no documento `users` só pode ser alterado por um `master` ou `admin` da mesma empresa (com restrições para auto-promoção).
- [ ] Logs de auditoria são "append-only" (apenas criação permitida).

## 5. Próximos Passos
1. Preparar o novo arquivo `firestore.rules`.
2. Executar o teste de "Advogado do Diabo".
3. Fazer o deploy das regras usando `deploy_firebase`.
