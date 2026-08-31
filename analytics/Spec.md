# Especificação Técnica de Finalizações do Sistema (Spec)

**Data e Hora de Geração:** 29 de Agosto de 2026 às 20:45:49 (Horário de Brasília - UTC-3)  
**Documento de Referência:** `analytics/report.md`  
**Escopo:** Especificação estrita do que falta implementar e finalizar no sistema, sem inclusão de novas páginas ou recursos fora do escopo original.

---

## 1. Módulo: Compras & Gestão de Estoque

### 1.1 Página / Componente: `src/pages/PurchaseHistory.tsx` & `src/lib/inventory.ts`
- **Comportamento Atual:** Cancelamento e exclusão de compras executam a reversão de pagamento mas não estornam o saldo dos itens que deram entrada no estoque.
- **Comportamento Especificado:**
  - **Função `inventory.reversePurchaseStock(purchase)`:**
    - Para cada item presente no array `purchase.items`:
      - Subtrair a quantidade comprada (`item.quantity`) do estoque do produto (`stock_quantity`).
      - Registrar movimentação no histórico de estoque (`stock_movements`) com o tipo `"PURCHASE_CANCEL"`, apontando a compra de origem.
  - **Função `cancelPurchaseMutation` e `deletePurchaseMutation`:**
    - Executar atomicamente `reversePurchasePayment(purchase)`, `inventory.reversePurchaseStock(purchase)`, atualizar contas a pagar atreladas (`status: "Cancelado"`) e definir a compra com `status: "Cancelada"`.
    - Registrar log de auditoria com usuário e data/hora.

---

## 2. Módulo: Caixa & Fechamento de Turno

### 2.1 Página / Componente: `src/pages/Cashiers.tsx`
- **Comportamento Atual:** Ao fechar o caixa com diferença (`counted !== expected`), o sistema persiste a observação no documento do caixa, mas não realiza o lançamento de ajuste na contabilidade diária nem possui visualizador detalhado de turnos passados.
- **Comportamento Especificado:**
  - **Ajuste Automático de Diferença de Caixa:**
    - Se `counted < expected` (Quebra de Caixa): gerar movimentação (`movements`) de saída/despesa `"Ajuste de Quebra de Caixa"` vinculada ao caixa com o valor da falta.
    - Se `counted > expected` (Sobra de Caixa): gerar movimentação (`movements`) de entrada/receita `"Ajuste de Sobra de Caixa"` vinculada ao caixa com o valor do excesso.
  - **Modal de Histórico de Fechamentos:**
    - Ao clicar no botão de histórico de um caixa, listar os ciclos fechados em ordem cronológica decrescente exibindo: operador de abertura, operador de fechamento, data/hora de abertura/fechamento, valor de abertura, total de vendas, total de sangrias/suprimentos, saldo esperado, saldo contado e diferença apurada.

---

## 3. Módulo: Clientes & Cadastro PJ

### 3.1 Página / Componente: `src/pages/Clients.tsx`
- **Comportamento Atual:** O cadastro de clientes possui busca por CEP, mas quando se trata de pessoa jurídica, os dados de Razão Social e Endereço precisam ser preenchidos manualmente.
- **Comportamento Especificado:**
  - **Botão de Consulta CNPJ:**
    - Ao lado do campo de Documento (CPF/CNPJ), exibir botão de busca quando o documento tiver 14 dígitos.
    - Ao acionar, chamar `externalApi.fetchCNPJ(cleanCNPJ)`.
    - Autopreencher: Razão Social/Nome, E-mail, Telefone, CEP, Logradouro, Número, Bairro, Cidade e UF.
    - Exibir feedback de carregamento com `Loader2` e toasts informativos de sucesso/erro.

---

## 4. Módulo: Fiscal & Visualização de DANFE

### 4.1 Página / Componente: `src/components/DanfeViewer.tsx`
- **Comportamento Atual:** Modal de visualização exibe primariamente o layout em PDF A4 padrão.
- **Comportamento Especificado:**
  - **Suporte a NFC-e Térmica:**
    - Adicionar propriedade opcional `model?: '55' | '65'` ou detectar NFC-e a partir dos dados da nota.
    - Para NFC-e (modelo 65), disponibilizar alternância de layout ou botão específico para impressão de cupom térmico (58mm/80mm) formatado com QR-Code de consulta e dados resumidos da venda.
