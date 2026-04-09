# Issue 08: Fluxo de Convite de Usuário

## Descrição
Implementar o fluxo de convite de novos usuários para uma empresa específica.

## Critérios de Aceite
- [ ] **Ação**: Admin envia convite via e-mail.
- [ ] **Lógica**: Criar registro temporário na coleção `invites`.
- [ ] **E-mail**: Enviar um e-mail de convite com um link único (ex: `/register?invite=ID`).
- [ ] **Aceite**: Ao o usuário aceitar (via link), vincular o `uid` do Firebase Auth ao `company_id` do convite.
- [ ] **Status**: Definir o status do convite como `PENDING`, `ACCEPTED` ou `EXPIRED`.

## Detalhes Técnicos
- **Coleção Firestore**: `invites`.
- **Campos sugeridos**: `email`, `company_id`, `role` (ADMIN/USER), `status` (PENDING/ACCEPTED/EXPIRED), `created_at`, `expires_at`.
- **E-mail**: Utilizar um serviço de e-mail (ex: SendGrid, Mailgun) ou Firebase Cloud Functions para enviar o convite.
- **Validação**: Verificar se o convite é válido e não expirou antes de vincular o usuário à empresa.
- **Componente**: Criar uma página de convite (`/src/pages/Invite.tsx`) para gerenciar os convites enviados.
