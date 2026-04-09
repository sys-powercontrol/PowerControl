# Issue 13: Integrações de API: ViaCEP e ReceitaWS

## Descrição
Implementar integrações com as APIs ViaCEP e ReceitaWS para agilizar o preenchimento de cadastros.

## Critérios de Aceite
- [ ] **ViaCEP**: Autocompletar endereço (Rua, Bairro, Cidade, UF) ao digitar o CEP no cadastro de Clientes, Fornecedores e Empresa.
- [ ] **ReceitaWS**: Consultar dados da empresa (Razão Social, Nome Fantasia, Endereço, Atividade Econômica) automaticamente ao digitar o CNPJ no cadastro de Empresa e Fornecedores.
- [ ] **Feedback**: Exibir um indicador de carregamento durante a consulta.
- [ ] **Erro**: Exibir uma mensagem de erro se a consulta falhar ou o CEP/CNPJ for inválido.

## Detalhes Técnicos
- **API**: `https://viacep.com.br/ws/{cep}/json/`, `https://www.receitaws.com.br/v1/cnpj/{cnpj}`.
- **Biblioteca**: Utilizar `axios` ou `fetch` para realizar as requisições.
- **Validação**: Verificar se o CEP/CNPJ é válido antes de realizar a consulta.
- **Integração**: Adicionar um botão de consulta ao lado dos campos de CEP e CNPJ.
