import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { notificationApi } from "../services/notificationApi";
import { 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  History
} from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "../lib/dateUtils";

export default function Support() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = api.subscribe("support_tickets", { user_id: user.id }, (data) => {
      setTickets(data.sort((a, b) => {
        const dateA = a.created_at?.seconds || a.created_at || 0;
        const dateB = b.created_at?.seconds || b.created_at || 0;
        return dateB > dateA ? 1 : -1;
      }));
    });
    return () => unsubscribe();
  }, [user]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("support_tickets", {
        ...data,
        user_id: user?.id,
        user_name: user?.full_name,
        user_email: user?.email,
        company_id: user?.company_id,
        status: "OPEN",
        priority: "MEDIUM",
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: async (data, variables) => {
      toast.success("Chamado aberto com sucesso! Retornaremos em breve.");
      
      // Enviar notificação via Webhook
      await notificationApi.sendSupportWebhook({
        ...variables,
        user_name: user?.full_name,
        user_email: user?.email,
        company_id: user?.company_id,
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao abrir chamado: " + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    await createTicketMutation.mutateAsync({ subject, message });
    (e.target as HTMLFormElement).reset();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={10} /> Aberto</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle size={10} /> Em Atendimento</span>;
      case "CLOSED":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Concluído</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const faqs = [
    { q: "Como abrir um novo caixa?", a: "Vá em 'Caixas' no menu lateral, escolha o caixa desejado e clique em 'Abrir Caixa'. Informe o saldo inicial e confirme." },
    { q: "Como emitir nota fiscal?", a: "No histórico de vendas, localize a venda desejada e clique no ícone de documento 'Emitir NF'. Certifique-se de que a API Fiscal está configurada." },
    { q: "Posso ter mais de uma empresa?", a: "Sim, o PowerControl é multi-tenant. Você pode gerenciar múltiplas empresas se tiver permissão de Admin Enterprise." },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-100">
          <HelpCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Como podemos ajudar?</h1>
        <p className="text-gray-500 max-w-md mx-auto">Estamos aqui para garantir que sua experiência com o PowerControl seja incrível.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" /> Envie uma mensagem
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Assunto</label>
                <select 
                  name="subject"
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                  name="message"
                  required 
                  rows={4} 
                  placeholder="Descreva seu problema ou dúvida em detalhes..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={createTicketMutation.isPending}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {createTicketMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </form>
          </div>

          {/* My Tickets */}
          {tickets.length > 0 && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History size={20} className="text-blue-600" /> Meus Chamados
              </h2>
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase">#{ticket.id.substr(0, 8).toUpperCase()}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h3 className="font-bold text-gray-900">{ticket.subject}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <span className="text-[10px] text-gray-400 font-medium">
                        Aberto em {formatBR(ticket.created_at, "dd/MM/yyyy HH:mm")}
                      </span>
                      {ticket.internal_notes && (
                        <span className="text-[10px] text-blue-600 font-bold italic">Resposta disponível</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <Link to="/BaseConhecimento" className="flex items-center justify-center gap-2 text-sm font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors w-max">
              Acessar Docs <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center py-8 border-t border-gray-100">
        <p className="text-sm text-gray-400">© 2026 PowerControl. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
