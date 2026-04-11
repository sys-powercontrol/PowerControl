# Plano de Implementação: Integração Universal de Exportação (Issue 05)

Este documento descreve o plano para integrar o componente `ExportButton` em todas as telas de listagem relevantes do sistema, permitindo a exportação de dados em PDF e Excel.

## 1. Estado Atual
- O componente `ExportButton.tsx` já existe e suporta exportação para PDF (via `jspdf`) e Excel (via `xlsx`).
- Ele já está integrado em: `SalesHistory`, `CommissionPayouts`, `InventoryHistory`, `AccountsPayable`, `AccountsReceivable` e `InventoryTurnoverReport`.

## 2. Telas Alvo para Integração
As seguintes telas de listagem devem receber os botões de exportação:

### Cadastros Base
- [ ] **Produtos (`Products.tsx`)**: Exportar lista de produtos, preços e estoque.
- [ ] **Serviços (`Services.tsx`)**: Exportar lista de serviços e preços.
- [ ] **Clientes (`Clients.tsx`)**: Exportar base de clientes.
- [ ] **Fornecedores (`Suppliers.tsx`)**: Exportar base de fornecedores.
- [ ] **Vendedores (`Sellers.tsx`)**: Exportar lista de vendedores e metas.

### Movimentações e Relatórios
- [ ] **Fiscal (`Fiscal.tsx`)**: Exportar lista de Notas Fiscais (NF-e/NFC-e).
- [ ] **Histórico de Compras (`PurchaseHistory.tsx`)**: Exportar histórico de compras realizadas.
- [ ] **Logs de Auditoria (`AuditLogs.tsx`)**: Exportar trilha de auditoria para conformidade.
- [ ] **Fluxo de Caixa (`CashFlowReport.tsx`)**: Exportar relatório detalhado de entradas e saídas.
- [ ] **Contas Bancárias (`BankAccounts.tsx`)**: Exportar saldos e lista de contas.

## 3. Padrão de Implementação
Para cada tela, o processo será:
1. Importar o componente: `import ExportButton from "../components/ExportButton";`
2. Definir o mapeamento de cabeçalhos (`headers`) para traduzir as chaves do objeto para nomes amigáveis em português.
3. Adicionar dois botões (PDF e Excel) no cabeçalho da página ou próximo aos filtros.

### Exemplo de Mapeamento (Produtos):
```typescript
const exportHeaders = {
  sku: "SKU",
  name: "Produto",
  category_name: "Categoria",
  price: "Preço Venda",
  stock_quantity: "Estoque"
};
```

## 4. Considerações de Design
- Os botões devem ser agrupados para economizar espaço em telas menores.
- Usar ícones consistentes (já fornecidos pelo `ExportButton`).
- Garantir que os dados exportados respeitem os filtros aplicados na tela (usar a lista filtrada como fonte para o `data` do componente).

## 5. Próximos Passos
1.  Iterar sobre as telas da lista acima.
2.  Testar a exportação em cada uma para garantir que os campos estão mapeados corretamente.
3.  Verificar se o layout permanece responsivo após a adição dos botões.
