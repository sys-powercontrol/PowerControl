import React from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  ShieldCheck, 
  Mail, 
  Phone, 
  Clock, 
  Globe, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Sparkles,
  MessageCircle,
  Instagram,
  Linkedin,
  Keyboard,
  HelpCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useGlobalKeyboardShortcuts } from "../hooks/useGlobalKeyboardShortcuts";
import { FooterConfig, FooterLink, DEFAULT_FOOTER_CONFIG } from "../types/footer";

export type { FooterConfig, FooterLink };
export { DEFAULT_FOOTER_CONFIG };

export default function Footer() {
  const { openModal } = useGlobalKeyboardShortcuts();

  const { data: footerConfig = DEFAULT_FOOTER_CONFIG } = useQuery({
    queryKey: ["system_settings", "footer"],
    queryFn: async () => {
      try {
        const docRef = doc(db, "system_settings", "footer");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...DEFAULT_FOOTER_CONFIG, ...docSnap.data() } as FooterConfig;
        }
      } catch (err) {
        console.error("Erro ao carregar configurações do rodapé:", err);
      }
      return DEFAULT_FOOTER_CONFIG;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const getStatusColorBadge = (color: string) => {
    switch (color) {
      case "green":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          icon: <CheckCircle2 size={13} className="text-emerald-600" />
        };
      case "yellow":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          icon: <AlertTriangle size={13} className="text-amber-600" />
        };
      case "red":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          icon: <AlertCircle size={13} className="text-rose-600" />
        };
      case "blue":
      default:
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          dot: "bg-sky-500",
          icon: <Info size={13} className="text-sky-600" />
        };
    }
  };

  const statusStyle = getStatusColorBadge(footerConfig.status_color || "green");

  return (
    <footer className="mt-12 pt-8 pb-12 border-t border-gray-200/80 bg-slate-900 text-slate-300 rounded-2xl shadow-inner px-6 md:px-10 space-y-8">
      {/* Announcement Banner if Enabled */}
      {footerConfig.announcement_enabled && footerConfig.announcement_text && (
        <div className="p-3.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span className="flex-1">{footerConfig.announcement_text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand & System Overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-sm shadow-blue-500/30">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight leading-tight">
                {footerConfig.system_name || "PowerControl ERP"}
              </h3>
              {footerConfig.show_version && (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded-md inline-block">
                  {footerConfig.system_version || "v2.5.0"}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {footerConfig.tagline || "Plataforma integrada de gestão empresarial e controle financeiro."}
          </p>

          {/* Status Indicator */}
          {footerConfig.show_status && footerConfig.status_badge_enabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-slate-800/80 border-slate-700/80 text-slate-200">
              <span className={`w-2 h-2 rounded-full animate-pulse ${statusStyle.dot}`} />
              {statusStyle.icon}
              <span>{footerConfig.status_text || "Sistemas Operacionais"}</span>
            </div>
          )}
        </div>

        {/* Quick Links */}
        {footerConfig.show_links && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={14} className="text-blue-400" />
              Links & Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              {(footerConfig.links && footerConfig.links.length > 0 ? footerConfig.links : DEFAULT_FOOTER_CONFIG.links).map((link) => {
                if (link.url === "#atalhos") {
                  return (
                    <li key={link.id || link.label}>
                      <button 
                        onClick={openModal}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                      >
                        <Keyboard size={13} className="text-blue-400" />
                        <span>{link.label}</span>
                      </button>
                    </li>
                  );
                }

                if (link.isExternal || link.url.startsWith("http")) {
                  return (
                    <li key={link.id || link.label}>
                      <a 
                        href={link.url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                      >
                        <span>{link.label}</span>
                        <ExternalLink size={12} className="text-slate-500" />
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={link.id || link.label}>
                    <Link 
                      to={link.url}
                      className="text-slate-400 hover:text-white transition-colors block"
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Support & Contacts */}
        {footerConfig.show_contacts && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={14} className="text-blue-400" />
              Atendimento & Suporte
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {footerConfig.support_email && (
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-500 shrink-0" />
                  <a href={`mailto:${footerConfig.support_email}`} className="hover:text-white transition-colors truncate">
                    {footerConfig.support_email}
                  </a>
                </li>
              )}
              {footerConfig.support_phone && (
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{footerConfig.support_phone}</span>
                </li>
              )}
              {footerConfig.support_hours && (
                <li className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-500 shrink-0" />
                  <span>{footerConfig.support_hours}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* External & Social Media */}
        {footerConfig.show_social && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-blue-400" />
              Canais Oficiais
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {footerConfig.whatsapp_number && (
                <a
                  href={`https://wa.me/${footerConfig.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/20 flex items-center gap-2 text-xs font-semibold"
                  title="WhatsApp"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp</span>
                </a>
              )}
              {footerConfig.website_url && (
                <a
                  href={footerConfig.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all border border-blue-500/20 flex items-center gap-2 text-xs font-semibold"
                  title="Website Oficial"
                >
                  <Globe size={15} />
                  <span>Website</span>
                </a>
              )}
              {footerConfig.instagram_handle && (
                <a
                  href={`https://instagram.com/${footerConfig.instagram_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-xl transition-all border border-pink-500/20"
                  title="Instagram"
                >
                  <Instagram size={15} />
                </a>
              )}
              {footerConfig.linkedin_url && (
                <a
                  href={footerConfig.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl transition-all border border-sky-500/20"
                  title="LinkedIn"
                >
                  <Linkedin size={15} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar / Copyright */}
      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>{footerConfig.copyright_text || DEFAULT_FOOTER_CONFIG.copyright_text}</p>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/BaseConhecimento" className="hover:text-slate-300 transition-colors">
            Base de Conhecimento
          </Link>
          <span>•</span>
          <Link to="/Suporte" className="hover:text-slate-300 transition-colors">
            Suporte
          </Link>
          <span>•</span>
          <Link to="/PainelMaster" className="hover:text-blue-400 transition-colors">
            Painel Master
          </Link>
        </div>
      </div>
    </footer>
  );
}
