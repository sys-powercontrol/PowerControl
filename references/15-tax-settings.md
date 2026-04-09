# Issue 15: Configurações Tributárias

## Descrição
Implementar a página de configurações tributárias para gerenciar regras fiscais, NCM e alíquotas.

## Critérios de Aceite
- [ ] **Página**: Criar `/src/pages/TaxSettings.tsx`.
- [ ] **NCM**: Cadastro de regras fiscais baseadas no NCM (Nomenclatura Comum do Mercosul).
- [ ] **Alíquotas**: Configuração de alíquotas de ICMS, IPI, PIS e COFINS.
- [ ] **CFOP**: Definição de CFOP padrão para operações internas e interestaduais.
- [ ] **Vínculo**: Permitir vincular categorias de produtos a perfis tributários específicos.

## Detalhes Técnicos
- **Coleção Firestore**: `tax_rules`.
- **Componente**: `TaxRuleForm` para edição de regras.
- **Integração**: Utilizar estas regras no cálculo de impostos durante a emissão de NFe/NFCe.
