# Plano de Implementação: Exportação de Relatórios (Issue 18)

Este documento detalha o plano para a implementação da funcionalidade de exportação de dados para formatos PDF e Excel em todo o sistema PowerControl.

## 1. Dependências Necessárias

Para garantir exportações de alta qualidade, utilizaremos as seguintes bibliotecas:
- **`jspdf`**: Biblioteca base para geração de PDFs no navegador.
- **`jspdf-autotable`**: Plugin para `jspdf` que facilita a criação de tabelas complexas com cabeçalhos e estilos automáticos.
- **`xlsx`**: Biblioteca padrão para leitura e escrita de arquivos Excel (`.xlsx`, `.csv`).

---

## 2. Componente Reutilizável: `ExportButton`

O componente será localizado em `src/components/ui/ExportButton.tsx` e terá a seguinte interface:

### 2.1. Props do Componente
```typescript
interface ExportButtonProps {
  data: any[];           // Array de objetos com os dados
  columns: {             // Definição das colunas (header e key)
    header: string;
    key: string;
  }[];
  filename: string;      // Nome base do arquivo (ex: "vendas_marco")
  title: string;         // Título que aparecerá no topo do PDF
}
```

### 2.2. Funcionalidades do Botão
- Menu dropdown (usando `motion` para animação) com opções:
    - **Exportar para PDF**
    - **Exportar para Excel (XLSX)**
    - **Exportar para CSV**

---

## 3. Lógica de Exportação

### 3.1. Geração de PDF (`jspdf-autotable`)
- Configurar layout paisagem (`landscape`) para tabelas com muitas colunas.
- Adicionar cabeçalho com o nome da empresa e data da exportação.
- Estilizar a tabela com cores semânticas (ex: azul para cabeçalho).
- Rodapé com numeração de páginas.

### 3.2. Geração de Excel (`xlsx`)
- Converter o array de objetos em uma `worksheet`.
- Criar um `workbook` e anexar a planilha.
- Disparar o download automático do arquivo `.xlsx`.

---

## 4. Pontos de Integração

O `ExportButton` será adicionado nas seguintes páginas:
1.  **Vendas (`SalesHistory.tsx`)**: Exportação do histórico de vendas filtrado.
2.  **Financeiro (`AccountsPayable.tsx` / `AccountsReceivable.tsx`)**: Listagem de contas.
3.  **Estoque (`InventoryHistory.tsx`)**: Movimentações de entrada e saída.
4.  **Dashboard Global (`GlobalDashboard.tsx`)**: Resumo de performance das empresas.

---

## 5. Próximos Passos (Ordem de Execução)
1.  [ ] Instalar as dependências via `install_applet_package`.
2.  [ ] Criar o componente `ExportButton.tsx` com a lógica de PDF e Excel.
3.  [ ] Adicionar o botão na página de **Histórico de Vendas** como primeiro caso de teste.
4.  [ ] Replicar a integração nas demais páginas de relatórios.
5.  [ ] Validar a formatação dos dados (moeda, datas) nos arquivos exportados.
