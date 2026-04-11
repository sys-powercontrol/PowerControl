# Plano de Implementação: Geração de Etiquetas - Issue 11

Este documento detalha o plano para a funcionalidade de geração de etiquetas de produtos com código de barras.

## 1. Objetivos
- Permitir a impressão de etiquetas de gôndola ou de produto para facilitar a identificação e precificação.
- Gerar PDFs formatados para diferentes tipos de papel/etiquetas (A4, impressoras térmicas).

## 2. Análise da Situação Atual
A funcionalidade já foi implementada no componente `src/components/LabelPrinter.tsx` e está integrada à tela de Produtos (`src/pages/Products.tsx`).

### Funcionalidades já presentes que atendem aos requisitos:
- **Componente `LabelPrinter.tsx`**: Criado e funcional.
- **Seleção de Produtos e Quantidades**: O usuário pode buscar produtos, selecioná-los e definir a quantidade de etiquetas a serem impressas para cada um.
- **Geração de PDF**: Utiliza as bibliotecas `jspdf` e `jsbarcode` para gerar o arquivo PDF.
- **Layouts Pré-definidos**: O sistema já possui configurações de layout para:
  - Pimenta 6180 (3x7)
  - Avery 5160 (3x10)
  - Etiqueta Única (80x40 - térmica)
- **Conteúdo da Etiqueta**: Inclui Nome do Produto, Preço de Venda e Código de Barras (EAN13 ou CODE128 baseado no SKU ou ID do produto).

## 3. Próximos Passos (Melhorias Futuras)
Embora a funcionalidade principal já esteja pronta e atendendo aos critérios de aceite, podemos considerar as seguintes melhorias futuras:
1. **Customização de Layout**: Permitir que o usuário crie e salve seus próprios presets de layout (tamanho da etiqueta, margens, colunas, etc).
2. **Campos Adicionais**: Opção para incluir ou ocultar informações na etiqueta (ex: ocultar preço, mostrar validade, mostrar lote).
3. **Impressão Direta**: Integração com APIs de impressão (como QZ Tray) para enviar o comando de impressão diretamente para a impressora térmica sem precisar baixar o PDF.

## 4. Conclusão
A Issue 11 já está implementada e funcional no sistema. O componente `LabelPrinter` atende a todos os requisitos e critérios de aceite definidos.
