# Issue 10: Componente de UI: Máscaras de Input

## Descrição
Implementar um componente reutilizável para máscaras de input (CPF, CNPJ, Telefone, CEP).

## Critérios de Aceite
- [ ] **Funcionalidade**: Componente wrapper para inputs que exigem formatação específica.
- [ ] **Máscaras**: CPF (000.000.000-00), CNPJ (00.000.000/0000-00), Telefone ((00) 00000-0000), CEP (00000-000).
- [ ] **Validação**: Impedir a entrada de caracteres inválidos (ex: letras em campos numéricos).
- [ ] **Integração**: Substituir os inputs existentes nos formulários de cadastro (Clientes, Fornecedores, Empresa, Usuário).

## Detalhes Técnicos
- **Componente**: `/src/components/ui/InputMask.tsx`.
- **Biblioteca**: Utilizar uma biblioteca de máscaras (ex: `react-input-mask`, `imask`).
- **Props**: `mask`, `value`, `onChange`, `placeholder`, `className`.
- **Validação**: Adicionar uma função de validação para garantir que o valor inserido corresponda ao formato esperado.
