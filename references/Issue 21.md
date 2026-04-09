# Issue 21: Componentes Fiscais (Badge e Viewer)

## Descrição
Criar componentes visuais para suporte ao módulo fiscal.

## Requisitos
- **NfeStatusBadge**:
    - Criar em `src/components/NfeStatusBadge.tsx`.
    - Suportar status: 'Autorizada', 'Rejeitada', 'Cancelada', 'Pendente'.
    - Cores semânticas (Verde, Vermelho, Cinza, Amarelo).
- **DanfeViewer**:
    - Criar em `src/components/DanfeViewer.tsx`.
    - Modal que recebe URL do PDF ou XML.
    - Renderizar em iframe ou visualizador de PDF.
    - Incluir botões de "Imprimir" e "Baixar PDF".
