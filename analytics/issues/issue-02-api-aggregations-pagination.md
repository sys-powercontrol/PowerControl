# Issue 02: Implementação de Agregações Nativas de Servidor (`count()`, `sum()`) e Paginação por Cursor em `src/lib/api.ts`

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Dotar a camada de abstração de dados (`src/lib/api.ts`) de primitivas de alto desempenho para agregações nativas executadas no servidor Firestore (reduzindo milhares de leituras para apenas 1) e suporte a paginação por cursor (`startAfter` + `limit`) e filtros de janela temporal no servidor.

---

## 2. Escopo de Arquivos
* `src/lib/api.ts`

---

## 3. Tarefas de Implementação
1. **Método `api.count` (Contagem no Servidor):**
   - Importar `getCountFromServer` de `firebase/firestore`.
   - Implementar `api.count(entityPath: string, params?: Record<string, any>): Promise<number>`.
   - Garantir que respeita as regras de isolamento multi-tenant (`company_id`).
   - Retornar a contagem sem instanciar ou baixar os documentos.

2. **Método `api.aggregate` (Totais e Médias no Servidor):**
   - Importar `getAggregateFromServer`, `sum`, `average` de `firebase/firestore`.
   - Implementar `api.aggregate(entityPath: string, aggregations: { sumFields?: string[], avgFields?: string[] }, params?: Record<string, any>): Promise<Record<string, number>>`.
   - Viabilizar somatórios de `total_price`, `amount`, `cost_price` diretamente no motor do Firestore.

3. **Suporte a Paginação por Cursor em `api.getPage` / `api.get`:**
   - Adicionar parâmetros de controle:
     - `_limit`: número máximo de documentos por lote (default: 50).
     - `_startAfter`: snapshot do último documento retornado ou ID de cursor.
     - `_startDate` / `_endDate` / `_dateField`: restrição direta por data (`where(dateField, '>=', startDate)`).
   - Retornar estrutura padronizada: `{ items: T[], lastDoc: DocumentSnapshot | null, hasMore: boolean }`.

4. **Tratamento de Fallback e Cache:**
   - Assegurar que falhas transitórias de conexão ou limites de cota recorram com segurança ao cache local persistente.

---

## 4. Critérios de Aceite
- Executar `api.count("sales", { company_id })` sobre 10.000 vendas consome apenas 1 leitura no Firestore.
- Executar `api.aggregate("accountsPayable", { sumFields: ["amount"] })` calcula o valor total devido consumindo apenas 1 leitura.
- Listagens paginadas trazem estritamente o lote solicitado (`_limit`), sem baixar a coleção completa.
