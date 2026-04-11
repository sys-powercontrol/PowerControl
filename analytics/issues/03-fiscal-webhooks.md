# Issue: Webhooks Fiscais (FocusNFe)

## Descrição
Implementar o recebimento de notificações da API FocusNFe para atualização automática do status das Notas Fiscais.

## Requisitos
- Criar endpoint `POST /api/webhooks/fiscal`.
- Atualizar a coleção `invoices` com status (Autorizada, Rejeitada, Cancelada).
- Disparar persistência do XML no Firebase Storage após autorização.

## Critérios de Aceite
- O status da nota na página `Fiscal.tsx` é atualizado sem intervenção manual do usuário.
