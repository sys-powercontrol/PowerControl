# Issue 05: Recálculo Estruturado de Custos em Ficha Técnica (BOM)

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Implementar o recálculo automático em cascata do valor de custo (`cost_price`) dos produtos compostos (Kits/BOM) sempre que houver alteração no preço de custo de um insumo ou matéria-prima componente.

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/Products.tsx`, `src/lib/inventory.ts`, `src/pages/InventoryAdjustments.tsx`
- **Banco de Dados:** Firestore (`products`, `inventory_movements`, `audit_logs`)

---

## 3. Requisitos de Comportamento
1. Ao salvar alterações no valor de custo (`cost_price`) de qualquer produto do tipo insumo/matéria-prima, identificar todos os produtos compostos que contêm esse item na lista `bom_items`.
2. Para cada produto composto afetado, recalcular o novo custo total através da fórmula: `sum(item.quantity * novo_custo_insumo)`.
3. Atualizar o `cost_price` do produto acabado no Firestore e emitir registro de auditoria documentando a variação de custo.
