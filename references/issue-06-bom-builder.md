# Issue 06: Construtor de Kits/BOM (`BOMBuilder.tsx`)

## Descrição
Implementar a funcionalidade de composição de produtos (Bill of Materials).

## Requisitos
- Criar o componente `src/components/BOMBuilder.tsx` e integrá-lo ao formulário de cadastro de produtos.
- Funcionalidade: Permitir selecionar outros produtos que compõem o item atual (Kit).
- Comportamento:
    - Ao realizar a venda do item "Pai", o sistema deve abater proporcionalmente o estoque de todos os itens "Filhos" que o compõem.
