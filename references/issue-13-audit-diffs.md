# Issue 13: Auditoria de Diffs no AuditLog

## Descrição
Melhorar o sistema de auditoria para registrar exatamente o que foi alterado.

## Requisitos
- Comportamento: Ao salvar uma alteração em qualquer entidade crítica, o `AuditLog` deve capturar o estado anterior e o novo estado do objeto.
- Formato: Adicionar um campo `changes` no log contendo o objeto de diff (ex: `{ old: { price: 10 }, new: { price: 12 } }`).
