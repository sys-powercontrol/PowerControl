import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import ReactMarkdown from 'react-markdown';
import { 
  Book, 
  Search, 
  FileText, 
  Settings, 
  DollarSign, 
  Package, 
  Shield, 
  ChevronRight,
  PlayCircle,
  ArrowLeft,
  Info
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  PlayCircle: PlayCircle,
  DollarSign: DollarSign,
  Package: Package,
  Shield: Shield,
  Settings: Settings,
  Book: Book,
  FileText: FileText,
  Info: Info
};

// Mock data used as fallback if nothing is found in DB
const fallbackCategories = [
  {
    id: "getting-started",
    title: "Primeiros Passos",
    icon_name: "PlayCircle",
    color: "text-blue-600",
    bg: "bg-blue-50",
    articles: [
      { 
        id: "1", 
        title: "Como configurar sua empresa", 
        content: `## Configuração Inicial da Empresa

Bem-vindo ao **PowerControl**! Para iniciar a utilização do nosso ERP e PDV, o primeiro passo é configurar os detalhes da sua empresa. Isso é fundamental para garantir que recibos, notas fiscais e relatórios apresentem os dados corretos.

### Passo 1: Acessar Configurações
1. No menu lateral, navegue até a sessão **Minha Empresa** (ou Configurações).
2. Você verá as abas "Dados Cadastrais" e "Fiscal".

### Passo 2: Preencher Dados Básicos
Na aba Dados Cadastrais, insira:
- **Razão Social / Nome Fantasia:** Como sua empresa é conhecida.
- **CNPJ:** Obrigatório para emissão de notas.
- **Endereço Completo:** Será utilizado nos cabeçalhos das suas impressões.
- **Logo:** Faça o upload de uma imagem que será usada no topo do sistema e em relatórios.

### Passo 3: Configurar Chave PIX (Dinâmica)
Para facilitar recebimentos no Frente de Caixa, adicione a sua **Chave PIX** principal.
- Recomendamos usar as chaves atreladas à conta CNPJ.
- Com a chave preenchida, o sistema irá gerar o QR Code *dinamicamente* a cada venda finalizada em PIX.

Após preencher tudo, clique em **Salvar Dados**. Você já pode ir para o próximo passo!
        ` 
      },
      { 
        id: "2", 
        title: "Convidando novos usuários", 
        content: `## Gestão de Equipe e Permissões

Administrar quem tem acesso ao sistema é vital para a segurança contábil e de estoque.

### Enviando Convites
O PowerControl funciona com um sistema de *invites*. Você não cria a senha do seu funcionário, você manda um convite para ele:

1. Acesse o menu **Convites**.
2. Clique no botão azul **Novo Convite**.
3. Insira o **Email** do colaborador.
4. Escolha o **Perfil de Acesso** (Role). O sistema diferencia entre \`admin\` (pode alterar dados sistêmicos) e \`user\` (operador comum de caixa).

### O que o funcionário deve fazer?
Quando você gerar um link, ele aparecerá na tela com o status *Pendente*. 
Seu colaborador deve:
- Acessar o sistema, ir em "Registro" ou "Criar Conta".
- Usar o EXATO e-mail preenchido no invite.
- **Bônus:** Ao terminar de criar a conta, se for um convite válido, ele entrará diretamente na sua empresa (tenant), sem burocracia de IDs organizacionais.
        ` 
      },
      { 
        id: "3", 
        title: "Visão geral do Dashboard", 
        content: `## Entendendo o Dashboard

O **Dashboard** é a central de comando da sua loja do PowerControl. Nele você tem a visão métrica instantânea do seu dia e mês.

### Visão Rápida (Cards)
No topo, você tem caixas informativas sobre as vendas efetuadas de forma global (ou por caixa individual dependendo da seleção temporal).

### Gráficos
Nossos gráficos (desenhados em formato de barras e pizza) atualizam em tempo real. Eles cruzam as vendas dos últimos dias com a movimentação real da aba Financeira.

\`\`\`tip
Aproveite o filtro de datas superior! Por padrão, mostra o mês atual, mas você pode mudar para visualizar a semana ou o semestre num clique.
\`\`\`
        ` 
      }
    ]
  },
  {
    id: "sales",
    title: "Vendas e PDV",
    icon_name: "DollarSign",
    color: "text-green-600",
    bg: "bg-green-50",
    articles: [
      { 
        id: "4", 
        title: "Como abrir e fechar o caixa", 
        content: `## Ciclo do Caixa de Vendas

Para vender, é preciso garantir que o caixa está formalmente *Aberto*. Esse padrão imita o comportamento contábil mundial (D0) para garantir fechamentos perfeitos.

### Abrindo o Caixa (Aporte)
1. Antes de iniciar seu turno, vá ao painel **Caixas** ou tente acessar o **Vender**.
2. Clique em **Abrir Novo Caixa**.
3. Informe o valor do "Troco Inicial" (Aporte). Esse valor será o seu ponto de partida; vamos supor que exista R$ 50,00 na gaveta em notas miúdas.

### Fechando o Caixa
1. Ao final do turno, acione **Fechar Caixa** no canto direito do grid da sessão Caixas.
2. O sistema perguntará se os valores contados fisicamente "batem" numeração à numeração.
3. Se um Caixa estiver com status \`Fechado\`, é **Impossível** injetar mais vendas nele. Essa trava de arquitetura garante que ontem é ontem e não sofre injeções de furos contábeis acidentais!
        ` 
      },
      { 
        id: "5", 
        title: "Realizando a primeira venda", 
        content: `## PDV: Realizando a Venda

O Frente de Caixa do PowerControl foi construído focando com a máxima velocidade (Otimizado offline-first e compatível com leitores de código).

### Adicionando Itens
Vá em **Vender**. Em "Pesquisar por nome ou código...", você pode:
- Atirar pelo Leitor Ótico de Código de Barras (O foco automático captura o número, e já adiciona o item ao Carrinho ao receber o \`Enter\`).
- Clicar nas *Badges* das Categorias laterais para uso em Tablet Touch.

### Finalizando o Checkout
Na coluna da direita, você tem o fechamento do carrinho.
1. Determine se haverá um cliente nominal.
2. Defina os descontos.
3. Clique em **Prosseguir para Pagamento**
4. Selecione Dinheiro, PIX ou Cartão (ou Múltiplos).

### Pagamento via PIX
Se optar por PIX, clique em **Gerar QR Code**. Nosso sistema *BaaS* gera o Code BR-EMV assinado, contendo o valor exato cruzado com as suas informações da empresa cadastradas em Configurações.
        ` 
      },
      { 
        id: "6", 
        title: "Simulação de Resiliência Offline", 
        content: `## Você está sem internet. E agora?

Tranquilo! Nossa infraestrutura adota a cultura **Offline-First**.

### O que o sistema permite quando não tem internet?
- Iniciar uma sessão na aba de \`Vender\`.
- Realizar a busca de catálogo inteiro (pois é indexado em Cache).
- **Finalizar o Pagamento**. O sistema informará em tela que a transação foi retida localmente por falta de rede.
- Gerir até clientes num novo cadastro para fechar vendas atreladas a fiado ou conta provisória.

### A Conexão Retornou
O nosso *Service Worker* (motor interno do navegador via PWA) possui um Background Sync. Quando a internet volta na máquina ou celular do seu colaborador, uma fila (chamada \`sync-sales\`) será despejada para a nuvem. Ele enviará todos os dados represados com até 3 retentativas automáticas, tudo debaixo dos panos de forma invisível.
        ` 
      }
    ]
  },
  {
    id: "finance",
    title: "Módulo Financeiro",
    icon_name: "DollarSign",
    color: "text-amber-600",
    bg: "bg-amber-50",
    articles: [
      { 
        id: "7", 
        title: "Contas a Pagar e Receber", 
        content: `## Gerenciamento Financeiro Completo

As telas financeiras fornecem o panorama do seu passivo e ativo.

### Títulos Pagos e Falhas de Ocorrência (Estornos)
Um título pode ser faturado (liquefeito num saldo real de conta corrente) apenas uma vez. Se o lançamento for registrado incorretamente:
1. Navegue até Contas Pagas/Recebidas.
2. Acione o botão de **Estorno** (Atenção: A lixeira fica travada se a conta está finalizada).
3. O sistema estornará o saldo fisicamente de volta à origem. Porém, se a conta for pertinente a um turno de Caixa que *já foi finalizado formalmente*, seu estorno não é aprovado programaticamente (regra estrita anti-orfanato). Nesse caso, lance de forma invertida usando o módulo \`Movimentações\`.
        ` 
      }
    ]
  },
  {
    id: "inventory",
    title: "Estoque e Produtos",
    icon_name: "Package",
    color: "text-orange-600",
    bg: "bg-orange-50",
    articles: [
      { 
        id: "8", 
        title: "Entrada de notas de compra", 
        content: `## Compras de Fornecedores

Manter o estoque em níveis saudáveis é uma rotina vital. No ERP, você lança não apenas o incremento bruto das prateleiras, mas o tributo que forma o custo dele.

### Passo da Entrada:
Navegue ao menu lateral => **Compras**.
Escolha um Fornecedor Selecionável e adicione a remessa vinda por ele.

O Motor Tributário (\`fiscal.ts\`) se ativará nesse formulário, e cruzando o *"Estado de Origem (do fornecedor)"* para seu *"Estado de Destino (Configurações de sua Empresa)"*, com o devido cálculo do Regime (Ex. Simples Nacional vs. Normal), para descobrir a alíquota base (ICMS, IPI) e formular seu verdadeiro custo para você descobrir lá na frente a margem correta de Lucratividade.
        ` 
      }
    ]
  },
  {
    id: "fiscal",
    title: "Fiscal e Certificados",
    icon_name: "Shield",
    color: "text-purple-600",
    bg: "bg-purple-50",
    articles: [
      { 
        id: "10", 
        title: "Como funcionam as emissões (NFC-e / NF-e)", 
        content: `## Conformidade SEFAZ no ERP

O sistema traz embarcado na arquitetura dois gatilhos emissores integrados com **FocusNFe** e desbloqueado perante a **WebmaniaBR**.

### O que você precisa:
Basta ter os tokens e ambiente válidos criados em referida plataforma integradora, salvá-los no módulo **Configuração de Emissor**. Com isso, notas ao consumidor finais atirarão na rede da adquirente assim que ativadas.

*Nota:* O certificado \`A1\` atual em formato \`.pfx\` não processa dentro do banco de dados na nuvem da aplicação nativamente, deve ser submetido diretamente via o parceiro autorizado de sua preferência. O PowerControl só atua como interface integradora via REST API.
        ` 
      }
    ]
  }
];

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["knowledge_categories"],
    queryFn: () => api.get("knowledge_categories", { _orderBy: "order", _orderDir: "asc" }),
  });

  const activeCategories = useMemo(() => {
    return dbCategories.length > 0 ? dbCategories : fallbackCategories;
  }, [dbCategories]);

  const filteredCategories = activeCategories.map((category: any) => ({
    ...category,
    articles: (category.articles || []).filter((article: any) => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter((category: any) => category.articles.length > 0);

  if (selectedArticle) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Voltar para Base de Conhecimento
        </button>

        <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm space-y-8 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
           <div className="space-y-4">
             <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight block">{selectedArticle.title}</h1>
           </div>
           
           <div className="prose prose-blue max-w-none text-gray-600 prose-headings:text-gray-900 prose-a:text-blue-600">
             {selectedArticle.content ? (
               <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
             ) : (
               <p className="italic text-gray-400">Conteúdo não disponível para este tutorial.</p>
             )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-blue-600 rounded-3xl p-12 text-center text-white shadow-xl shadow-blue-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto">
            <Book size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold">Base de Conhecimento</h1>
          <p className="text-blue-100 max-w-xl mx-auto text-lg">
            Encontre tutoriais, guias passo a passo e respostas para as dúvidas mais comuns sobre o PowerControl.
          </p>
          
          <div className="max-w-2xl mx-auto relative mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <input 
              type="text" 
              placeholder="O que você está procurando?" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white text-gray-900 rounded-2xl outline-none focus:ring-4 focus:ring-blue-400/50 shadow-lg text-lg transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhum artigo encontrado para "{searchTerm}".
          </div>
        ) : (
          filteredCategories.map((category: any) => {
            const IconComp = ICON_MAP[category.icon_name] || Info;
            return (
            <div key={category.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl ${category.bg || 'bg-gray-50'} ${category.color || 'text-gray-600'}`}>
                  <IconComp size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {category.articles.map((article: any) => (
                  <button 
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-left group transition-colors"
                  >
                    <div className="flex items-center gap-3 text-gray-600 group-hover:text-blue-600 transition-colors">
                      <FileText size={18} className="text-gray-400 group-hover:text-blue-500" />
                      <span className="font-medium">{article.title}</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
