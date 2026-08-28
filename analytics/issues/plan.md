# Plano de Execução Técnica das Issues de Finalização - Plan.md

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Status do Plano:** Planejado - Pronto para Execução Futura (Sem Implementação Imediata)  
**Diretório das Issues:** `analytics/issues/`

---

## 1. Diretrizes Estratégicas e Premissas

1. **Escopo Estrito de Finalização:** Nenhuma tela, botão, rota ou funcionalidade nova deve ser introduzida. Toda e qualquer ação de código deve ser estritamente focada em completar e amarrar os fluxos já existentes documentados nas issues `01` a `06`.
2. **Garantia de Atomicidade e Integridade de Dados:** Operações que envolvam mais de uma coleção no Firestore (ex: Venda + Estoque + Contas a Receber + Comissões) devem utilizar `runTransaction` ou `writeBatch` para assegurar que não ocorram estados inconsistentes ou parciais.
3. **Invalidamento e Sincronia de Cache:** Garantir a invalidação tempestiva das chaves de consulta no `queryClient` (React Query) e atualização otimista nos pontos críticos de interação.

---

## 2. Ordem de Precedência e Dependências Técnicas

A execução das issues foi ordenada de acordo com o impacto no núcleo transacional e dependências entre dados:

```
[Fase 1: Transações e Integridade Contábil]
    ├── Issue 02: Financeiro, Estornos Atômicos e Extrato
    └── Issue 03: Estoque, Ficha Técnica (BOM) e Transferências
            │
            ▼
[Fase 2: Frente de Operação e Documentos Fiscais]
    ├── Issue 04: Vendas, PDV, Gateway PIX e Fila Offline
    └── Issue 01: Fiscal, NFe/NFCe e Certificado A1
            │
            ▼
[Fase 3: Acessos, Restrições e Auditoria]
    ├── Issue 05: Usuários, Desvinculação e Modal de Planos
    └── Issue 06: Suporte, Anexos e Logs de Auditoria
```

---

## 3. Planejamento Detalhado por Fase

### 3.1. Fase 1: Transações do Núcleo Financeiro e Estoque

#### Issue 02 - Financeiro, Estornos e Conciliação OFX
* **Planejamento Técnico:**
  1. No arquivo `src/lib/finance.ts`, consolidar a função `reverseFinancialTransaction(type, id, details)` utilizando `runTransaction(db, ...)`.
  2. Ler simultaneamente o documento do título (`accounts_receivable` ou `accounts_payable`), a conta bancária vinculada (`bank_accounts/{id}`) e o caixa aberto (`cashiers/{id}`).
  3. No callback da transação, reverter os saldos, atualizar o título para `pendente` e gerar a movimentação de estorno.
  4. Em `AccountsReceivable.tsx` e `AccountsPayable.tsx`, desabilitar o botão de exclusão caso o status seja `pago` ou `recebido`, exibindo tooltip explicativo.
  5. Em `OFXImporter.tsx`, verificar a presença de `fitid` no extrato antes de gravar e ignorar transações já existentes.

#### Issue 03 - Estoque, Insumos BOM e Transferências Atômicas
* **Planejamento Técnico:**
  1. Em `src/lib/inventory.ts`, criar helper `deductProductStockWithBOM(productId, quantity, isReversal)` para calcular recursivamente a dedução/recomposição dos componentes cadastrados em `bom_items`.
  2. Em `Transfers.tsx`, substituir as gravações isoladas por um `writeBatch` contendo a saída do local de origem, a entrada no local de destino e os registros de `inventory_movements`.
  3. Em `Sales.tsx` e `Transfers.tsx`, adicionar a checagem da flag `allow_negative_stock` da empresa, bloqueando a confirmação caso o estoque disponível seja insuficiente.

---

### 3.2. Fase 2: Vendas, Gateway e Documentos Eletrônicos

#### Issue 04 - Vendas, PDV, Gateway PIX e Fila Offline
* **Planejamento Técnico:**
  1. Em `PaymentGateway.tsx`, adicionar hook de polling via `useEffect` ou Firestore snapshot listener na cobrança PIX gerada.
  2. Ao identificar `status === 'paid'`, emitir evento `onSuccess` que invoca a finalização da venda em `Sales.tsx` e fecha o modal.
  3. Em `SalesHistory.tsx`, ao acionar o cancelamento de venda, executar o estorno de estoque (via `deductProductStockWithBOM`), o cancelamento dos títulos a receber e anulação da comissão.
  4. Em `src/lib/offlineStore.ts`, expurgar a venda local sincronizada logo após a confirmação do Firestore.

#### Issue 01 - Fiscal, NFe/NFCe e Certificados
* **Planejamento Técnico:**
  1. Em `src/pages/Fiscal.tsx`, ao processar a resposta do cancelamento da SEFAZ, atualizar `invoices/{id}` e `sales/{saleId}` síncronamente.
  2. Na exportação em lote de XMLs, adicionar busca assíncrona para itens sem `xml_content` em cache antes do empacotamento com JSZip.
  3. Antes de disparar transmissões fiscais, verificar `certificate.valid_until` em `CertificateManager.tsx` e alertar preventivamente caso expirado.
  4. Em `src/lib/fiscal.ts`, mapear os campos tributários dos itens a partir das regras fiscais cadastradas.

---

### 3.3. Fase 3: Acessos, Planos e Auditoria

#### Issue 05 - Usuários, Desvinculação e Planos
* **Planejamento Técnico:**
  1. Em `Employees.tsx`, ao desvincular colaborador, utilizar `writeBatch` para remover o `company_id` do documento `users/{userId}` e atualizar o status em `employees`.
  2. Em `Products.tsx` e `ProductDetailsModal.tsx`, verificar a flag `disable_product_images` e sobrepor o `UpgradePlanModal` com camada superior (`z-[999999]`).

#### Issue 06 - Suporte, Anexos e Logs de Auditoria
* **Planejamento Técnico:**
  1. Em `Support.tsx`, adicionar componente de visualização em lightbox para as imagens anexadas aos chamados.
  2. Auditar os métodos de cancelamento e exclusão em `src/lib/api.ts` para garantir o envio de logs com `{ action, entity, details }`.

---

## 4. Plano de Validação e Testes de Regressão

| Etapa | Teste Previsto | Resultado Esperado |
| :--- | :--- | :--- |
| **01** | Estorno de Conta a Receber paga via Caixa e Banco | Saldos do caixa e da conta bancária atualizados atomicamente sem desvios |
| **02** | Venda e Cancelamento de Produto com BOM | Insumos deduzidos na venda e integralmente repostos no cancelamento |
| **03** | Pagamento de PIX no PDV | Fechamento automático do modal e conclusão da venda após o pagamento |
| **04** | Cancelamento de NFe autorizada | Status atualizado para `Cancelada` na NFe e na Venda simultaneamente |
| **05** | Desvinculação de Usuário em Filial | Usuário perde acesso à filial imediatamente no array `company_ids` |
| **06** | Teste de Build & Lint | `npm run lint` e `npm run build` executam com status de sucesso sem regressão |
