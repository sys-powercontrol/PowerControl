export interface KnowledgeArticle {
  id: string;
  category: "pdv" | "fiscal" | "financeiro" | "estoque" | "equipe" | "cadastros" | "geral";
  title: string;
  summary: string;
  readTime: string;
  tags: string[];
  linkTo?: string;
  linkText?: string;
  steps?: string[];
  tips?: string;
  content: string;
  isPopular?: boolean;
}

export interface KnowledgeCategory {
  id: "all" | "pdv" | "fiscal" | "financeiro" | "estoque" | "equipe" | "cadastros" | "geral";
  name: string;
  iconName: string;
  badgeColor: string;
  description: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: "all",
    name: "Todas as Categorias",
    iconName: "BookOpen",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Visão consolidada de todos os manuais e procedimentos operacionais do PowerControl ERP."
  },
  {
    id: "pdv",
    name: "PDV & Vendas",
    iconName: "ShoppingCart",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Operações de caixa, vendas rápidas, múltiplos pagamentos, PIX dinâmico e emissão de comprovantes."
  },
  {
    id: "fiscal",
    name: "Fiscal & SEFAZ",
    iconName: "Shield",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Certificado A1, emissão de NFC-e e NF-e, cancelamento legal e tratamento de rejeições SEFAZ."
  },
  {
    id: "financeiro",
    name: "Financeiro & Bancos",
    iconName: "DollarSign",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Contas a Pagar/Receber, conciliação bancária OFX, taxas de cartão, transferências e DRE."
  },
  {
    id: "estoque",
    name: "Estoque & Compras",
    iconName: "Package",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    description: "Entrada por XML de fornecedor, inventário periódico, giro de estoque e curva ABC de produtos."
  },
  {
    id: "equipe",
    name: "Equipe & Comissões",
    iconName: "Users",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Vendedores, apuração e pagamento de comissões em lote, convites e perfis de acesso."
  },
  {
    id: "cadastros",
    name: "Cadastros & Clientes",
    iconName: "FileText",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    description: "Gestão de clientes PF/PJ, limite de crediário, fornecedores e histórico de compras."
  },
  {
    id: "geral",
    name: "Configurações & Atalhos",
    iconName: "Settings",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
    description: "Atalhos de teclado globais, dados da empresa, impressoras térmicas e ambiente multi-tenant."
  }
];

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  // --- PDV & VENDAS ---
  {
    id: "pdv-venda-rapida",
    category: "pdv",
    title: "Como realizar uma Venda Rápida no Frente de Caixa (PDV)",
    summary: "Passo a passo completo para adicionar produtos com leitor de código de barras, aplicar descontos e finalizar com múltiplos pagamentos.",
    readTime: "3 min",
    tags: ["PDV", "Vendas", "Checkout", "Cupom", "Código de Barras"],
    isPopular: true,
    linkTo: "/Vender",
    linkText: "Abrir PDV / Vender",
    steps: [
      "Acesse a tela 'Vender' no menu lateral ou pressione o atalho 'Ctrl + P'.",
      "Passe o produto no leitor de código de barras ou digite o nome/código na barra de busca superior.",
      "Ajuste a quantidade usando os botões '+' e '-' ou clicando diretamente no número de unidades.",
      "Se necessário, selecione um Cliente nominal para controle de histórico ou emissão de nota com CPF/CNPJ.",
      "Clique em 'Prosseguir para Pagamento' e escolha a forma: Dinheiro, Cartão de Crédito/Débito, PIX ou A Prazo.",
      "Confirme os valores recebidos (o sistema calcula o troco automaticamente em dinheiro) e clique em 'Finalizar Venda'.",
      "Imprima o comprovante térmico (80mm ou 58mm) ou envie o recibo digital para o cliente."
    ],
    tips: "Para vendas sem cliente específico, o sistema adota automaticamente 'Consumidor Final', dispensando cadastros adicionais.",
    content: `## Fluxo Completo de Vendas no Frente de Caixa (PDV)

O Frente de Caixa do **PowerControl** foi projetado para alta velocidade no balcão, suportando leitores de código de barras seriais/USB, telas touchscreen e atalhos rápidos de teclado.

### 1. Inserção de Produtos
- **Leitor de Código de Barras:** Aponte o feixe ótico para a embalagem. O sistema captura o EAN/GTIN automaticamente e adiciona uma unidade ao carrinho a cada bip.
- **Busca por Nome ou Referência:** Digite qualquer parte do nome do produto ou seu código interno. A lista auto-completa em milissegundos.
- **Seleção por Categoria:** Em tablets ou monitores touch, utilize as abas de categorias para filtrar itens visualmente.

### 2. Descontos e Acréscimos
- Você pode aplicar desconto percentual (%) ou nominal (R$) em itens individuais ou no subtotal geral da venda.
- Descontos acima da margem permitida exigem perfil de Administrador quando a trava de segurança estiver ativa.

### 3. Múltiplas Formas de Pagamento
O checkout permite dividir o valor total da venda em diferentes formas de pagamento (Exemplo: R$ 50,00 no PIX e R$ 100,00 no Cartão de Crédito).`
  },
  {
    id: "pdv-pix-dinamico",
    category: "pdv",
    title: "Como funciona a geração de QR Code PIX Dinâmico no Caixa",
    summary: "Entenda como cadastrar sua chave PIX e emitir cobranças instantâneas com valor exato da venda na tela do operador.",
    readTime: "2 min",
    tags: ["PIX", "QR Code", "Pagamentos", "BaaS", "Configurações"],
    isPopular: true,
    linkTo: "/Configuracoes",
    linkText: "Configurar Chave PIX",
    steps: [
      "Vá em 'Configurações' no menu lateral e acesse a aba 'Pagamentos'.",
      "No campo 'Chave PIX', informe sua chave oficial vinculada à conta bancária da empresa (CNPJ, E-mail, Celular ou Chave Aleatória).",
      "Clique em 'Salvar Configurações'.",
      "No PDV, ao fechar a venda, escolha a opção 'PIX' e clique em 'Gerar QR Code'.",
      "O sistema desenha na tela o QR Code EMV com o valor exato da compra e disponibiliza o código 'Copia e Cola'.",
      "Após a confirmação da transferência no aplicativo bancário, confirme a venda."
    ],
    tips: "Chaves do tipo CNPJ evitam divergências com clientes e garantem identificação imediata nos extratos bancários.",
    content: `## PIX Dinâmico no PowerControl

O módulo de PIX do PowerControl utiliza o padrão oficial do Banco Central (BR Code EMV). Cada venda gera um código exclusivo que já embute:
1. Os dados da sua conta jurídica.
2. O valor exato do pedido (com centavos), eliminando erros de digitação do cliente.
3. Identificador de conciliação para facilitar o batimento de caixa no final do dia.`
  },
  {
    id: "pdv-offline-pwa",
    category: "pdv",
    title: "Operação Offline: Como o sistema continua vendendo sem Internet",
    summary: "Saiba como a arquitetura Offline-First e o PWA mantêm o caixa faturando mesmo com queda de sinal e sincronizam automaticamente ao retornar.",
    readTime: "3 min",
    tags: ["Offline", "PWA", "Resiliência", "Service Worker", "Sincronização"],
    steps: [
      "Se a conexão de internet cair durante o atendimento, o sistema exibe o aviso 'Modo Offline Ativo' no topo da tela.",
      "Continue operando o PDV normalmente: o catálogo de produtos e preços permanece disponível em cache local.",
      "Conclua a venda recebendo em Dinheiro, Cartão ou Crediário. A venda é gravada com segurança no banco local do navegador (IndexedDB).",
      "Assim que a internet for restabelecida, o motor 'Background Sync' envia todas as vendas da fila automaticamente para os servidores em nuvem.",
      "Nenhum dado é perdido ou sobrescrito durante a sincronização."
    ],
    tips: "Mantenha o navegador sempre aberto até a mensagem 'Sincronização Concluída' aparecer após a internet retornar.",
    content: `## Arquitetura de Alta Resiliência Offline

O PowerControl conta com tecnologia **Progressive Web App (PWA)** e armazenamento local criptografado.

### O que funciona 100% sem internet:
- Abertura de vendas e adição de itens pelo leitor ótico.
- Aplicação de descontos e cálculo de troco.
- Emissão de recibos de venda em impressoras térmicas locais.
- Cadastro rápido de novos clientes locais.

### O que aguarda o retorno da rede:
- Transmissão de notas fiscais (NFC-e / NF-e) para a SEFAZ, que entram em fila de contingência automática.`
  },
  {
    id: "pdv-crediario",
    category: "pdv",
    title: "Vendas a Prazo e Crediário Próprio (Fiado com Limite)",
    summary: "Controle vendas parceladas da loja com verificação de limite de crédito do cliente e lançamento automático em Contas a Receber.",
    readTime: "2 min",
    tags: ["Crediário", "A Prazo", "Fiado", "Contas a Receber", "Clientes"],
    linkTo: "/Clientes",
    linkText: "Ver Cadastro de Clientes",
    steps: [
      "Certifique-se de que o cliente está previamente cadastrado em 'Clientes' com CPF/CNPJ e um 'Limite de Crédito' estipulado.",
      "No PDV, selecione o cliente nominal antes de prosseguir para o pagamento.",
      "Na forma de pagamento, escolha 'Crediário / A Prazo'.",
      "Defina a quantidade de parcelas e as datas de vencimento.",
      "O sistema valida se o saldo devedor atual somado à nova venda não ultrapassa o teto de crédito do cliente.",
      "Ao finalizar, cada parcela gera automaticamente um título com vencimento programado em 'Contas a Receber'."
    ],
    tips: "Você pode bloquear vendas a prazo para clientes inadimplentes ativando o status 'Bloqueado' no cadastro do cliente.",
    content: `## Gestão de Crediário Próprio

O módulo de crediário permite fidelizar clientes sem depender das taxas das maquininhas de cartão:
- Controle de limite individual de compra a prazo.
- Baixa de parcelas parciais ou totais na tela de Contas a Receber.
- Recibo de liquidação de parcela com data e saldo remanescente.`
  },

  // --- CAIXAS & TURNOS ---
  {
    id: "caixa-abertura-fechamento",
    category: "pdv",
    title: "Como realizar a Abertura e o Fechamento de Caixa",
    summary: "Procedimento formal de abertura com suprimento inicial, conferência cega no fechamento e apuração de sobras e faltas.",
    readTime: "3 min",
    tags: ["Caixas", "Turno", "Aporte", "Fechamento", "Auditoria"],
    isPopular: true,
    linkTo: "/Caixas",
    linkText: "Gerenciar Caixas",
    steps: [
      "Acesse 'Caixas' no menu lateral ou use o atalho 'Ctrl + Shift + X'.",
      "Selecione o terminal do seu turno e clique no botão verde 'Abrir Caixa'.",
      "Informe o valor do Fundo de Troco (Aporte/Suprimento Inicial) que está fisicamente na gaveta e confirme.",
      "Durante o dia, todas as vendas e sangrias são consolidadas no caixa ativo.",
      "Ao final do expediente, clique em 'Fechar Caixa'.",
      "Realize a contagem física do dinheiro em cédulas e moedas, além dos comprovantes de cartão e PIX.",
      "Informe os valores contados. O sistema compara o valor físico com o saldo do sistema e aponta eventuais diferenças (sobra ou falta).",
      "Após confirmado, o caixa é travado contabilmente e não aceita lançamentos retroativos."
    ],
    tips: "A conferência de caixa é cega: o operador deve contar os valores reais antes de visualizar o montante esperado, garantindo máxima lisura contábil.",
    content: `## Ciclo Diário de Operação de Caixa

O controle rigoroso de caixas evita furos financeiros e desvios de mercadorias:
- **Status Aberto:** Permite realizar vendas, sangrias e suprimentos no terminal.
- **Status Fechado:** Bloqueia permanentemente novas transações para o turno concluído.
- **Relatório de Fechamento:** Totaliza receitas por modalidade (Dinheiro, PIX, Cartão Débito, Cartão Crédito, A Prazo) e exibe o histórico de sangrias realizadas.`
  },
  {
    id: "caixa-sangrias-suprimentos",
    category: "pdv",
    title: "Como registrar Sangrias (Retiradas) e Suprimentos de Caixa",
    summary: "Aprenda a lançar retiradas de segurança para o cofre e entradas adicionais de troco sem desalinhar o saldo da gaveta.",
    readTime: "2 min",
    tags: ["Sangria", "Suprimento", "Retirada", "Segurança", "Caixas"],
    linkTo: "/Caixas",
    linkText: "Ir para Caixas",
    steps: [
      "Acesse a tela 'Caixas' e selecione o caixa em operação.",
      "Para retirar dinheiro da gaveta (ex: transferência para cofre ou depósito), clique em 'Sangria'.",
      "Informe o valor a retirar e o motivo obrigatório (Ex: 'Recolhimento de segurança cofre central').",
      "Para injetar mais moedas ou troco na gaveta, clique em 'Suprimento' e informe o valor.",
      "O saldo disponível na gaveta é atualizado imediatamente no monitor do caixa."
    ],
    tips: "Recomenda-se realizar sangrias periódicas sempre que a gaveta atingir o teto de segurança estipulado pela gerência.",
    content: `## Sangrias e Suprimentos

- **Sangria:** Retirada de numerário em espécie da gaveta do caixa. Reduz o saldo físico de dinheiro e deve ser justificada formalmente.
- **Suprimento:** Entrada de dinheiro suplementar para troco. Aumenta o saldo físico esperado na conferência de fechamento.`
  },

  // --- FISCAL & SEFAZ ---
  {
    id: "fiscal-certificado-a1",
    category: "fiscal",
    title: "Instalação e Renovação do Certificado Digital A1",
    summary: "Guia para fazer o upload do certificado digital no formato .pfx, configurar a senha e acompanhar a data de validade.",
    readTime: "3 min",
    tags: ["Certificado A1", "Fiscal", "SEFAZ", "NFe", "NFCe"],
    isPopular: true,
    linkTo: "/Certificado",
    linkText: "Gerenciar Certificado Digital",
    steps: [
      "Acesse o menu 'Certificado' ou vá em 'Configurações' > 'Aba Fiscal'.",
      "Clique no botão 'Selecionar Certificado' e carregue seu arquivo '.pfx' ou '.p12'.",
      "Digite a senha do certificado fornecida pela autoridade certificadora (ex: Certisign, Serasa, Soluti).",
      "Clique em 'Salvar e Validar'.",
      "O sistema descriptografa o certificado em ambiente seguro, valida a cadeia ICP-Brasil e exibe a data de validade e o CNPJ emissor.",
      "Quando o certificado estiver a 30 dias do vencimento, o sistema emitirá alertas preventivos no topo do sistema."
    ],
    tips: "Certificados A1 têm validade padrão de 1 ano. Mantenha uma cópia de segurança do arquivo .pfx e de sua senha em local seguro.",
    content: `## Certificado Digital ICP-Brasil A1

O Certificado Digital A1 é o documento eletrônico que assina juridicamente as notas fiscais emitidas pelo PowerControl perante a SEFAZ:
- Formato obrigatório: **.pfx** ou **.p12**.
- Armazenamento em nuvem com criptografia de ponta a ponta.
- Não exige leitora física de cartão (smartcard) ou token USB, operando diretamente na nuvem para qualquer terminal conectado.`
  },
  {
    id: "fiscal-emissao-nfe-nfce",
    category: "fiscal",
    title: "Como emitir NFC-e (Cupom) e NF-e (Nota Eletrônica)",
    summary: "Diferenças entre NFC-e e NF-e, como emitir no fechamento da venda e onde baixar o DANFE em PDF e o arquivo XML.",
    readTime: "3 min",
    tags: ["NFCe", "NFe", "DANFE", "XML", "SEFAZ", "Emissão"],
    isPopular: true,
    linkTo: "/HistoricoVendas",
    linkText: "Ir para Histórico de Vendas",
    steps: [
      "Para emitir NFC-e (Nota de Consumidor): finalize a venda no PDV e clique no botão 'Emitir NFC-e'. O cupom fiscal com QR Code da SEFAZ é transmitido em 2 segundos.",
      "Para emitir NF-e (Nota Fiscal Grande modelo 55): acesse 'Histórico de Vendas', localize a venda e clique em 'Emitir NF-e'.",
      "Aguarde o retorno de autorização da SEFAZ (Status 100 - Autorizado o Uso da NF-e).",
      "Clique em 'Imprimir DANFE' para abrir o PDF formatado e em 'Baixar XML' para o arquivo oficial contábil.",
      "Se a venda tiver e-mail do cliente informado, o sistema envia o XML e o PDF automaticamente."
    ],
    tips: "Vendas para pessoas jurídicas (PJ) que necessitam de crédito de ICMS ou transporte de mercadorias exigem a emissão de NF-e modelo 55.",
    content: `## NFC-e vs. NF-e: Quando usar cada uma?

- **NFC-e (Modelo 65):** Cupom fiscal eletrônico para vendas no varejo a consumidor final (presencial ou entrega rápida). Substitui o antigo cupom ECF.
- **NF-e (Modelo 55):** Nota fiscal de produtos com dados completos de frete, transportadora, substituição tributária e dados fiscais aprofundados. Ideal para faturamento corporativo.`
  },
  {
    id: "fiscal-cancelamento",
    category: "fiscal",
    title: "Cancelamento de Venda e Cancelamento Fiscal na SEFAZ",
    summary: "Prazos legais para cancelamento de NF-e e NFC-e, exigência de justificativa e consistência contra furos fiscais.",
    readTime: "3 min",
    tags: ["Cancelamento", "SEFAZ", "Prazo Legal", "Histórico de Vendas", "Fiscal"],
    linkTo: "/HistoricoVendas",
    linkText: "Ver Vendas Realizadas",
    steps: [
      "Acesse 'Histórico de Vendas' no menu lateral.",
      "Localize a venda que necessita de cancelamento e clique no botão 'Cancelar Venda'.",
      "Se a venda possuir nota fiscal autorizada, o sistema aciona o protocolo de cancelamento formal perante a SEFAZ.",
      "Digite a justificativa legal do cancelamento (a SEFAZ exige obrigatoriamente um texto com pelo menos 15 caracteres, ex: 'Erro de digitacao na forma de pagamento').",
      "Aguarde a resposta dos servidores da SEFAZ.",
      "Se a SEFAZ autorizar (Código 135 ou 101), o status da nota muda para 'Cancelada' e o estoque dos produtos é estornado automaticamente.",
      "Caso a SEFAZ rejeite (ex: prazo legal expirado), o sistema exibe o aviso com a justificativa oficial e não cancela a venda indevidamente."
    ],
    tips: "O prazo legal padrão da SEFAZ para cancelamento de NF-e é de até 24 horas. Para NFC-e, a maioria dos estados exige cancelamento em até 30 minutos após a emissão.",
    content: `## Regras de Cancelamento Fiscal

O cancelamento de uma venda vinculada a documento fiscal requer confirmação da Secretaria da Fazenda:
- Se o prazo legal da SEFAZ já tiver expirado, não é possível cancelar a nota: o procedimento contábil correto é emitir uma **Nota Fiscal de Devolução de Mercadoria** para anular os efeitos tributários.`
  },
  {
    id: "fiscal-rejeicoes-sefaz",
    category: "fiscal",
    title: "Como resolver as Rejeições mais comuns da SEFAZ",
    summary: "Guia prático para solucionar Rejeição 204 (Duplicidade), Rejeição 778 (NCM inexistente), Rejeição 539 e Rejeição 232.",
    readTime: "4 min",
    tags: ["Rejeições", "SEFAZ", "Erros Fiscais", "NCM", "Duplicidade"],
    steps: [
      "Rejeição 204 (Duplicidade de NF-e): Ocorre quando o número da nota já foi utilizado anteriormente. Acesse 'Configurações Fiscais' e ajuste a numeração sequencial para o próximo número livre.",
      "Rejeição 778 (NCM Inexistente): O código NCM de 8 dígitos de algum produto cadastrado foi descontinuado pela Receita Federal. Acesse 'Produtos', edite o item e atualize o NCM para a tabela vigente.",
      "Rejeição 539 (Duplicidade com diferença na Chave de Acesso): Tentativa de emitir a mesma nota que já se encontra autorizada na SEFAZ. Consulte a venda no portal da SEFAZ ou aguarde o retorno da consulta.",
      "Rejeição 232 (IE do destinatário não informada ou inválida): Em vendas interestaduais para PJ, verifique se a Inscrição Estadual do cliente está correta no SINTEGRA/Cadastro Centralizado.",
      "Rejeição 600 (CSOSN incompatível na operação): Verifique se a empresa optante pelo Simples Nacional está utilizando o código de tributação correto (ex: 102 para tributação sem crédito ou 500 para ICMS ST cobrado anteriormente)."
    ],
    tips: "Sempre verifique o NCM e a tributação dos produtos antes de colocá-los à venda no caixa para evitar travamentos no momento da emissão.",
    content: `## Dicionário de Erros Fiscais

Todas as mensagens de rejeição são geradas diretamente pelos servidores estaduais da SEFAZ. O PowerControl traduz essas mensagens técnicas para orientar o operador sobre qual campo cadastral precisa de correção antes da nova tentativa de transmissão.`
  },
  {
    id: "fiscal-regras-tributarias",
    category: "fiscal",
    title: "Configurações Tributárias e Regras Fiscais (CFOP, CST, CSOSN)",
    summary: "Entenda como configurar CFOP padrão (5.102 / 6.102), Regime Tributário (Simples Nacional, Presumido, Real) e alíquotas de ICMS.",
    readTime: "3 min",
    tags: ["Tributação", "CFOP", "CSOSN", "Simples Nacional", "ICMS"],
    linkTo: "/ConfiguracoesFiscais",
    linkText: "Abrir Configurações Fiscais",
    steps: [
      "Acesse 'Configurações Fiscais' no menu lateral.",
      "Defina o Regime Tributário da empresa: 'Simples Nacional' (CRT 1) ou 'Regime Normal' (CRT 3).",
      "Configure o CFOP padrão para saídas estaduais (5.102 - Venda de mercadoria adquirida de terceiros) e interestaduais (6.102).",
      "Informe a alíquota padrão aplicável ao ICMS conforme o anexo do Simples Nacional da sua empresa.",
      "Nos cadastros de produtos individuais, você pode definir regras específicas para itens com Substituição Tributária (CFOP 5.405 / CSOSN 500)."
    ],
    tips: "Consulte o contador da sua empresa para validar a tabela de CFOPs e CSOSNs mais adequada ao seu segmento de atuação.",
    content: `## Motor Tributário do PowerControl

O sistema calcula automaticamente os tributos de cada venda cruzando o Regime da sua Empresa, o Estado do Destinatário e as regras fiscais vinculadas a cada produto.`
  },

  // --- FINANCEIRO & BANCOS ---
  {
    id: "financeiro-conciliacao-ofx",
    category: "financeiro",
    title: "Como funciona a Conciliação Bancária via Arquivo OFX",
    summary: "Importação de extratos OFX de qualquer banco, pareamento inteligente de títulos com fitid anti-duplicidade e auditoria de lotes.",
    readTime: "4 min",
    tags: ["Conciliação", "OFX", "Bancos", "Extrato", "Auditoria"],
    isPopular: true,
    linkTo: "/ConciliacaoBancaria",
    linkText: "Ir para Conciliação Bancária",
    steps: [
      "Acesse o Internet Banking do seu banco (Itaú, Bradesco, BB, Santander, Inter, Nubank, Sicoob, etc.) e exporte o extrato no formato 'OFX'.",
      "No PowerControl, acesse 'Conciliação Bancária' no menu lateral.",
      "Selecione a conta bancária correspondente e faça o upload do arquivo '.ofx'.",
      "O sistema lê todas as transações, calcula totais de entradas e saídas e filtra duplicidades usando o código único 'fitid'.",
      "Para cada linha do extrato bancário, o sistema busca títulos compatíveis em Contas a Pagar/Receber por valor e data.",
      "Clique em 'Conciliar' para liquidar o título e confirmar o batimento.",
      "Todas as importações ficam gravadas no Histórico de Lotes com data, quantidade de transações, total movimentado e operador responsável."
    ],
    tips: "O código fitid gravado em cada transação garante que você nunca importe o mesmo extrato duas vezes por engano.",
    content: `## A Importância da Conciliação Bancária OFX

A conciliação bancária garante que o saldo registrado no ERP seja idêntico ao saldo real que consta no extrato da conta corrente da sua empresa:
- Identificação rápida de tarifas bancárias não lançadas.
- Confirmação de recebimentos de boletos e transferências.
- Liquidação em massa de despesas pagas por débito automático.`
  },
  {
    id: "financeiro-contas-pagar-receber",
    category: "financeiro",
    title: "Gestão Completa de Contas a Pagar e Contas a Receber",
    summary: "Lançamento de despesas e receitas, baixas parciais ou totais, cálculo de juros, multas, descontos e estornos de títulos.",
    readTime: "3 min",
    tags: ["Contas a Pagar", "Contas a Receber", "Financeiro", "Baixa", "Estorno"],
    linkTo: "/ContasPagar",
    linkText: "Ver Contas a Pagar",
    steps: [
      "Para lançar uma conta a pagar: acesse 'Contas a Pagar', clique em 'Nova Conta', preencha fornecedor, categoria de despesa, valor e vencimento.",
      "Para baixar uma conta paga: localize o título e clique no botão 'Baixar'. Selecione a conta bancária de origem, data do pagamento e eventuais juros ou descontos.",
      "O sistema atualiza o saldo bancário correspondente em tempo real.",
      "Em 'Contas a Receber', acompanhe os valores a receber provenientes de vendas no crediário ou cobranças manuais.",
      "Se um lançamento foi baixado por engano, você pode utilizar a opção de 'Estorno' para reverter o saldo e retornar o título para pendente."
    ],
    tips: "Utilize categorias financeiras padronizadas (Ex: Aluguel, Fornecedores de Estoque, Energia, Folha de Pagamento) para gerar relatórios DRE precisos.",
    content: `## Fluxo Financeiro Integrado

Contas a Pagar e Receber alimentam instantaneamente o Fluxo de Caixa e o Demonstrativo de Resultado (DRE) da empresa, permitindo saber a qualquer momento se o negócio está operando com lucro líquido real.`
  },
  {
    id: "financeiro-taxas-cartao",
    category: "financeiro",
    title: "Configuração de Taxas de Operadoras de Cartão (Débito e Crédito)",
    summary: "Como cadastrar os percentuais cobrados pelas maquininhas para deduzir despesas financeiras e apurar o recebimento líquido real.",
    readTime: "2 min",
    tags: ["Taxas de Cartão", "Adquirentes", "Débito", "Crédito", "Margem Líquida"],
    linkTo: "/Configuracoes",
    linkText: "Ajustar Taxas nas Configurações",
    steps: [
      "Acesse 'Configurações' no menu lateral e clique na aba 'Pagamentos'.",
      "Localize a seção 'Taxas de Operadoras de Cartão'.",
      "No campo 'Taxa Cartão de Crédito (%)', informe a taxa média cobrada pela sua maquininha (Exemplo: 3.20).",
      "No campo 'Taxa Cartão de Débito (%)', informe a taxa média de débito (Exemplo: 1.40).",
      "Clique em 'Salvar Configurações'.",
      "O sistema utilizará esses índices para calcular o valor líquido a receber das vendas e apropriar o custo financeiro nos relatórios de lucratividade."
    ],
    tips: "Ao renegociar taxas com a sua adquirente de cartões (Cielo, Rede, Stone, PagBank, etc.), atualize imediatamente esses percentuais no sistema.",
    content: `## Custo Financeiro de Cartões

Vender no cartão gera uma despesa financeira cobrada pela operadora. O PowerControl permite registrar essas taxas percentuais para que os relatórios de lucratividade mostrem o resultado líquido exato que cairá na conta da empresa após a dedução da adquirente.`
  },
  {
    id: "financeiro-transferencias",
    category: "financeiro",
    title: "Transferências Financeiras entre Contas e Caixas",
    summary: "Como transferir recursos da gaveta do caixa para o banco ou entre diferentes contas correntes sem duplicar lançamentos.",
    readTime: "2 min",
    tags: ["Transferências", "Contas Bancárias", "Caixas", "Movimentação"],
    linkTo: "/Transferencias",
    linkText: "Acessar Transferências",
    steps: [
      "Acesse 'Transferências' no menu lateral.",
      "Clique em 'Nova Transferência'.",
      "Selecione a 'Conta de Origem' (ex: Caixa Loja Física 01) e a 'Conta de Destino' (ex: Banco Inter Conta Jurídica).",
      "Informe o valor a ser transferido e a data da operação.",
      "Adicione uma descrição explicativa (ex: 'Depósito de sangria do caixa do fim de semana').",
      "Confirme a transferência: o sistema debita da origem e credita no destino em um único lançamento seguro."
    ],
    tips: "Use transferências para manter a gaveta física do caixa com saldo baixo por segurança e registrar depósitos bancários de forma transparente.",
    content: `## Movimentações entre Contas

As transferências internas não alteram o patrimônio total da empresa nem afetam o DRE como despesa ou receita, apenas reorganizam a distribuição de liquidez entre caixas físicos e contas bancárias.`
  },
  {
    id: "financeiro-relatorio-dre",
    category: "financeiro",
    title: "Análise do Demonstrativo de Resultado (DRE) e Fluxo de Caixa",
    summary: "Como interpretar a Receita Bruta, CMV (Custo da Mercadoria Vendida), Despesas Operacionais e Margem Líquida.",
    readTime: "3 min",
    tags: ["DRE", "Fluxo de Caixa", "Lucratividade", "CMV", "Gestão Financeira"],
    linkTo: "/RelatorioDRE",
    linkText: "Abrir Relatório DRE",
    steps: [
      "Acesse 'Relatório DRE' no menu lateral.",
      "Selecione o período de apuração desejado (Mês Atual, Mês Anterior, Trimestre ou Ano).",
      "O relatório exibe a 'Receita Bruta' gerada pelas vendas.",
      "Deduza os descontos concedidos e impostos diretos para obter a 'Receita Líquida'.",
      "Acompanhe o 'CMV' (Custo das Mercadorias Vendidas) baseado no preço de custo cadastrado no catálogo.",
      "Visualize o 'Lucro Bruto' e as 'Despesas Operacionais' categorizadas.",
      "O resultado final aponta o 'Lucro Líquido do Exercício' e a margem percentual de retorno do negócio."
    ],
    tips: "Gere o DRE mensalmente para comparar a evolução dos custos fixos e a rentabilidade real das operações.",
    content: `## A Estrutura do DRE no PowerControl

O Demonstrativo do Resultado do Exercício é o relatório contábil mais valioso para a tomada de decisões estratégicas:
- **Receita Operacional Bruta:** Total faturado em vendas e serviços.
- **(-) CMV:** Custo real de reposição das mercadorias que saíram do estoque.
- **(=) Lucro Bruto:** Margem bruta de contribuição do negócio.
- **(-) Despesas Operacionais:** Gastos com pessoal, infraestrutura, aluguel, luz e tarifas bancárias.
- **(=) Lucro Líquido:** O que realmente sobrou no bolso da empresa.`
  },

  // --- ESTOQUE & COMPRAS ---
  {
    id: "estoque-entrada-xml",
    category: "estoque",
    title: "Importação de Nota Fiscal de Compra via Arquivo XML",
    summary: "Como ler o XML da NF-e do fornecedor, fazer o De-Para de produtos, atualizar estoque e gerar contas a pagar automaticamente.",
    readTime: "4 min",
    tags: ["Importação XML", "Compras", "Estoque", "Custo Médio", "Fornecedores"],
    isPopular: true,
    linkTo: "/Compras",
    linkText: "Ir para Compras / Entradas",
    steps: [
      "Acesse 'Compras' no menu lateral ou pressione 'Ctrl + Shift + B'.",
      "Clique no botão 'Importar XML' no topo da tela.",
      "Selecione o arquivo '.xml' da NF-e emitido pelo fornecedor da mercadoria.",
      "O sistema lê automaticamente o CNPJ do fornecedor, número da nota, chave de acesso e lista de itens.",
      "Na tela de conferência, faça o 'De-Para': associe cada item do XML a um produto já existente no seu catálogo ou marque para criar um produto novo.",
      "Verifique as quantidades, o valor unitário de custo e as alíquotas de ICMS/IPI calculadas pelo motor fiscal.",
      "Confirme a importação: o estoque físico é incrementado instantaneamente e as parcelas da compra são lançadas em 'Contas a Pagar'."
    ],
    tips: "Ao associar um produto pela primeira vez no De-Para, o sistema memoriza a referência do fornecedor para as próximas compras automáticas.",
    content: `## Automação na Entrada de Mercadorias

Importar o XML da nota do fornecedor elimina horas de digitação manual e evita erros de contagem:
- Atualização do Custo Médio Ponderado.
- Cadastro automático de novos produtos caso não existam no sistema.
- Lançamento automático dos vencimentos das duplicatas no Contas a Pagar.`
  },
  {
    id: "estoque-ajustes-inventario",
    category: "estoque",
    title: "Balanço de Estoque e Ajustes de Inventário (Perdas e Avarias)",
    summary: "Procedimento para realizar contagens físicas de prateleira, registrar quebras, avarias ou sobras com trilha de auditoria.",
    readTime: "3 min",
    tags: ["Ajuste de Estoque", "Inventário", "Avarias", "Perdas", "Auditoria"],
    linkTo: "/AjustesEstoque",
    linkText: "Fazer Ajuste de Estoque",
    steps: [
      "Acesse 'Ajustes de Estoque' no menu lateral.",
      "Selecione o produto que deseja ajustar através da busca por nome ou código de barras.",
      "Escolha o tipo de movimentação: 'Entrada por Acerto' ou 'Saída por Avaria / Perda / Validade'.",
      "Informe a quantidade a ajustar e o motivo detalhado (ex: 'Quebra de frasco no transporte interno').",
      "Confirme a operação. O saldo de estoque é corrigido imediatamente.",
      "Acesse 'Histórico de Estoque' para consultar o registro completo com data, operador e quantidades antes e depois do ajuste."
    ],
    tips: "Faça inventários rotativos periódicos por categoria para manter a acuracidade do estoque acima de 98%.",
    content: `## Governança e Auditoria de Estoque

No PowerControl, nenhum produto tem seu estoque alterado sem um registro auditável. Seja por venda, devolução, compra ou ajuste manual, todo movimento possui data, hora, motivo e identificação do usuário que realizou a operação.`
  },
  {
    id: "estoque-curva-abc",
    category: "estoque",
    title: "Curva ABC, Giro de Estoque e Lucratividade dos Produtos",
    summary: "Descubra quais produtos geram 80% do faturamento da loja (Classe A) e identifique itens com estoque parado para queima.",
    readTime: "3 min",
    tags: ["Curva ABC", "Giro de Estoque", "Lucratividade", "Estoque Mínimo"],
    linkTo: "/RelatorioGiro",
    linkText: "Ver Relatório de Giro",
    steps: [
      "Acesse 'Relatório de Giro' ou 'Relatório de Lucratividade' no menu lateral.",
      "Visualize o ranking de produtos classificados pelo método da Curva ABC:",
      "- **Classe A (Alta Importância):** Representam cerca de 80% do faturamento da empresa com 20% do catálogo. Nunca deixe faltar!",
      "- **Classe B (Média Importância):** Representam aproximadamente 15% do faturamento.",
      "- **Classe C (Baixa Importância):** Representam apenas 5% do faturamento, com risco de capital parado.",
      "Identifique os produtos que estão com saldo abaixo do 'Estoque Mínimo' de segurança para emitir novos pedidos de compra.",
      "Avalie itens sem movimentação nos últimos 60 dias para planejar promoções e liquidações."
    ],
    tips: "Evite comprar grandes volumes de itens da Classe C para não imobilizar capital de giro desnecessariamente.",
    content: `## Gestão Inteligente de Estoque

Saber o giro de cada mercadoria permite comprar melhor, negociar preços com fornecedores com base em volume real e maximizar o retorno sobre o capital investido nas prateleiras.`
  },

  // --- EQUIPE & COMISSÕES ---
  {
    id: "equipe-comissoes-lote",
    category: "equipe",
    title: "Apuração e Pagamento de Comissões em Lote para Vendedores",
    summary: "Como calcular comissões de vendas por período, conferir valores e liquidar pagamentos em lote gerando Contas a Pagar.",
    readTime: "3 min",
    tags: ["Comissões", "Vendedores", "Pagamento em Lote", "Folha", "Contas a Pagar"],
    isPopular: true,
    linkTo: "/Comissoes",
    linkText: "Acessar Módulo de Comissões",
    steps: [
      "Acesse 'Comissões' no menu lateral.",
      "Filtre pelo vendedor desejado e defina o período de competência (Ex: '01/01 a 31/01').",
      "O sistema lista todas as vendas vinculadas àquele vendedor e calcula o valor da comissão com base na taxa percentual contratada.",
      "Para pagar comissões de vários vendedores simultaneamente, clique em 'Pagar Comissões em Lote'.",
      "Um modal de confirmação exibirá a quantidade total de lançamentos e o montante consolidado a ser pago.",
      "Ao confirmar, o sistema marca os títulos como pagos e gera automaticamente o lançamento de despesa no 'Contas a Pagar' para apropriação contábil."
    ],
    tips: "Você pode estipular taxas de comissão diferentes por vendedor ou deixar o sistema aplicar a taxa padrão cadastrada na empresa.",
    content: `## Transparência no Fechamento de Vendas

O módulo de comissões garante que nem a empresa pague a mais, nem o vendedor receba a menos:
- Vendas canceladas têm suas comissões estornadas automaticamente.
- Fechamentos agrupados facilitam a integração com o departamento pessoal ou pagamento via PIX/bancário.`
  },
  {
    id: "equipe-convites-perfis",
    category: "equipe",
    title: "Gestão de Usuários, Convites e Níveis de Permissão",
    summary: "Como convidar operadores de caixa, gerentes e administradores, e como funciona a segurança multi-tenant por perfil.",
    readTime: "3 min",
    tags: ["Convites", "Usuários", "Permissões", "Segurança", "Perfis"],
    linkTo: "/Convites",
    linkText: "Gerenciar Convites",
    steps: [
      "Acesse 'Convites' no menu lateral.",
      "Clique no botão 'Novo Convite'.",
      "Informe o e-mail do funcionário que deseja convidar.",
      "Defina o 'Perfil de Acesso' (Role):",
      "- **Admin:** Acesso total a relatórios, configurações financeiras, dados fiscais e cancelamentos.",
      "- **User (Operador):** Acesso focado no Frente de Caixa (PDV), abertura de turnos e consulta básica de produtos.",
      "- **Vendedor:** Acesso ao Painel do Vendedor com consulta de suas próprias vendas e metas.",
      "Copie o link de convite ou solicite que o usuário acesse a tela de Registro usando exatamente o e-mail convidado.",
      "Ao se cadastrar, o usuário é automaticamente vinculado à sua empresa com o perfil selecionado."
    ],
    tips: "Nunca compartilhe senhas de administradores. Crie um usuário individual para cada operador de caixa para manter a auditoria precisa.",
    content: `## Controle de Acesso Baseado em Papéis (RBAC)

O PowerControl utiliza controle de acesso granular. Operadores de caixa não conseguem visualizar o DRE, dados de lucro líquido ou alterar alíquotas fiscais, garantindo sigilo e integridade operacional.`
  },

  // --- CADASTROS & CLIENTES ---
  {
    id: "cadastros-clientes-fornecedores",
    category: "cadastros",
    title: "Gestão Completa de Clientes e Fornecedores (PF e PJ)",
    summary: "Cadastro com consulta automática de CNPJ/CPF, limite de crédito de crediário, histórico de compras e contatos.",
    readTime: "3 min",
    tags: ["Clientes", "Fornecedores", "CNPJ", "CPF", "Cadastros"],
    linkTo: "/Clientes",
    linkText: "Ir para Clientes",
    steps: [
      "Para cadastrar um cliente: acesse 'Clientes' (ou 'Ctrl + Shift + C') e clique em 'Novo Cliente'.",
      "Escolha entre 'Pessoa Física' (CPF) ou 'Pessoa Jurídica' (CNPJ).",
      "Ao digitar o CNPJ, utilize a consulta automática para preencher Razão Social, Nome Fantasia, CEP e Endereço direto da Receita Federal.",
      "Defina um 'Limite de Crédito' caso a empresa trabalhe com vendas a prazo/crediário para esse cliente.",
      "Para fornecedores: acesse 'Fornecedores' no menu lateral para registrar dados de contato, prazos médios de pagamento e Inscrição Estadual.",
      "Na ficha do cliente, você pode visualizar todo o histórico de compras já realizadas e o saldo devedor atual."
    ],
    tips: "O preenchimento correto do e-mail do cliente garante que o DANFE em PDF e o XML da nota fiscal sejam enviados automaticamente a cada compra.",
    content: `## Base Cadastral Unificada

Manter clientes e fornecedores organizados com documentos válidos é essencial para a emissão correta de notas fiscais (NF-e/NFC-e) e para evitar rejeições da SEFAZ relacionadas a Inscrições Estaduais desatualizadas.`
  },

  // --- CONFIGURAÇÕES, SEGURANÇA & ATALHOS ---
  {
    id: "config-atalhos-teclado",
    category: "geral",
    title: "Guia Completo de Atalhos Globais de Teclado",
    summary: "Tabela com todos os atalhos de alta produtividade para navegar entre PDV, Estoque, Clientes, Financeiro e Busca Global sem tirar a mão do teclado.",
    readTime: "2 min",
    tags: ["Atalhos", "Teclado", "Produtividade", "Busca Global", "Navegação"],
    isPopular: true,
    steps: [
      "Pressione 'Ctrl + P' em qualquer tela para abrir instantaneamente o Frente de Caixa (PDV / Vender).",
      "Pressione 'Ctrl + E' para acessar o Catálogo de Produtos e Estoque.",
      "Pressione 'Ctrl + D' para voltar ao Dashboard Principal.",
      "Pressione 'Ctrl + K' para abrir a Busca Global Inteligente (pesquise qualquer tela, produto ou cliente).",
      "Pressione 'Ctrl + Shift + C' (ou 'Alt + C') para ir para Clientes.",
      "Pressione 'Ctrl + Shift + F' (ou 'Alt + F') para ir para Contas a Pagar / Financeiro.",
      "Pressione 'Ctrl + Shift + X' (ou 'Alt + X') para gerenciar Caixas e Turnos.",
      "Pressione 'Ctrl + Shift + B' (ou 'Alt + B') para acessar Compras e Entradas XML.",
      "Pressione 'Alt + H' (ou '?' fora de campos de texto) para abrir o painel visual com todos os atalhos."
    ],
    tips: "O atalho 'Ctrl + K' é o mais poderoso do sistema: basta digitar as primeiras letras do que deseja para abrir telas sem usar o mouse.",
    content: `## Máxima Produtividade no Teclado

O PowerControl foi desenhado pensando na velocidade dos operadores comerciais e financeiros:
- Todas as rotinas principais contam com combinações universais de teclas.
- Acesso rápido ao leitor e comandos com uma mão só.`
  },
  {
    id: "config-multiempresa",
    category: "geral",
    title: "Gestão Multiempresa (Multi-tenant): Como alternar entre Lojas",
    summary: "Entenda o funcionamento multi-tenant, como mudar de filial no seletor superior e a garantia de isolamento total de caixas e estoque.",
    readTime: "2 min",
    tags: ["Multi-tenant", "Filiais", "Empresas", "Isolamento", "Segurança"],
    linkTo: "/Empresa",
    linkText: "Ver Dados da Empresa",
    steps: [
      "Se o seu usuário possuir acesso a mais de uma loja ou filial, localize o 'Seletor de Empresa' no topo do sistema.",
      "Clique no nome da empresa atual para abrir o menu suspenso de filiais disponíveis.",
      "Selecione a empresa que deseja operar.",
      "O sistema atualiza o contexto imediatamente: caixas, estoque, faturamento e contas a pagar são isolados por CNPJ.",
      "Não é necessário fazer logout e login novamente para gerenciar múltiplos negócios."
    ],
    tips: "Usuários com perfil Administrador Master têm acesso a um Dashboard Global consolidando os números de todas as unidades.",
    content: `## Arquitetura Multi-tenant Segura

Cada empresa cadastrada no PowerControl possui seu próprio ambiente isolado:
- Impossibilidade de vazamento de estoque entre lojas diferentes.
- Certificados digitais e configurações tributárias individuais por CNPJ.
- Relatórios consolidados disponíveis no painel corporativo.`
  },
  {
    id: "config-impressora-termica",
    category: "geral",
    title: "Configuração de Impressora Térmica Não Fiscal (58mm e 80mm)",
    summary: "Como ajustar as preferências de impressão para bobinas térmicas de cupom de 58mm ou 80mm com corte automático.",
    readTime: "2 min",
    tags: ["Impressora", "Térmica", "Bobina 80mm", "Cupom", "Recibo"],
    linkTo: "/Configuracoes",
    linkText: "Configurar Impressão",
    steps: [
      "Acesse 'Configurações' no menu lateral e navegue até a aba 'Impressão'.",
      "Selecione a largura da sua bobina de papel: '80mm' (padrão de impressoras como Epson TM-T20, Bematech MP-4200, Elgin i9) ou '58mm' (maquininhas POS portáteis e mini-impressoras térmicas).",
      "Ative a opção 'Impressão Automática ao Finalizar Venda' se desejar disparar o cupom sem cliques adicionais.",
      "Clique em 'Salvar Configurações'.",
      "No diálogo de impressão do navegador, selecione a impressora térmica como padrão e marque 'Margens: Nenhuma' para encaixe milimétrico."
    ],
    tips: "Desmarque a opção 'Cabeçalhos e Rodapés' nas configurações de impressão do navegador para não imprimir data e URL no cupom térmico.",
    content: `## Compatibilidade Universal com Impressoras Térmicas

O gerador de comprovantes do PowerControl emite código limpo compatível com qualquer impressora térmica USB, de rede cabeada/Wi-Fi ou Bluetooth do mercado brasileiro.`
  }
];

export function searchKnowledgeArticles(
  articles: KnowledgeArticle[],
  query: string,
  category: string
): KnowledgeArticle[] {
  const cleanQuery = (query || "").trim().toLowerCase();

  return articles.filter(article => {
    const matchesCategory = category === "all" || article.category === category;
    if (!matchesCategory) return false;

    if (!cleanQuery) return true;

    const inTitle = article.title.toLowerCase().includes(cleanQuery);
    const inSummary = article.summary.toLowerCase().includes(cleanQuery);
    const inContent = article.content.toLowerCase().includes(cleanQuery);
    const inTags = article.tags.some(tag => tag.toLowerCase().includes(cleanQuery));

    return inTitle || inSummary || inContent || inTags;
  });
}
