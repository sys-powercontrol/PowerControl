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
  History,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "../lib/dateUtils";

export default function Support() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");

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

  const replyMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string, text: string }) => {
      const ticket = tickets.find(t => t.id === id);
      if(!ticket) throw new Error("Aconteceu algum problema e não conseguimos resgatar o ID deste chamado.");
      
      const newReply = {
        author: 'user',
        author_name: user?.full_name || 'Usuário',
        text: text,
        created_at: new Date().toISOString()
      };

      const updatedReplies = ticket.replies ? [...ticket.replies, newReply] : [newReply];

      return api.put("support_tickets", id, {
        replies: updatedReplies,
        status: "OPEN", // Voltar para open pra forçar os analistas a olharem
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      setReplyText("");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar resposta: " + error.message);
    }
  });

  // Keep modal data synced
  useEffect(() => {
    if (selectedTicket) {
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
    }
  }, [tickets, selectedTicket?.id]);

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
                  <div 
                    key={ticket.id} 
                    onClick={() => setSelectedTicket(ticket)}
                    className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 cursor-pointer hover:bg-white hover:border-blue-200 transition-all hover:shadow-md hover:shadow-blue-50 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-blue-500 transition-colors">#{ticket.id.substr(0, 8).toUpperCase()}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.subject}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <span className="text-[10px] text-gray-400 font-medium">
                        Aberto em {formatBR(ticket.created_at, "dd/MM/yyyy HH:mm")}
                      </span>
                      {ticket.internal_notes && (
                        <span className="text-[10px] text-blue-600 font-bold italic">Visualizar Resposta</span>
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

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase">Ticket #{selectedTicket.id}</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Opener initial message */}
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase ml-2">Você - {formatBR(selectedTicket.created_at, "dd/MM/yyyy HH:mm")}</span>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-gray-800 max-w-[85%] whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Specialist Original Answer (Legacy notes format handling) */}
              {selectedTicket.internal_notes && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase mr-2">Suporte Técnico</span>
                  <div className="bg-blue-600 px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white max-w-[85%] whitespace-pre-wrap shadow-md shadow-blue-100">
                    {selectedTicket.internal_notes}
                  </div>
                </div>
              )}

              {/* Replies Iterator */}
              {selectedTicket.replies?.map((reply: any, index: number) => (
                <div key={index} className={`flex flex-col gap-1 ${reply.author === 'user' ? 'items-start' : 'items-end'}`}>
                   <span className={`text-[10px] font-bold uppercase ${reply.author === 'user' ? 'text-gray-400 ml-2' : 'text-blue-400 mr-2'}`}>
                     {reply.author === 'user' ? 'Você' : 'Suporte Técnico'} - {formatBR(reply.created_at, "dd/MM/yyyy HH:mm")}
                   </span>
                   <div className={`px-4 py-3 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap ${
                     reply.author === 'user' 
                      ? 'bg-gray-100 text-gray-800 rounded-tl-sm' 
                      : 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-100'
                   }`}>
                     {reply.text}
                   </div>
                </div>
              ))}

              {selectedTicket.status === 'CLOSED' && (
                <div className="text-center py-4 text-sm text-gray-400 font-medium">
                  Este chamado foi encerrado e não aceita mais mensagens.
                </div>
              )}

            </div>

            {selectedTicket.status !== 'CLOSED' && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 rounded-b-3xl">
                 <input 
                   type="text" 
                   value={replyText}
                   onChange={e => setReplyText(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && replyText.trim() && !replyMutation.isPending) {
                       replyMutation.mutate({ id: selectedTicket.id, text: replyText.trim() });
                     }
                   }}
                   placeholder="Digite uma nova mensagem ou resposta ao operador..."
                   className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                 />
                 <button 
                  onClick={() => {
                    if (replyText.trim() && !replyMutation.isPending) {
                      replyMutation.mutate({ id: selectedTicket.id, text: replyText.trim() });
                    }
                  }}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                 >
                   <Send size={20} />
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
