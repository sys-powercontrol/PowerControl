# Issue 27: Infraestrutura (PWA e Índices Firestore)

## Descrição
Configurar capacidades offline e otimizar performance do banco de dados.

## Requisitos
- **Suporte PWA**:
    - Configurar `manifest.json`.
    - Implementar Service Workers usando `vite-plugin-pwa`.
    - Garantir que o app seja instalável e tenha cache básico.
- **Índices Firestore**:
    - Criar índices compostos em `firestore.indexes.json`.
    - Otimizar consultas que filtram por `company_id` + `created_at` + `status`.
