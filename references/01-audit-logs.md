# Issue 01: Auditoria Global para Admin Master

## Descrição
Implementar uma página de logs de auditoria acessível apenas pelo Admin Master para monitorar ações críticas em todas as empresas do sistema.

## Critérios de Aceite
- [ ] Criar a página `/src/pages/AuditLogs.tsx`.
- [ ] Restringir acesso apenas para usuários com `role === 'master'`.
- [ ] Listar ações como: exclusão de registros, alteração manual de estoque, criação/edição de empresas.
- [ ] Implementar filtros por: Data (Início/Fim), Empresa (`company_id`) e Usuário.
- [ ] Exibir detalhes da alteração (valor antigo vs valor novo, se aplicável).

## Detalhes Técnicos
- **Coleção Firestore**: `audit_logs`.
- **Campos sugeridos**: `timestamp`, `user_id`, `user_name`, `company_id`, `action_type`, `entity`, `entity_id`, `metadata` (JSON).
- **Componente**: Usar uma tabela responsiva com paginação.
