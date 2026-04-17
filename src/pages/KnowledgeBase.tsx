import React, { useState } from "react";
import { 
  Book, 
  Search, 
  FileText, 
  Settings, 
  DollarSign, 
  Package, 
  Shield, 
  ChevronRight,
  PlayCircle
} from "lucide-react";

const categories = [
  {
    id: "getting-started",
    title: "Primeiros Passos",
    icon: PlayCircle,
    color: "text-blue-600",
    bg: "bg-blue-50",
    articles: [
      { id: "1", title: "Como configurar sua empresa" },
      { id: "2", title: "Convidando novos usuários" },
      { id: "3", title: "Visão geral do Dashboard" }
    ]
  },
  {
    id: "sales",
    title: "Vendas e PDV",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
    articles: [
      { id: "4", title: "Como abrir e fechar o caixa" },
      { id: "5", title: "Realizando a primeira venda" },
      { id: "6", title: "Cancelamento e devolução" }
    ]
  },
  {
    id: "inventory",
    title: "Estoque e Produtos",
    icon: Package,
    color: "text-orange-600",
    bg: "bg-orange-50",
    articles: [
      { id: "7", title: "Cadastrando produtos simples" },
      { id: "8", title: "Ajuste manual de estoque" },
      { id: "9", title: "Entrada de notas de compra" }
    ]
  },
  {
    id: "fiscal",
    title: "Fiscal e Certificados",
    icon: Shield,
    color: "text-purple-600",
    bg: "bg-purple-50",
    articles: [
      { id: "10", title: "Como importar o Certificado A1" },
      { id: "11", title: "Configurando impostos (NCM/CFOP)" },
      { id: "12", title: "Emitindo NF-e e NFC-e" }
    ]
  },
  {
    id: "settings",
    title: "Configurações",
    icon: Settings,
    color: "text-gray-600",
    bg: "bg-gray-50",
    articles: [
      { id: "13", title: "Permissões de usuários" },
      { id: "14", title: "Personalizando a marca" },
      { id: "15", title: "Integração com maquininhas" }
    ]
  }
];

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

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
          filteredCategories.map((category) => (
            <div key={category.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-4 rounded-2xl ${category.bg} ${category.color}`}>
                  <category.icon size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
              </div>
              <div className="space-y-3">
                {category.articles.map((article) => (
                  <button 
                    key={article.id}
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
          ))
        )}
      </div>
    </div>
  );
}
