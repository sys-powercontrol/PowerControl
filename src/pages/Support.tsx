import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { notificationApi } from "../services/notificationApi";
import { 
  MessageSquare, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Send,
  PhoneCall,
  Mail,
  Search,
  Wifi,
  ShieldCheck,
  LifeBuoy,
  RefreshCw,
  Paperclip,
  ChevronDown,
  X,
  Keyboard,
  Info,
  Edit,
  Upload,
  Download,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "../lib/dateUtils";
import { FooterConfig, DEFAULT_FOOTER_CONFIG } from "../types/footer";

interface SupportChannelsConfig {
  email_title: string;
  email_address: string;
  email_sla: string;
  whatsapp_title: string;
  whatsapp_number: string;
  whatsapp_hours: string;
  whatsapp_link: string;
  phone_title: string;
  phone_number: string;
  phone_hours: string;
  phone_badge: string;
}

const DEFAULT_SUPPORT_CHANNELS: SupportChannelsConfig = {
  email_title: "E-mail Oficial",
  email_address: "suporte@powercontrol.com.br",
  email_sla: "SLA 2h",
  whatsapp_title: "WhatsApp Comercial",
  whatsapp_number: "(11) 99999-9999",
  whatsapp_hours: "Seg à Sáb",
  whatsapp_link: "https://wa.me/5511999999999",
  phone_title: "Central 0800",
  phone_number: "0800 789 4000",
  phone_hours: "08:00 - 18:00",
  phone_badge: "Gratuito"
};

const FAQS = [
  {
    id: "shortcuts",
    cat: "navigation",
    q: "Quais são os atalhos de teclado do sistema?",
    a: `O PowerControl oferece atalhos de teclado globais para acelerar a produtividade:\n\n• Ctrl + P: Abrir PDV / Nova Venda\n• Ctrl + E: Ir para Catálogo de Produtos / Estoque\n• Ctrl + D: Ir para o Dashboard Executive\n• Ctrl + Shift + C (ou Alt + C): Ir para Gestão de Clientes\n• Ctrl + Shift + F (ou Alt + F): Ir para Contas a Pagar / Financeiro\n• Ctrl + Shift + X (ou Alt + X): Gerenciar Caixas e Operações\n• Ctrl + Shift + B (ou Alt + B): Ir para Compras e Entradas\n• Ctrl + K: Abrir Busca Global Inteligente\n• Alt + H (ou ?): Abrir Painel de Atalhos de Teclado\n\nVocê também pode pressionar Alt + H a qualquer momento para abrir o guia visual.`
  },
  {
    id: "caixa",
    cat: "pdv",
    q: "Como realizar a abertura e o fechamento de caixa?",
    a: "1. Acesse a opção 'Caixas' no menu lateral.\n2. Escolha o terminal desejado e clique em 'Abrir Caixa'.\n3. Informe o valor inicial do fundo de troco (suprimento) e confirme.\n4. Ao final do expediente, selecione 'Fechar Caixa', efetue a conferência física do dinheiro, sangrias e comprovantes e confirme o encerramento."
  },
  {
    id: "nfe",
    cat: "fiscal",
    q: "Como emitir nota fiscal (NF-e ou NFC-e) pelo sistema?",
    a: "Para emitir notas fiscais:\n1. Certifique-se de ter feito o upload do seu Certificado Digital A1 em 'Configurações > Aba Fiscal'.\n2. Na tela de Histórico de Vendas ou no próprio encerramento da venda no PDV, clique no ícone 'Emitir NF-e' ou 'Emitir NFC-e'.\n3. O sistema fará a transmissão direta para a SEFAZ do seu estado e gerará o DANFE em PDF e o arquivo XML."
  },
  {
    id: "pix",
    cat: "financeiro",
    q: "Como funciona a geração de QR Code PIX no PDV?",
    a: "Nas Configurações da Empresa, insira sua Chave PIX oficial. Ao selecionar a opção de pagamento 'PIX' no caixa, o PowerControl gera dinamicamente o QR Code PIX Copia e Cola na tela com o valor exato do pedido, garantindo conciliação automática rápida."
  },
  {
    id: "multiempresa",
    cat: "geral",
    q: "Posso gerenciar mais de uma loja ou empresa no mesmo login?",
    a: "Sim! O PowerControl possui arquitetura multi-tenant nativa. Se a sua assinatura possuir acesso a múltiplas empresas, você pode alternar entre elas no seletor do topo sem precisar deslogar."
  },
  {
    id: "estoque",
    cat: "estoque",
    q: "Como dar entrada em produtos via arquivo XML de fornecedor?",
    a: "Acesse 'Compras & Entradas' no menu lateral, clique em 'Importar XML' e faça o upload da NF-e enviada pelo fornecedor. O sistema correlacionará os produtos cadastrados automaticamente e atualizará a quantidade e o custo do estoque."
  }
];

export default function Support() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;
  const [replyText, setReplyText] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Active Company Data
  const activeCompanyId = api.getCompanyId() || user?.company_id;
  const { data: companyData } = useQuery({
    queryKey: ["company", activeCompanyId],
    queryFn: () => api.get(`companies/${activeCompanyId}`),
    enabled: !!activeCompanyId,
  });

  // Footer Settings (Firestore system_settings/footer configured in Admin Master -> Rodapé)
  const { data: footerConfig = DEFAULT_FOOTER_CONFIG } = useQuery({
    queryKey: ["system_settings", "footer"],
    queryFn: async () => {
      try {
        const docRef = doc(db, "system_settings", "footer");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { ...DEFAULT_FOOTER_CONFIG, ...docSnap.data() } as FooterConfig;
          try {
            localStorage.setItem("system_settings_footer", JSON.stringify(data));
          } catch {
            // ignore
          }
          return data;
        }
      } catch (err) {
        console.warn("Notice loading footer config (using fallback):", err);
      }
      try {
        const cached = localStorage.getItem("system_settings_footer");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
      return DEFAULT_FOOTER_CONFIG;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Support Channels Config (Firestore system_settings/support_channels)
  const { data: channelsConfig = DEFAULT_SUPPORT_CHANNELS, refetch: refetchChannels } = useQuery({
    queryKey: ["system_settings", "support_channels"],
    queryFn: async () => {
      try {
        const docRef = doc(db, "system_settings", "support_channels");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { ...DEFAULT_SUPPORT_CHANNELS, ...docSnap.data() } as SupportChannelsConfig;
          try {
            localStorage.setItem("system_settings_support_channels", JSON.stringify(data));
          } catch {
            // ignore
          }
          return data;
        }
      } catch (err) {
        console.warn("Notice loading support channels (using fallback):", err);
      }
      try {
        const cached = localStorage.getItem("system_settings_support_channels");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
      return DEFAULT_SUPPORT_CHANNELS;
    }
  });

  // Effective WhatsApp phone synchronized with Admin Master 'Rodapé' -> 'Telefone / Whats'
  const effectiveWhatsAppNumber = useMemo(() => {
    return footerConfig?.support_phone || footerConfig?.whatsapp_number || channelsConfig?.whatsapp_number || "(11) 99999-8888";
  }, [footerConfig?.support_phone, footerConfig?.whatsapp_number, channelsConfig?.whatsapp_number]);

  const cleanWhatsAppDigits = useMemo(() => {
    const raw = effectiveWhatsAppNumber || "";
    let digits = raw.replace(/\D/g, "");
    if (!digits) return "5511999998888";
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    return digits;
  }, [effectiveWhatsAppNumber]);

  const supportWhatsAppMessage = useMemo(() => {
    const userName = user?.full_name || user?.email || "Usuário";
    const userEmail = user?.email ? ` (${user.email})` : "";
    const companyName = companyData?.name || companyData?.trading_name || companyData?.trade_name || companyData?.corporate_name || "Empresa vinculada";
    const companyDoc = (companyData?.document_number || companyData?.cnpj) ? ` - CNPJ/Doc: ${companyData.document_number || companyData.cnpj}` : "";

    return `Olá! Gostaria de solicitar suporte técnico no PowerControl ERP.

*Usuário Solicitante:* ${userName}${userEmail}
*Empresa Ativa:* ${companyName}${companyDoc}

Preciso de auxílio técnico com a plataforma.`;
  }, [user, companyData]);

  const supportWhatsAppUrl = useMemo(() => {
    return `https://wa.me/${cleanWhatsAppDigits}?text=${encodeURIComponent(supportWhatsAppMessage)}`;
  }, [cleanWhatsAppDigits, supportWhatsAppMessage]);

  const [isEditChannelsOpen, setIsEditChannelsOpen] = useState(false);
  const [channelsForm, setChannelsForm] = useState<SupportChannelsConfig>(DEFAULT_SUPPORT_CHANNELS);

  const saveChannelsMutation = useMutation({
    mutationFn: async (updatedConfig: SupportChannelsConfig) => {
      const docRef = doc(db, "system_settings", "support_channels");
      await setDoc(docRef, {
        ...updatedConfig,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Also keep system_settings/footer support_phone synchronized if updated
      try {
        const footerRef = doc(db, "system_settings", "footer");
        await setDoc(footerRef, {
          support_phone: updatedConfig.whatsapp_number,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Could not sync footer support_phone:", e);
      }

      await api.log({
        action: 'UPDATE',
        entity: 'system_settings',
        entity_id: 'support_channels',
        description: `Atualizou os canais diretos de atendimento do sistema`,
        metadata: updatedConfig as any
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings", "support_channels"] });
      queryClient.invalidateQueries({ queryKey: ["system_settings", "footer"] });
      refetchChannels();
      setIsEditChannelsOpen(false);
      toast.success("Canais de atendimento salvos com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar canais de atendimento: ${err.message}`);
    }
  });

  // Filters & Search for FAQs & Tickets
  const [faqSearch, setFaqSearch] = useState("");
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>("all");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("ALL");
  const [ticketSearch, setTicketSearch] = useState<string>("");

  // Form State
  const [subject, setSubject] = useState("");
  const [moduleCategory, setModuleCategory] = useState("PDV / Vendas");
  const [priority, setPriority] = useState("MEDIUM");
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

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
      const activeCompanyId = api.getCompanyId() || user?.company_id;
      return api.post("support_tickets", {
        ...data,
        user_id: user?.id,
        user_name: user?.full_name,
        user_email: user?.email,
        company_id: activeCompanyId,
        status: "OPEN",
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: async (_, variables) => {
      const activeCompanyId = api.getCompanyId() || user?.company_id;
      toast.success("Chamado registrado com sucesso! Nossa equipe técnica retornará em breve.");
      
      // Send notification webhook
      await notificationApi.sendSupportWebhook({
        ...variables,
        user_name: user?.full_name,
        user_email: user?.email,
        company_id: activeCompanyId,
      });

      // Reset form
      setSubject("");
      setMessage("");
      setAttachmentUrl("");
      setPriority("MEDIUM");
      setModuleCategory("PDV / Vendas");
    },
    onError: (error: any) => {
      toast.error("Erro ao abrir chamado: " + error.message);
    }
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string, text: string }) => {
      const ticket = tickets.find(t => t.id === id);
      if(!ticket) throw new Error("Não foi possível localizar o chamado selecionado.");
      
      const newReply = {
        author: 'user',
        author_name: user?.full_name || 'Usuário',
        text: text,
        created_at: new Date().toISOString()
      };

      const updatedReplies = ticket.replies ? [...ticket.replies, newReply] : [newReply];

      return api.put("support_tickets", id, {
        replies: updatedReplies,
        status: "OPEN", // Return to OPEN so support agents are alerted
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      setReplyText("");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("Por favor, preencha o assunto e a mensagem do chamado.");
      return;
    }

    const payload: any = {
      subject,
      module: moduleCategory,
      priority,
      message,
    };

    if (attachmentUrl.trim()) {
      payload.attachment = attachmentUrl.trim();
    }

    if (includeDiagnostics) {
      payload.diagnostics = {
        app_version: "PowerControl ERP v2026.1",
        user_agent: navigator.userAgent,
        screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      };
    }

    await createTicketMutation.mutateAsync(payload);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border border-blue-200"><Clock size={12} /> Aberto</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border border-amber-200"><AlertCircle size={12} /> Em Atendimento</span>;
      case "CLOSED":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border border-emerald-200"><CheckCircle2 size={12} /> Concluído</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case "URGENT":
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-md text-[10px] font-extrabold uppercase border border-red-200">Urgente</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-md text-[10px] font-bold uppercase border border-orange-200">Alta</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold uppercase border border-blue-200">Média</span>;
      case "LOW":
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold uppercase">Baixa</span>;
      default:
        return null;
    }
  };

  const systemStatus = [
    { name: "API Fiscal (SEFAZ)", status: "OPERATIONAL", label: "Operacional" },
    { name: "Servidores Cloud & Banco", status: "OPERATIONAL", label: "Latência 14ms" },
    { name: "Emissão de Boletos & PIX", status: "OPERATIONAL", label: "Operacional" },
    { name: "WhatsApp Webhook Bot", status: "OPERATIONAL", label: "Operacional" },
  ];

  const filteredFaqs = useMemo(() => {
    return FAQS.filter(faq => {
      const matchesCat = activeFaqCategory === "all" || faq.cat === activeFaqCategory;
      const matchesSearch = !faqSearch.trim() || 
        (faq.q || '').toLowerCase().includes(faqSearch.toLowerCase()) || 
        (faq.a || '').toLowerCase().includes(faqSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [faqSearch, activeFaqCategory]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesStatus = ticketStatusFilter === "ALL" || t.status === ticketStatusFilter;
      const matchesSearch = !ticketSearch.trim() || 
        t.subject?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.message?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.id?.toLowerCase().includes(ticketSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tickets, ticketStatusFilter, ticketSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-200 text-xs font-bold">
              <LifeBuoy size={14} className="text-blue-400 animate-pulse" />
              <span>Central Unificada de Atendimento & Suporte</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Como podemos ajudar sua empresa hoje?
            </h1>
            <p className="text-blue-100/80 text-sm sm:text-base leading-relaxed">
              Consulte nossa base de conhecimento, acompanhe o status dos servidores ou abra um chamado direto com nossos especialistas do PowerControl.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              id="btn-support-header-whatsapp"
              href={supportWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <MessageSquare size={18} />
              <span>WhatsApp Suporte</span>
            </a>
            <Link
              to="/BaseConhecimento"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen size={18} />
              <span>Base de Conhecimento</span>
            </Link>
          </div>
        </div>
      </div>

      {/* System Operational Status Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Wifi size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <h3 className="text-sm font-extrabold text-gray-900">Status da Infraestrutura em Tempo Real</h3>
              </div>
              <p className="text-xs text-gray-500">
                Todos os microsserviços operando com 99,98% de disponibilidade.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 self-start lg:self-auto">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Sistemas 100% Operacionais</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {systemStatus.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">{item.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Form + Tickets vs Help Cards & FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): New Ticket Form & My Tickets */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Create Ticket Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Abrir Novo Chamado de Suporte</h2>
                  <p className="text-xs text-gray-500">Retorno garantido em até 2 horas em horário comercial.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                SLA VIP
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Módulo do Sistema</label>
                  <select 
                    value={moduleCategory}
                    onChange={(e) => setModuleCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="PDV / Vendas">PDV & Frente de Caixa</option>
                    <option value="Fiscal / NFe">Fiscal (NF-e, NFC-e, SAT)</option>
                    <option value="Financeiro">Financeiro & Contas</option>
                    <option value="Estoque & Compras">Estoque & Entradas XML</option>
                    <option value="Clientes & Cadastros">Clientes & Fornecedores</option>
                    <option value="Configurações & Usuários">Configurações & Acessos</option>
                    <option value="Outros">Outros Assuntos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Prioridade de Atendimento</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="LOW">Baixa (Dúvida pontual)</option>
                    <option value="MEDIUM">Média (Atendimento padrão)</option>
                    <option value="HIGH">Alta (Inconveniência no trabalho)</option>
                    <option value="URGENT">🔴 Urgente (Caixa / Vendas parados)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assunto Principal</label>
                <input 
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Erro ao emitir NFC-e no PDV ou Dúvida no Fechamento"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Descrição Detalhada do Problema</label>
                  <span className="text-[11px] text-gray-400">{message.length} caracteres</span>
                </div>
                <textarea 
                  required 
                  rows={4} 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o passo a passo para podermos reproduzir o problema, mencione códigos de erro ou o número da venda..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Paperclip size={14} className="text-gray-400" /> Captura de Tela ou Anexo (Opcional)
                  </span>
                  {attachmentUrl && (
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl("")}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 font-bold"
                    >
                      <X size={12} /> Remover Anexo
                    </button>
                  )}
                </label>

                {attachmentUrl && attachmentUrl.startsWith("data:image") ? (
                  <div className="relative p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                    <img 
                      src={attachmentUrl} 
                      alt="Preview Anexo" 
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">Imagem anexada para o chamado</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">Pronta para envio junto ao chamado</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-xs text-gray-600 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <Upload size={14} className="text-gray-500" />
                      <span>Selecionar Imagem / Print</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("A imagem deve ter no máximo 2MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setAttachmentUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <input 
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Ou cole a URL do anexo..."
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-600">
                    Anexar diagnósticos do navegador e versão do sistema automaticamente
                  </span>
                </label>
                <Info size={14} className="text-gray-400 shrink-0" />
              </div>

              <button 
                type="submit" 
                disabled={createTicketMutation.isPending}
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Registrando Chamado...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Enviar Chamado de Suporte</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* My Tickets History Section */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <History size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Meus Chamados & Atendimentos</h2>
                  <p className="text-xs text-gray-500">Acompanhe e responda seus chamados anteriores.</p>
                </div>
              </div>

              {/* Ticket Status Filters */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setTicketStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    ticketStatusFilter === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Todos ({tickets.length})
                </button>
                <button
                  onClick={() => setTicketStatusFilter("OPEN")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    ticketStatusFilter === "OPEN" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Abertos
                </button>
                <button
                  onClick={() => setTicketStatusFilter("CLOSED")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    ticketStatusFilter === "CLOSED" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Concluídos
                </button>
              </div>
            </div>

            {/* Search within tickets */}
            {tickets.length > 0 && (
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                <input 
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Buscar nos meus chamados..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                <LifeBuoy size={32} className="mx-auto text-gray-300" />
                <p className="text-sm font-bold text-gray-700">Nenhum chamado encontrado</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  {tickets.length === 0 ? "Você ainda não registrou nenhum chamado de suporte." : "Nenhum chamado corresponde aos filtros aplicados."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="p-4 bg-gray-50 hover:bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 transition-all cursor-pointer hover:shadow-md group space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                          #{ticket.id.substring(0, 8).toUpperCase()}
                        </span>
                        {ticket.module && (
                          <span className="px-2 py-0.5 bg-gray-200/60 text-gray-700 rounded-md text-[10px] font-bold">
                            {ticket.module}
                          </span>
                        )}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        {ticket.subject}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {ticket.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-[11px] text-gray-400">
                      <span>Aberto em {formatBR(ticket.created_at, "dd/MM/yyyy HH:mm")}</span>
                      <div className="flex items-center gap-1 font-bold text-blue-600 group-hover:underline">
                        <span>Ver Conversa</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (5 cols): Direct Contact Cards, Keyboard Shortcuts & FAQ */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Contact Channels Cards */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <PhoneCall size={18} className="text-blue-600" /> Canais Diretos de Atendimento
              </h3>
              {user?.role === "master" && (
                <button
                  id="btn-edit-support-channels"
                  onClick={() => {
                    setChannelsForm({
                      ...channelsConfig,
                      whatsapp_number: effectiveWhatsAppNumber,
                      whatsapp_link: supportWhatsAppUrl
                    });
                    setIsEditChannelsOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Editar Canais de Atendimento"
                >
                  <Edit size={13} />
                  <span>Editar</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{channelsConfig.email_title || "E-mail Oficial"}</p>
                    <p className="text-[11px] text-gray-500">{channelsConfig.email_address || "suporte@powercontrol.com.br"}</p>
                  </div>
                </div>
                {channelsConfig.email_sla && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                    {channelsConfig.email_sla}
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{channelsConfig.whatsapp_title || "WhatsApp Comercial"}</p>
                    <p className="text-[11px] text-gray-500">{effectiveWhatsAppNumber}{channelsConfig.whatsapp_hours ? ` • ${channelsConfig.whatsapp_hours}` : ""}</p>
                  </div>
                </div>
                <a 
                  id="btn-support-channel-whatsapp-conversar"
                  href={supportWhatsAppUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Conversar
                </a>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                    <PhoneCall size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{channelsConfig.phone_title || "Central 0800"}</p>
                    <p className="text-[11px] text-gray-500">{channelsConfig.phone_number}{channelsConfig.phone_hours ? ` (${channelsConfig.phone_hours})` : ""}</p>
                  </div>
                </div>
                {channelsConfig.phone_badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                    {channelsConfig.phone_badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Manuals & Keyboard Shortcuts Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-6 rounded-3xl text-white shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Keyboard size={20} className="text-blue-400" />
                <h3 className="font-extrabold text-sm">Atalhos Globais do Sistema</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Alt + H
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/80 rounded-xl flex items-center justify-between">
                <span className="text-slate-300">PDV / Caixa:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 text-white font-mono font-bold rounded text-[10px]">Ctrl+P</kbd>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl flex items-center justify-between">
                <span className="text-slate-300">Estoque:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 text-white font-mono font-bold rounded text-[10px]">Ctrl+E</kbd>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl flex items-center justify-between">
                <span className="text-slate-300">Busca Global:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 text-white font-mono font-bold rounded text-[10px]">Ctrl+K</kbd>
              </div>
              <div className="p-2 bg-slate-800/80 rounded-xl flex items-center justify-between">
                <span className="text-slate-300">Financeiro:</span>
                <kbd className="px-1.5 py-0.5 bg-slate-700 text-white font-mono font-bold rounded text-[10px]">Ctrl+Shift+F</kbd>
              </div>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" /> Perguntas Frequentes (FAQ)
                </h3>
              </div>

              {/* FAQ Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input 
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Pesquisar por assunto ou dúvida..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setActiveFaqCategory("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFaqCategory === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setActiveFaqCategory("pdv")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFaqCategory === "pdv" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  PDV & Caixa
                </button>
                <button
                  onClick={() => setActiveFaqCategory("fiscal")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFaqCategory === "fiscal" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Fiscal / NFe
                </button>
                <button
                  onClick={() => setActiveFaqCategory("financeiro")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFaqCategory === "financeiro" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Financeiro
                </button>
              </div>
            </div>

            {/* Accordion list */}
            <div className="space-y-3 pt-2">
              {filteredFaqs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Nenhum resultado para a busca efetuada.</p>
              ) : (
                filteredFaqs.map((faq) => (
                  <details key={faq.id} className="group border border-gray-100 rounded-2xl p-3.5 bg-gray-50/60 open:bg-blue-50/30 open:border-blue-200 transition-all cursor-pointer">
                    <summary className="font-extrabold text-xs text-gray-800 flex items-center justify-between list-none group-open:text-blue-700">
                      <span>{faq.q}</span>
                      <ChevronDown size={14} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                    </summary>
                    <div className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-200/50 pt-2">
                      {faq.a}
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Ticket Details Interactive Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">
                      {selectedTicket.subject}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono font-bold text-gray-400">
                        #{selectedTicket.id.substring(0, 10).toUpperCase()}
                      </span>
                      {selectedTicket.module && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[10px] font-bold">
                          {selectedTicket.module}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTicket.status)}
                  <button 
                    onClick={() => setSelectedTicketId(null)} 
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Conversation Log */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/30">
              
              {/* Initial ticket user message */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase ml-1">
                  <span>Você</span>
                  <span>•</span>
                  <span>{formatBR(selectedTicket.created_at, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm text-gray-800 max-w-[88%] border border-gray-200 shadow-xs whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                  {selectedTicket.attachment && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      {selectedTicket.attachment.startsWith("data:image") || selectedTicket.attachment.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                            <ImageIcon size={12} className="text-blue-600" /> Captura de Tela / Imagem:
                          </p>
                          <button 
                            type="button"
                            onClick={() => setLightboxImage(selectedTicket.attachment)}
                            className="block rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity max-w-sm cursor-zoom-in text-left group"
                          >
                            <img 
                              src={selectedTicket.attachment} 
                              alt="Anexo do Chamado" 
                              className="max-h-48 w-auto object-contain rounded-lg bg-gray-50 group-hover:scale-105 transition-transform"
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Paperclip size={14} className="text-blue-600" />
                          <a 
                            href={selectedTicket.attachment} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            Ver Anexo Enviado
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Legacy internal notes response from admin */}
              {selectedTicket.internal_notes && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase mr-1">
                    <span>Equipe PowerControl</span>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-sm text-xs sm:text-sm text-white max-w-[88%] shadow-md shadow-blue-500/10 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.internal_notes}
                  </div>
                </div>
              )}

              {/* Thread replies */}
              {selectedTicket.replies?.map((reply: any, index: number) => (
                <div key={index} className={`flex flex-col gap-1 ${reply.author === 'user' ? 'items-start' : 'items-end'}`}>
                   <div className={`flex items-center gap-2 text-[10px] font-bold uppercase ${reply.author === 'user' ? 'text-gray-400 ml-1' : 'text-blue-600 mr-1'}`}>
                     <span>{reply.author === 'user' ? 'Você' : 'Suporte Técnico'}</span>
                     <span>•</span>
                     <span>{formatBR(reply.created_at, "dd/MM/yyyy HH:mm")}</span>
                   </div>
                   <div className={`p-4 rounded-2xl text-xs sm:text-sm max-w-[88%] whitespace-pre-wrap leading-relaxed ${
                     reply.author === 'user' 
                      ? 'bg-white text-gray-800 rounded-tl-sm border border-gray-200 shadow-xs' 
                      : 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/10'
                   }`}>
                     {reply.text}
                   </div>
                </div>
              ))}

              {selectedTicket.status === 'CLOSED' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Este chamado foi resolvido e concluído.</span>
                </div>
              )}

            </div>

            {/* Modal Input for Replies */}
            {selectedTicket.status !== 'CLOSED' && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
                 <input 
                   type="text" 
                   value={replyText}
                   onChange={e => setReplyText(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && replyText.trim() && !replyMutation.isPending) {
                       replyMutation.mutate({ id: selectedTicket.id, text: replyText.trim() });
                     }
                   }}
                   placeholder="Escreva uma resposta para os analistas..."
                   className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm font-medium"
                 />
                 <button 
                  onClick={() => {
                    if (replyText.trim() && !replyMutation.isPending) {
                      replyMutation.mutate({ id: selectedTicket.id, text: replyText.trim() });
                    }
                  }}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold cursor-pointer"
                 >
                   <Send size={16} />
                   <span className="hidden sm:inline">Responder</span>
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Canais Diretos de Atendimento (Admin Master) */}
      {isEditChannelsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Editar Canais Diretos de Atendimento</h2>
                  <p className="text-xs text-gray-500">Altere os dados dos canais de contato e suporte exibidos aos usuários</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditChannelsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                saveChannelsMutation.mutate(channelsForm);
              }} 
              className="space-y-6 text-xs sm:text-sm"
            >
              {/* E-mail Oficial */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <Mail size={16} className="text-blue-600" />
                  <span>E-mail Oficial</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Título do Canal</label>
                    <input 
                      type="text" 
                      value={channelsForm.email_title}
                      onChange={e => setChannelsForm(prev => ({ ...prev, email_title: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Endereço de E-mail</label>
                    <input 
                      type="email" 
                      value={channelsForm.email_address}
                      onChange={e => setChannelsForm(prev => ({ ...prev, email_address: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">SLA / Tempo de Resposta (ex: SLA 2h)</label>
                    <input 
                      type="text" 
                      value={channelsForm.email_sla}
                      onChange={e => setChannelsForm(prev => ({ ...prev, email_sla: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Comercial */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <MessageSquare size={16} className="text-emerald-600" />
                  <span>WhatsApp Comercial</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Título do Canal</label>
                    <input 
                      type="text" 
                      value={channelsForm.whatsapp_title}
                      onChange={e => setChannelsForm(prev => ({ ...prev, whatsapp_title: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Número Formatado</label>
                    <input 
                      type="text" 
                      value={channelsForm.whatsapp_number}
                      onChange={e => setChannelsForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Horário / Dias de Funcionamento</label>
                    <input 
                      type="text" 
                      value={channelsForm.whatsapp_hours}
                      onChange={e => setChannelsForm(prev => ({ ...prev, whatsapp_hours: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Link Direto (wa.me/...)</label>
                    <input 
                      type="text" 
                      value={channelsForm.whatsapp_link}
                      onChange={e => setChannelsForm(prev => ({ ...prev, whatsapp_link: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Central 0800 / Telefone */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <PhoneCall size={16} className="text-purple-600" />
                  <span>Central 0800 / Telefone</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Título do Canal</label>
                    <input 
                      type="text" 
                      value={channelsForm.phone_title}
                      onChange={e => setChannelsForm(prev => ({ ...prev, phone_title: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Número de Telefone</label>
                    <input 
                      type="text" 
                      value={channelsForm.phone_number}
                      onChange={e => setChannelsForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Horário de Atendimento</label>
                    <input 
                      type="text" 
                      value={channelsForm.phone_hours}
                      onChange={e => setChannelsForm(prev => ({ ...prev, phone_hours: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Selo / Badge (ex: Gratuito)</label>
                    <input 
                      type="text" 
                      value={channelsForm.phone_badge}
                      onChange={e => setChannelsForm(prev => ({ ...prev, phone_badge: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditChannelsOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveChannelsMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {saveChannelsMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Image Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-4 text-white">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-400" />
                Visualização do Anexo
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage}
                  download="anexo-suporte.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/50 overflow-auto">
              <img 
                src={lightboxImage} 
                alt="Anexo Ampliado" 
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
