# Issue 18: Exportação de Relatórios (PDF/Excel)

## Descrição
Implementar a funcionalidade de exportação de dados para formatos PDF e Excel em todos os relatórios do sistema.

## Critérios de Aceite
- [ ] **PDF**: Exportar tabelas (Vendas, Financeiro, Kardex) para PDF com layout profissional.
- [ ] **Excel**: Exportar dados para planilhas `.xlsx` para análise contábil.
- [ ] **Componente**: Criar um componente `ExportButton` reutilizável.
- [ ] **Integração**: Adicionar o botão de exportação nas páginas de Dashboard, Vendas, Financeiro e Histórico de Estoque.

## Detalhes Técnicos
- **Bibliotecas**: `jspdf`, `jspdf-autotable`, `xlsx`.
- **Componente**: `/src/components/ui/ExportButton.tsx`.
- **Funcionalidade**: O componente deve aceitar um array de objetos e gerar o arquivo correspondente.
