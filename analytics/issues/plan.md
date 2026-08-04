# Plano de Execução Técnica das Issues de Finalização

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Diretrizes Estratégicas do Plano
Este plano detalha a ordem lógica, dependências técnicas e checklist de testes para executar o fechamento de todas as 6 issues mapeadas na pasta `/analytics/issues/`. Nenhuma alteração de código será executada antes da aprovação explícita das fases planejadas.

---

## 2. Ordem de Execução e Dependências

```
+------------------------------------+       +------------------------------------+
|  Fase 1: Transacional e Estoque    |       |  Fase 2: Automação Financeira      |
|  - Issue 01 (Vendas Offline)       | ----> |  - Issue 02 (Recorrências)         |
|  - Issue 05 (Recálculo Custos BOM) |       |  - Issue 03 (Conciliação OFX)      |
+------------------------------------+       +------------------------------------+
                                                        |
                                                        v
                                             +------------------------------------+
                                             |  Fase 3: Fiscal e Comissões        |
                                             |  - Issue 04 (XMLs ZIP & Conting.)  |
                                             |  - Issue 06 (Fechamento Comissões) |
                                             +------------------------------------+
```

---

## 3. Planejamento Detalhado por Issue

### FASE 1: Transações do Core Operacional e Custos

#### 3.1 Issue 01 - Sincronização Transacional de Vendas Offline
- **Objetivo:** Impedir a dessincronização entre saldos de estoque, caixa e títulos de vendas offline.
- **Passos de Implementação Planejados:**
  1. No arquivo `src/lib/offlineStore.ts`, expor método `syncPendingSalesWithTransaction()`.
  2. Utilizar `runTransaction(db, async (transaction) => { ... })` para garantir atomicidade Firestore.
  3. No callback `onLine`, invocar a sincronização e despachar evento para re-renderizar badges em `SalesHistory.tsx`.
- **Cenários de Teste:**
  - Simular queda de rede, realizar venda no PDV e restaurar a rede.
  - Verificar se a venda foi gravada, estoque decrementado e badge alterado para "Sincronizado".

#### 3.2 Issue 05 - Recálculo Estruturado de Custos em Ficha Técnica (BOM)
- **Objetivo:** Manter a margem de lucro e o preço de custo dos produtos compostos sempre atualizados.
- **Passos de Implementação Planejados:**
  1. Em `src/lib/inventory.ts`, criar helper `recalculateBOMProductsCost(rawMaterialId: string, newCost: number)`.
  2. Em `src/pages/Products.tsx`, ao atualizar o campo `cost_price` de uma matéria-prima, acionar a função helper.
  3. Registrar o log da alteração de custo na coleção `audit_logs`.
- **Cenários de Teste:**
  - Alterar o valor de custo de um insumo de R$ 10,00 para R$ 15,00.
  - Confirmar se o custo do Kit final composto por 2 unidades desse insumo passou automaticamente de R$ 20,00 para R$ 30,00.

---

### FASE 2: Automação e Inteligência Financeira

#### 3.3 Issue 02 - Gestão de Baixa e Alteração em Cascata de Recorrências
- **Objetivo:** Evitar refazer baixa/edição manual em múltiplos meses de contas recorrentes.
- **Passos de Implementação Planejados:**
  1. Criar modal reutilizável `RecurrenceConfirmModal.tsx` com as opções "Apenas este lançamento" e "Este e lançamentos futuros".
  2. Integrar o modal em `AccountsPayable.tsx` e `AccountsReceivable.tsx`.
  3. Em `src/lib/finance.ts`, adicionar função de atualização em lote `updateFutureRecurrences()`.
- **Cenários de Teste:**
  - Editar a categoria de uma conta de energia recorrente com a opção "Em cascata".
  - Verificar se todas as parcelas subsequentes assumiram a nova categoria.

#### 3.4 Issue 03 - Algoritmo de Score de Match e Conciliação OFX em Lote
- **Objetivo:** Automatizar o cruzamento bancário com alta precisão visual.
- **Passos de Implementação Planejados:**
  1. Em `src/components/Financial/OFXImporter.tsx`, implementar a função `calculateMatchScore(ofxItem, systemItem)`.
  2. Atribuir notas: 50 pontos para valor igual, 30 pontos para data aproximada (±3 dias), 20 pontos para equivalência textual.
  3. Adicionar botão "Conciliar Lote Selecionado" para atualizar `reconciled: true` nos documentos correspondentes.
- **Cenários de Teste:**
  - Importar extrato OFX de teste e verificar se as sugestões de match exibem os percentuais corretos (ex: 100%, 80%, 50%).
  - Executar baixa em lote e verificar atualização do saldo bancário.

---

### FASE 3: Fechamento Fiscal e Integração de Comissões

#### 3.5 Issue 04 - Empacotamento de XMLs Fiscais em ZIP e Sincronização de Contingência
- **Objetivo:** Facilitar a rotina mensal de envio fiscal para a contabilidade e resolver notas presas.
- **Passos de Implementação Planejados:**
  1. Utilizar a biblioteca `JSZip` para reunir as strings de XML das notas `authorized` do mês em `Fiscal.tsx`.
  2. Disparar download do arquivo `.zip` com o nome padronizado `xmls_nfe_MM_YYYY.zip`.
  3. Criar rotina de consulta ao serviço da SEFAZ para reprocessamento de notas pendentes/contingência.
- **Cenários de Teste:**
  - Filtrar mês atual, clicar em "Exportar XMLs (ZIP)" e validar o conteúdo extraído.

#### 3.6 Issue 06 - Fechamento de Comissões e Integração Financeira
- **Objetivo:** Eliminar o lançamento manual de pagamentos de comissão no Contas a Pagar.
- **Passos de Implementação Planejados:**
  1. No handler de confirmação de pagamento de `CommissionPayouts.tsx`, efetuar chamada para criar documento em `accountsPayable`.
  2. No handler de estorno de venda em `SalesHistory.tsx`, marcar a comissão pendente como `canceled`.
- **Cenários de Teste:**
  - Liquidar comissão de R$ 500,00 de um vendedor e verificar o surgimento do lançamento no Contas a Pagar.
  - Estornar uma venda e confirmar o cancelamento da comissão correspondente.

---

## 4. Conclusão
Este plano de execução estruturado assegura a finalização completa de todas as pendências com transparência, segurança transacional e zero adição de escopo desnecessário.
