# Relatório Analítico de Funcionalidades Pendentes e Incompletas (TODO)

Esta é a análise geral do status atual do sistema focada nas entregas a finalizar, com base no mapeamento lógico e na análise progressiva de código em todo o projeto.

## 1. Módulo de Suporte (`Support.tsx`)
**Status:** Incompleto / Interface de via única
*   **Abertura de Chamado:** Funcional, com notificações disparando via webhook com sucesso.
*   **Visualização de Chamados:** Listados do Firebase, apresentando badges de status condizentes.
*   **O Problema (Gap):** Quando o administrador/suporte responde preenchendo o `internal_notes`, o sistema apenas notifica o usuário na UI com uma flag "Resposta disponível". Não existe uma tela de diálogo, painel de detalhes ou botão para o usuário de fato expandir o ticket, **ler a resposta interna do suporte** ou **interagir de volta (enviar réplica no chat)**. O fluxo morre na listagem.

## 2. Base de Conhecimento (`KnowledgeBase.tsx`)
**Status:** Apenas Mock Visual (Fictício)
*   A página apresenta um layout esteticamente refinado, categorizações e até barra de busca. Porém, os dados da `const categories` são **totalmente mockados** e estáticos (hard-coded).
*   Não existe persistência no banco de dados, nem funcionalidade de clique nos artigos. Os links visuais terminam sem roteamento, não existe janela de exibição do conteúdo em formato de leitura/Markdown. É essencialmente um esqueleto de página a ser implementado.

## 3. Integrações Fiscais e APIs (`Configurations.tsx` e `fiscalApi.ts`)
**Status:** Funcional Parcialmente / Provedor Bloqueado
*   O fornecedor `FocusNFe` se encontra mapeado e é usável na infraestrutura fiscal.
*   No entanto, a integração com o concorrente fornecedor `WebmaniaBR` possui a lógica construtiva pré-pronta dentro do arquivo `fiscalApi.ts`, mas, **na interface que o usuário tem acesso (`Configurations.tsx`)**, encontra-se preterido no HTML como `<option value="WebmaniaBR" disabled>WebmaniaBR (Em breve)</option>`. O usuário final não pode de fato ativar a API, restando destravar a trava da UI e fazer o polimento da integração.

## 4. Cobertura da Resiliência Offline (Service Worker - `sw.ts`)
**Status:** Mapeamento Restrito ao Frente de Caixa (Vendas)
*   Graças à última resolução da Issue 05, o App está totalmente provido de filas resilientes com retentativas, fallbacks assíncronos e envio de status *Zero-Down* via PostMessaging. 
*   **O Limitante:** A resiliência e a estrutura da loja IDB só atuam e abraçam a tag `sync-sales` em prol da rotina `syncSales()`. Para que o sistema se comporte como um ERP verdadeiramente 100% *Offline-First*, o SW precisará de rotinas semelhantes e mapeamento IDB extra para englobar a criação relacional de Clientes no PDV, Compras a fornecedores, entre outras listagens offline que não o POS básico.

## 5. Pagamentos - PIX Dinâmico (`Configurations.tsx`)
**Status:** Incompleto Estruturalmente
*   A interface de configurações permite que o lojista salve a sua própria "Chave PIX". 
*   **O Limitante:** Apenas gravar a chave no banco de dados não efetua a dinâmica do `BR Code` padrão EMV para a tela do Frente de Caixa ou num envio de Fatura de *Contas a Receber*. Falta a lib ou algoritmo que converta o dado gravado do Lojista + Soma do Checkout = **QR Code Copia e Cola validado pelo BACEN** renderizado na tela do comprador/PDV. No estado atual as vendas via PIX estão trabalhando focadas no reconhecimento via 'transferência manual/caixa'.

## 6. Configuração do Webhook Notificador
**Status:** Variáveis de Ambiente Rigidamente Dependentes
*   O serviço de Webhooks utilizado para o Suporte (`notificationApi.ts`) está inteiramente engessado no `.env` subjacente (`VITE_SUPPORT_WEBHOOK_URL`). Para usuários Master e ambientes de terceiros gerenciarem suas próprias integrações (Slack/Discord), seria conveniente mover essa variável de ambiente isolada para o banco de dados dinâmico (`configurations` ou `companyData`) permitindo edições ágeis no dashboard Global.

## Conclusão de Próximos Passos (Backlog)
Se o objetivo é zerar e refinar tudo, os focos táticos deveriam ser: 
1. Construir o Modal/Página para **Visualização e Chat do Suporte**.
2. Criar uma coleção/editor Markdown para os **Artigos da Base de Conhecimento**. 
3. Habilitar via UI e testar devidamente a emissão pela **API da WebmaniaBR**. 
4. Implementar a lib **Geradora de Payload / QR Code PIX**.
