# Issue 01: Configuração do Cache Persistente Nativo Multi-Aba no SDK Firestore e Tiered Caching no TanStack Query

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Configurar o SDK do Firebase Firestore para habilitar o cache local persistente indexado (`IndexedDB`) com suporte a múltiplas abas concorrentes (`persistentMultipleTabManager`) e estruturar a política de tempo de expiração de cache (*Tiered Stale Times*) no TanStack React Query.

---

## 2. Escopo de Arquivos
* `src/lib/firebase.ts`
* `src/lib/queryClient.ts`

---

## 3. Tarefas de Implementação
1. **Inicialização com Cache Persistente no Firestore:**
   - Em `src/lib/firebase.ts`, importar `initializeFirestore`, `persistentLocalCache` e `persistentMultipleTabManager` de `firebase/firestore`.
   - Inicializar o banco de dados com a configuração de cache persistente compartilhada entre abas:
     ```typescript
     db = initializeFirestore(app, {
       localCache: persistentLocalCache({
         tabManager: persistentMultipleTabManager()
       })
     }, firebaseConfig.firestoreDatabaseId);
     ```
   - Tratar de forma resiliente exceções de inicialização prévia ou ambientes onde IndexedDB não está disponível.

2. **Definição de Camadas de Stale Time (Tiered Caching):**
   - Em `src/lib/queryClient.ts`, parametrizar padrões de cache:
     - **Estático (Metadados/Permissões/Configurações):** `staleTime: 60 * 60 * 1000` (1h), `gcTime: 24 * 60 * 60 * 1000`.
     - **Cadastros (Produtos, Clientes, Fornecedores):** `staleTime: 15 * 60 * 1000` (15min), `gcTime: 12 * 60 * 60 * 1000`.
     - **Transacional (Vendas Ativas, Contas, Caixas):** `staleTime: 3 * 60 * 1000` (3min), `gcTime: 2 * 60 * 60 * 1000`.
     - **Relatórios Gerenciais:** `staleTime: 30 * 60 * 1000` (30min).
   - Manter desabilitado `refetchOnWindowFocus` para evitar requisições desnecessárias a cada alternância de abas do navegador.

---

## 4. Critérios de Aceite
- Ao recarregar a página ou abrir uma nova aba, as consultas a dados inalterados são resolvidas a partir do IndexedDB local sem cobrança de leituras de servidor.
- Nenhum erro de inicialização de concorrência de abas ocorre no console do navegador.
