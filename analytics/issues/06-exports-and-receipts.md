# Issue 6: Documentos PDF, Recibos Térmicos e Exportações CSV

*   **Page(s):** `/Sales`, `/SalesHistory`, Diversos (Relatórios)
*   **Component(s):** `InvoiceReceiptPrinter`, `A4QuotePrinter`, `ExportToExcelButton`.
*   **Behavior:** 
    *   **Vendas:** No fim de uma venda, oferecer botões "Imprimir Recibo (80mm)" e "Salvar Orçamento (PDF A4)". Construir templates de Print Window (CSS `@media print`) que apliquem layouts puros isolando barras laterais e cabeçalhos principais do sistema. O A4Quote deve conter o logotipo da empresa configurado no banco. O Recibo 80mm também deve estar re-acessível nos detalhes dentro da página `SalesHistory`.
    *   **Exportações:** Ampliar o botão de exportar para páginas de tabela densas (Estoque, Histórico, Contas Pagar), lendo o state/JSON atual do ag-grid ou table manual, transformando em .CSV com vírgula via Blob/ObjectURL ou XLSX.
