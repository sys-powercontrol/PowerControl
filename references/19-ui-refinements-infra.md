# Issue 19: Refinamentos de UI e Infraestrutura (PWA/Índices)

## Descrição
Implementar melhorias de infraestrutura, suporte a PWA e otimização de banco de dados.

## Critérios de Aceite
- [ ] **InputMask**: Integrar o componente `InputMask.tsx` em todos os formulários de cadastro (Clientes, Fornecedores, Empresa).
- [ ] **PWA**: Configurar `manifest.json` e Service Workers para tornar o app instalável.
- [ ] **Mobile**: Otimizar layouts de tabelas para visualização em dispositivos móveis (modo Card).
- [ ] **Índices**: Criar índices compostos no Firestore para otimizar buscas complexas.

## Detalhes Técnicos
- **PWA**: Utilizar `vite-plugin-pwa` para facilitar a configuração.
- **Firestore**: Atualizar `firestore.indexes.json` com índices para Auditoria, Financeiro e Vendas.
- **CSS**: Utilizar classes utilitárias do Tailwind para responsividade móvel (`block md:table-row`).
