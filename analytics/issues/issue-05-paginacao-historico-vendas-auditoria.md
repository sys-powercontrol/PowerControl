# Issue 05: Implementação de Filtros Temporais no Servidor e Paginação por Cursor em Vendas e Auditoria

**Data e Hora de Geração:** 19/08/2026 11:45:00 (Horário de Brasília - UTC-3)

---

## 1. Descrição
Refatorar as páginas de Histórico de Vendas (`SalesHistory.tsx`) e Logs de Auditoria (`AuditLogs.tsx`) para que não realizem mais download de todo o banco de dados. Aplicar restrições estritas de data e limites de lote com navegação por cursor no servidor Firestore.

---

## 2. Escopo de Arquivos
* `src/pages/SalesHistory.tsx`
* `src/pages/AuditLogs.tsx`

---

## 3. Tarefas de Implementação
1. **Otimização de `src/pages/SalesHistory.tsx`:**
   - **Filtro de Data no Servidor:**
     - Quando o filtro for "Hoje", aplicar `where("sale_date", ">=", startOfDayISO)` e `where("sale_date", "<=", endOfDayISO)`.
     - Aplicar o mesmo critério para "Semana", "Mês" e "Personalizado".
   - **Paginação Inicial e Sob Demanda:**
     - Configurar `_limit: 30` na chamada `api.get`.
     - Integrar botão "Carregar mais vendas" ou rolagem infinita baseada no cursor do último documento retornado.
   - **Resumo de Indicadores do Topo:**
     - Buscar quantidade e total vendido do período usando `api.count` e `api.aggregate` pontuais.

2. **Otimização de `src/pages/AuditLogs.tsx`:**
   - **Remover** a busca irrestrita `{ _all: true }` sem limite.
   - Aplicar janela de data padrão no servidor (últimos 7 dias).
   - Definir `_limit: 50` para a carga inicial.
   - Implementar paginação para navegar em lotes subsequentes de logs.

---

## 4. Critérios de Aceite
- Abrir a tela de Histórico de Vendas com filtro padrão ("Hoje") consome apenas as vendas emitidas no dia (lote de até 30 registros) + 1 leitura de agregação, em vez de todas as vendas históricas da loja.
- A tela de Logs de Auditoria carrega instantaneamente com 50 registros por página, sem sobrecarregar a rede ou a cota do Firestore.
