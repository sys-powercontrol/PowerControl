# Issue 03 - Finalização do Módulo de Estoque, Movimentações e Ficha Técnica (BOM)

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Estoque & Movimentações  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.3  
**Criticidade:** Alta  

---

## 1. Descrição do Problema
O cadastro de produtos com ficha técnica (BOM), transferências entre locais de estoque e ajustes manuais estão construídos na interface. Falta assegurar a dedução e estorno automático dos insumos que compõem produtos compostos no momento da venda, além da garantia de atomicidade nas transferências e respeito à trava de estoque negativo.

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Baixa e Estorno Automático de Insumos da Ficha Técnica (BOM)
- **Arquivos:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/inventory.ts`
- **Ação:**
  1. Identificar se o produto vendido possui o tipo `composto` com lista de `bom_items`.
  2. Ao finalizar a venda, debitar do estoque as quantidades proporcionais de cada insumo componente.
  3. Ao cancelar a venda, devolver ao estoque a quantidade exata de cada insumo debitado anteriormente.

### 2.2. Atomicidade em Transferências entre Locais de Estoque
- **Arquivos:** `src/pages/Transfers.tsx`, `src/lib/inventory.ts`
- **Ação:**
  1. Executar a transferência de estoque (saída do local de origem e entrada no local de destino) através de uma única transação atômica no Firestore.
  2. Registrar dois apontamentos vinculados em `inventory_movements` (`TRANSFER_OUT` e `TRANSFER_IN`).

### 2.3. Respeito à Regra de Bloqueio de Estoque Negativo
- **Arquivos:** `src/pages/Sales.tsx`, `src/pages/Transfers.tsx`
- **Ação:**
  1. Verificar o parâmetro `allow_negative_stock` da empresa ativa.
  2. Caso o parâmetro esteja desabilitado, impedir a operação caso o saldo final de qualquer item (ou insumo da BOM) resulte em valor menor que zero.

---

## 3. Critérios de Aceite
- [ ] Venda de produto com BOM deduz os insumos do estoque; cancelamento recompõe os insumos.
- [ ] Transferência entre locais não deixa estados inconsistentes em caso de erro no destino.
- [ ] Bloqueio de estoque negativo impede saídas não autorizadas quando configurado.
