import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";

export default function Support() {
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success("Mensagem enviada! Retornaremos em breve.");
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  const faqs = [
    { q: "Como abrir um novo caixa?", a: "Vá em 'Caixas' no menu lateral, escolha o caixa desejado e clique em 'Abrir Caixa'. Informe o saldo inicial e confirme." },
    { q: "Como emitir nota fiscal?", a: "No histórico de vendas, localize a venda desejada e clique no ícone de documento 'Emitir NF'. Certifique-se de que a API Fiscal está configurada." },
    { q: "Posso ter mais de uma empresa?", a: "Sim, o PowerControl é multi-tenant. Você pode gerenciar múltiplas empresas se tiver permissão de Admin Enterprise." },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
          <HelpCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Como podemos ajudar?</h1>
        <p className="text-gray-500 max-w-md mx-auto">Estamos aqui para garantir que sua experiência com o PowerControl seja incrível.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" /> Envie uma mensagem
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Assunto</label>
              <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione um assunto...</option>
                <option value="Dúvida Técnica">Dúvida Técnica</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Sugestão">Sugestão</option>
                <option value="Erro no Sistema">Erro no Sistema</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Mensagem</label>
              <textarea 
                required 
                rows={4} 
                placeholder="Descreva seu problema ou dúvida em detalhes..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSending}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isSending ? "Enviando..." : "Enviar Mensagem"}
            </button>
          </form>
        </div>

        {/* FAQ & Quick Links */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" /> Perguntas Frequentes
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="group">
                  <details className="cursor-pointer">
                    <summary className="font-bold text-sm text-gray-700 flex items-center justify-between list-none">
                      {faq.q}
                      <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed pl-2 border-l-2 border-blue-100">
                      {faq.a}
                    </p>
                  </details>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 space-y-4">
            <h3 className="font-bold text-lg">Documentação Completa</h3>
            <p className="text-sm opacity-80">Acesse nosso guia completo para dominar todas as ferramentas do PowerControl.</p>
            <button className="flex items-center gap-2 text-sm font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors">
              Acessar Docs <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center py-8 border-t border-gray-100">
        <p className="text-sm text-gray-400">© 2026 PowerControl. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
