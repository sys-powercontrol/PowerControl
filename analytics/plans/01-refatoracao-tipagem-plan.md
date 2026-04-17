# Plano de Ação: Issue 01 - Refatoração de Tipagem e Remoção de `any`

Este documento consolida o planejamento sequencial para atacar definitivamente o vazamento de tipos frouxos (`any`) na aplicação e reestruturar as deficiências de Type Checking (rastreado na `/analytics/issues/01-refatoracao-tipagem.md`), assegurando segurança estática contra travamentos no React.

## 1. Atualização do Ambiente e Dependências (Infra)
O log de erros raiz informou que o compilador enxerga toda e qualquer sintaxe de hook como `any` devido à falta dos tipos globais do React e de libs externas.
*   **Ação**: Instalar imediatamente `@types/react` e `@types/react-dom` como `devDependencies` no `package.json`.
*   **Ação**: Criar um arquivo ou mapeamento de declaração (ex: `src/types/ofx-js.d.ts`) para englobar a tipagem estática que falta em `@types/ofx-js` usada em `OFXImporter.tsx`.

## 2. Fortalecimento dos Modelos Globais (`src/types.ts`)
As atuais interfaces deixam lacunas enormes nos nós-filhos (arrays e datas base), inviabilizando o preenchimento tipado automático.
*   **Vendas (`Sale`)**: Substituir `items: any[]` por um array de uma nova interface explícita `SaleItem` que reflete os itens de nota (Produto/Serviço, valor unitário, desconto, quantidade, etc).
*   **Datas Modificáveis**: Campos como `created_at`, `updated_at`, `timestamp` assinalados como `any` hoje. Devem ser refatorados para um Type Seguro (ex: `string | { seconds: number, nanoseconds: number }` para compatibilizar o formato de Timestamp serializado do Firebase).
*   **Inventário (`InventoryMovement`)**: Validar se as chamadas nos relatórios estão aderentes e criar aliases/interfaces compostas para os gráficos de lucratividade.

## 3. Blindagem de Comunicação (Camada Core / Libs)
As chaves sistêmicas de comunicação precisam impor Generics `<T>` aos desenvolvedores.
*   **`src/lib/api.ts`**: Substituir todos os parâmetros `api.post(entity: string, data: any)` por `api.post<T>(entity: string, data: Partial<T> | Record<string, unknown>)`.
*   As respostas de assinatura `snapshot.docs.map((doc: any) => ...)` devem se forçar para retornos tipados do Firebase Firestore (`QueryDocumentSnapshot<DocumentData>`).
*   **Catch de Erros**: Qualquer assinatura `catch (error: any)` deve virar `catch (error: unknown)` e seguir de um *type narrowing*: `if (error instanceof Error) { ... } else { ... }`.
*   **`src/sw.ts` e Offline Store**: Tratar Payload de Sincronia. Substituir eventos explícitos do sync `event: any` para compatibilizar com a interface nativa de `SyncEvent`.

## 4. Reestruturação Vertical de Componentes Interativos Mapeados
O mapeamento em profundidade deverá ocorrer nos componentes cujo `.reduce` ou `.filter` dependem de objetos implícitos.
*   **`Sales.tsx`**: Ajustar o carrinho (`addToCart`) e tipagem local do PDV para respeitar o carrinho heterogêneo (Produtos + Serviços).
*   **`GlobalSearch.tsx`**: O estado/loop do buscador central utiliza `.map((s: any) => )`. Devem ser usadas implementações do tipo Discriminador de União ("Type Union"), ex: `Array<User | Sale | Client>`.
*   **`ProfitabilityReport.tsx`**: O cálculo de LTV/DRE mapeia listas brutas do Firestore usando `any`. Fornecer à closure o tipo explícito da entidade correspondente antes das somatórias em `.reduce`.

---

### Execução Estratégica Sugerida
Para facilitar os próximos passos do agente, divida a implementação da Issue 01 nestes "Milestones" quando pedir a elaboração:
1.  **Etapa 1:** Atualização Global de Types (`package.json`, typings ausentes e `src/types.ts`).
2.  **Etapa 2:** Tipagem de Framework Core (`api.ts`, `inventory.ts`, `offlineStore.ts` e `sw.ts`).
3.  **Etapa 3:** Correção nos Grandes Módulos Relatórios / PDV (Componentes React do `src/pages` e `src/components`).
