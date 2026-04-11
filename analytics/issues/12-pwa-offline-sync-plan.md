# Plano de Implementação: Background Sync e PWA - Issue 12

Este documento detalha o plano para robustecer o suporte offline do sistema, transformando-o em um PWA instalável com sincronização em segundo plano (Background Sync).

## 1. Objetivos
- Garantir que o sistema possa ser instalado como um aplicativo (PWA) em dispositivos móveis e desktops.
- Implementar a sincronização de vendas offline mesmo se o usuário fechar a aba do navegador, utilizando a API de Background Sync no Service Worker.

## 2. Análise da Situação Atual
- **Manifesto PWA**: Já está configurado corretamente no `vite.config.ts` através do plugin `vite-plugin-pwa`. Ele define o nome, cores (`theme_color`, `background_color`) e os ícones necessários.
- **Fila Offline**: O arquivo `src/lib/offlineStore.ts` já implementa uma fila no IndexedDB (`powercontrol_offline_db`) para salvar vendas quando o sistema está offline (já que transações do Firestore falham sem internet).
- **Service Worker Atual**: O arquivo `public/sw.js` possui um listener para o evento `sync`, mas ele **não processa a fila se a aba estiver fechada**. Ele apenas envia uma mensagem (`TRIGGER_SYNC`) para as abas abertas.

## 3. Plano de Ação

Para garantir que a sincronização ocorra mesmo com a aba fechada, precisamos mover a lógica de sincronização (que interage com o Firebase) para dentro do Service Worker.

### Passo 1: Migrar para `injectManifest`
- Alterar a configuração do `vite-plugin-pwa` no `vite.config.ts` para usar a estratégia `injectManifest`.
- Isso permitirá que o Vite compile um Service Worker customizado (`src/sw.ts`), possibilitando a importação do SDK do Firebase e das nossas funções de inventário diretamente no SW.

### Passo 2: Criar o Service Worker Customizado (`src/sw.ts`)
- Configurar o precaching do Workbox (`precacheAndRoute`).
- Implementar o listener do evento `sync` para a tag `sync-sales`.
- Dentro do evento `sync`:
  1. Inicializar o Firebase App, Auth e Firestore.
  2. Aguardar a restauração do estado de autenticação (o Firebase Auth compartilha o estado via IndexedDB, então o SW consegue recuperar o usuário logado).
  3. Abrir o IndexedDB e buscar as vendas pendentes.
  4. Executar a função `inventory.processSale` para cada venda.
  5. Remover a venda do IndexedDB após o sucesso.

### Passo 3: Ajustar `inventory.ts` e Dependências
- Modificar `inventory.processSale` para aceitar o objeto `user` como parâmetro opcional ou injetado, pois a função `api.getCurrentUser()` pode não funcionar da mesma forma dentro do contexto isolado do Service Worker.

### Passo 4: Fallback para Navegadores sem Background Sync
- Manter a lógica atual no `offlineStore.ts` que escuta o evento `window.addEventListener("online")`. Isso garante que navegadores como o Safari (que não suportam Background Sync de forma confiável) ainda sincronizem as vendas assim que a conexão voltar e a aba estiver aberta.

## 4. Conclusão
A infraestrutura básica de PWA e fila offline já existe. O foco desta issue será substituir o Service Worker estático (`public/sw.js`) por um Service Worker compilado (`src/sw.ts`) capaz de executar transações do Firestore em segundo plano.
