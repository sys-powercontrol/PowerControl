# Issue 30: Impressão de Etiquetas

## Descrição
Implementar funcionalidade para geração e impressão de etiquetas de gôndola ou de produto com código de barras.

## Requisitos
- Criar o componente `src/components/LabelPrinter.tsx`.
- Permitir a seleção de múltiplos produtos para impressão.
- Gerar arquivo PDF com layout configurável de etiquetas (ex: Pimenta, Avery).
- Cada etiqueta deve conter: Nome do Produto, Preço de Venda e Código de Barras (EAN-13).
- Utilizar biblioteca `jsPDF` para geração do documento.
