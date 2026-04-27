# Relatório Gerencial: Funcionalidades Pendentes e Gargalos de Finalização

O sistema **PowerControl** encontra-se estruturalmente sólido e funcional nas esferas de permissionamento, Multi-Tenant (Matriz/Filial via `company_id`), rotinas fiscais e controle financeiro manual. Entretanto, para ser considerado um produto "Go-to-Market" completo de nível Enterprise (ERP/PDV real), algumas áreas precisam de implementação ou refinamento.

Este documento sumariza **exclusivamente** o que falta finalizar no sistema, de acordo com a análise de código atual.

## 1. Integrações Híbridas de Pagamento (TEF / Pix Dinâmico)
- **Status Atual:** A escolha de método de pagamento no PDV (Vendas) é referencial (somente strings "A Prazo", "Pix", "Cartão de Crédito").
- **O que falta:** Integrar APIs bancárias (ex: Mercado Pago, Asaas, Pagar.me) ou TEF para gerar **QR Codes do Pix sob demanda** e processar a resposta automatizada confirmando o pagamento da venda antes de liberar o recibo. Caso contrário, o vendedor depende de conferir o comprovante manualmente, abrindo margem a fraudes.

## 2. Persistência de Cache Offline (React Query)
- **Status Atual:** A API de Service Workers e o banco de dados `idb` guardam ações de mutação (Sales, Clients, Accounts Payable) offline perfeitamente (`offlineStore.ts`).
- **O que falta:** O cache de leitura (catálogo de produtos, categorias, clientes previamente carregados) vive na memória do `@tanstack/react-query`. Se a aba for atualizada (F5) enquanto o caixa está sem internet, o React Query perderá o estado e a tela de vendas ficará em branco.
- **Resolução:** Utilizar o `PersistQueryClientProvider` atrelado ao IndexedDB para espelhar todo o catálogo localmente, garantindo PWA offline "zero-reload" seguro.

## 3. Retorno Físico/Assíncrono de Notas Fiscais (Webhooks de Sefaz)
- **Status Atual:** Há integração com provedores (WebmaniaBR / FocusNFe) configurada. Contudo, Sefaz frequentemente põe emissões em "Processamento" gerando lentidão. 
- **O que falta:** O sistema depende do usuário clicar ativamente no botão "Consultar Status" na aba Fiscal para atualizar de *Processando* para *Autorizada/Rejeitada*. Falta a construção de num endpoint servidor (Firestore Function / Cloud Run API) como um **Webhook Receiver**, que escuta callbacks do integrador fiscal e atualiza o respectivo documento da collection Firestore *no background*, enviando uma notificação push para o UI.

## 4. Auth & Segurança UX
- **Status Atual:** Temos restrições rigorosas no banco graças à refatoração das regras do Firestore. Login via Email/Senha implantado.
- **O que falta:** 
   1. **Recuperação de Senha (Forgot Password):** O fluxo para o funcionário que "esqueceu a senha" não existe na tela `/login`.
   2. **Gerenciamento de Conta:** O Profile (`MeuPerfil`) não deixa o funcionário alterar a própria senha, atualizar fotos (Firebase Storage) de perfil.
   3. **MFA/2FA:** Tratando-se de um ERP com acesso financeiro e fiscal integral, administradores e *master* deveriam ter a opção de ativar Autenticação por Dois Fatores (OTP).

## 5. Transferência de Estoque Sistêmica (Matriz-Filial)
- **Status Atual:** O sistema suporta múltiplas *"companies"* no caso de uma hierarquia Matriz -> Filiais. Há fluxo de transferências, porém focadas no painel *Financeiro* (Transferências entre caixas/bancos).
- **O que falta:** Falta uma feature de **Transferência de Mercadorias (Estoque)** inter-empresas. Atualmente, caso a filial 1 mande 5 unidades de um produto para a filial 2, o usuário precisa fazer uma *"Ajuste: Saída"* na filial 1 e logo, um *"Ajuste: Entrada"* na filial 2 manualmente.

## 6. Documentos PDF, Recibos e Exportações
- **Status Atual:** Impressão crua e geração de relatórios simples nos gráficos do *Dashboard*.
- **O que falta:** Faltam gerações contínuas de arquivos PDF "baixáveis" de Vendas formato A4 (Orçamentos elegantes com Logo), exportação de tabelas de histórico/relatório via formato Planilha/CSV, e re-emissão de recibo não-fiscal formato 80mm térmica resgatado dos históricos de transações.

## Conclusão
Tecnicamente a fundação do aplicativo é excepcional. A resolução desses *6 épicos* removerá gargalos cruciais operacionais de lojistas em operação de grande volume e selará a entrega da ferramenta no que tange a um ERP escalável PWA+Offline.
