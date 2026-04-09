# Issue 36: Background Sync para Vendas Offline

## Descrição
Implementar a sincronização automática de vendas realizadas em modo offline assim que a conexão com a internet for restabelecida.

## Requisitos
- Configurar Service Workers via Workbox para detectar mudanças no estado da conexão.
- Implementar lógica para monitorar o IndexedDB (onde as vendas offline são salvas).
- Disparar automaticamente o processo de sincronização (`inventory.processSale`) em segundo plano quando o navegador estiver online.
- Notificar o usuário via `NotificationCenter` quando a sincronização for concluída com sucesso.
