# Relatório de Análise do Sistema: Funcionalidades Pendentes e Incompletas

Este relatório apresenta uma análise geral do sistema PowerControl, destacando os módulos, integrações e funcionalidades que ainda precisam ser terminados, aprimorados ou que atualmente funcionam apenas como simulações (mocks).

## 1. Integração Fiscal (NFe / NFCe)
A área fiscal é a que apresenta o maior número de pendências críticas para operação em produção:

*   **Provedor WebmaniaBR:** A integração com a WebmaniaBR está marcada como "Em breve" na interface e, no código (`src/services/fiscalApi.ts`), lança um erro de "Provedor fiscal não suportado". Atualmente, apenas o esqueleto do FocusNFe está parcialmente estruturado.
*   **Gerenciamento de Certificados Digitais (`CertificateManager.tsx`):**
    *   **Extração de Dados Mockada:** O sistema não extrai a data de validade real do arquivo PFX enviado. Ele simula uma validade adicionando 1 ano à data atual.
    *   **Vulnerabilidade de Segurança:** A senha do certificado digital está sendo salva em texto plano diretamente no banco de dados (Firestore). É estritamente necessário implementar um cofre de senhas (Secret Manager) ou criptografia forte antes de ir para produção.
*   **Cancelamento de Notas:** Se o sistema não encontrar um token fiscal configurado, a função de cancelamento (`Fiscal.tsx`) faz um *fallback* e apenas altera o status da nota para "Cancelada" no banco de dados local, sem realizar a comunicação real com a SEFAZ.

## 2. Sistema de Suporte e Atendimento
*   **Formulário de Contato (`Support.tsx`):** O formulário de envio de mensagens para o suporte é inteiramente visual (mock). Ele utiliza um `setTimeout` de 1.5 segundos para simular o envio e exibir uma mensagem de sucesso, mas não dispara nenhum e-mail, nem salva o ticket de suporte no banco de dados.

## 3. Conciliação Bancária e Importação OFX
*   **Algoritmo de Correspondência (`OFXImporter.tsx`):** A conciliação automática de transações importadas via arquivo OFX utiliza um algoritmo básico de similaridade de strings (Coeficiente de Dice). Embora funcional para testes, para um ambiente de produção financeiro, este algoritmo precisará ser aprimorado para evitar falsos positivos e lidar melhor com a categorização de despesas.

## 4. Arquitetura e Armazenamento
*   **Armazenamento de Logos (`Company.tsx`):** O upload da logomarca da empresa converte a imagem para Base64 e a salva diretamente no documento da empresa no Firestore. Embora exista uma trava de 500KB, essa prática é desencorajada pois onera a leitura do banco de dados e consome o limite de 1MB por documento do Firestore. O ideal é refatorar para fazer o upload para o Firebase Storage e salvar apenas a URL no documento (como já é feito com os arquivos XML e Certificados).

## 5. Interface e Experiência do Usuário (UX)
*   Existem pequenos textos de "Em breve" espalhados pelo sistema (ex: métodos de pagamento em `Configurations.tsx`) que indicam módulos planejados mas ainda não iniciados.

---
**Conclusão:** O sistema possui uma base sólida e a maior parte do CRUD e regras de negócio de inventário/vendas está funcional. O foco principal para as próximas etapas de desenvolvimento deve ser a finalização do módulo fiscal (comunicação real com SEFAZ e segurança de certificados) e a substituição dos mocks (como o Suporte) por integrações reais.
