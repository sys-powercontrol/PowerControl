# Issue: Refatoração de Segurança (RBAC em Firestore Rules)

## Descrição
Migrar a segurança do banco de dados de um modelo genérico para um modelo baseado em permissões granulares.

## Requisitos
- Atualizar `firestore.rules`.
- Substituir `isAdmin()` por `hasPermission()`.
- Validar isolamento estrito de `company_id`.

## Critérios de Aceite
- Usuários com perfis limitados não conseguem acessar dados de módulos para os quais não têm permissão, mesmo via console/API.
