import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { FooterConfig, DEFAULT_FOOTER_CONFIG } from "../types/footer";
import { 
  X, 
  Sparkles, 
  Crown, 
  MessageCircle, 
  CheckCircle2, 
  Image as ImageIcon, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  title = "Upgrade de Plano Necessário",
  subtitle = "Inclusão de Fotos de Produtos e Serviços"
}: UpgradePlanModalProps) {
  const { user } = useAuth();

  // Bloqueio de scroll do body e listener para fechar com tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Buscar dados da empresa para enriquecer a mensagem
  const { data: companyData } = useQuery({
    queryKey: ["company", user?.company_id],
    queryFn: () => (user?.company_id ? api.get("companies", user.company_id) : null),
    enabled: !!user?.company_id
  });

  // Buscar configurações de rodapé (onde fica o WhatsApp oficial cadastrado no Admin Master)
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
        console.warn("Notice loading footer settings:", err);
      }
      try {
        const cached = localStorage.getItem("system_settings_footer");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
      return DEFAULT_FOOTER_CONFIG;
    },
    staleTime: 1000 * 60 * 5 // 5 minutos de cache
  });

  const handleRequestUpgrade = () => {
    const rawPhone = footerConfig?.whatsapp_number || DEFAULT_FOOTER_CONFIG.whatsapp_number || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");

    const companyName = companyData?.name || "Minha Empresa";
    const userRef = user?.full_name ? ` (Solicitante: ${user.full_name})` : "";
    const message = `Olá! Gostaria de solicitar um upgrade no meu plano do sistema para a empresa ${companyName}${userRef}, a fim de liberar a funcionalidade de inclusão de imagens e fotos em produtos e serviços. Como podemos proceder com a atualização?`;

    if (!cleanPhone) {
      toast.error("Número de WhatsApp de atendimento não configurado no sistema. Por favor, contate o administrador.");
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    toast.success("Redirecionando para o atendimento via WhatsApp...");
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="upgrade-plan-modal-overlay"
          id="upgrade-plan-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
          style={{ isolation: "isolate" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="upgrade-plan-modal-content"
            id="upgrade-plan-modal-window"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Gradiente e Destaque Visual */}
            <div className="relative p-6 sm:p-7 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white overflow-hidden">
              {/* Efeitos decorativos de fundo */}
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <Crown size={26} className="text-amber-100 drop-shadow-xs" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider mb-1 backdrop-blur-xs">
                      <Sparkles size={12} className="text-amber-200" />
                      Recurso Premium
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-close-upgrade-modal"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-amber-50/95 font-medium mt-3 relative z-10">
                {subtitle}
              </p>
            </div>

            {/* Corpo da Janela Flutuante */}
            <div className="p-6 sm:p-7 space-y-6">
              {/* Alerta / Mensagem Explicativa */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <Lock size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Recurso desabilitado no plano atual
                  </h4>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    A inclusão e visualização de fotos de produtos e serviços não está disponível nas configurações atuais. Para liberar fotos em alta resolução, vitrine ilustrada e catálogo visual, faça o upgrade do seu plano.
                  </p>
                </div>
              </div>

              {/* Benefícios do Upgrade */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-600" />
                  Vantagens de Habilitar Fotos & Imagens
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">Catálogo & Vitrine com Fotos</p>
                      <p className="text-[11px] text-slate-500">Exibição atrativa de produtos e serviços para seus clientes.</p>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">Agilidade no PDV e Checkout</p>
                      <p className="text-[11px] text-slate-500">Identificação visual imediata dos itens na hora da venda.</p>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">Orçamentos e Pedidos Profissionais</p>
                      <p className="text-[11px] text-slate-500">Gere propostas comerciais mais convincentes e completas.</p>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  id="btn-request-plan-upgrade"
                  onClick={handleRequestUpgrade}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <MessageCircle size={18} className="transition-transform group-hover:scale-110" />
                  <span>Solicitar Upgrade Agora</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  id="btn-cancel-upgrade-modal"
                  onClick={onClose}
                  className="py-3.5 px-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
