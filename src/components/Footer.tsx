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
import { useAuth } from "../lib/auth";
import { FooterConfig, FooterLink, DEFAULT_FOOTER_CONFIG } from "../types/footer";

export type { FooterConfig, FooterLink };
export { DEFAULT_FOOTER_CONFIG };

export default function Footer() {
  const { openModal } = useGlobalKeyboardShortcuts();
  const { user } = useAuth();

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
    <footer className="mt-12 pt-8 pb-12 border border-gray-200 bg-white text-gray-600 rounded-2xl shadow-xs px-6 md:px-10 space-y-8">
      {/* Announcement Banner if Enabled */}
      {footerConfig.announcement_enabled && footerConfig.announcement_text && (
        <div className="p-3.5 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-medium flex items-center gap-2.5">
          <Sparkles size={16} className="text-amber-600 shrink-0" />
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
              <h3 className="font-extrabold text-gray-900 text-base tracking-tight leading-tight">
                {footerConfig.system_name || "PowerControl ERP"}
              </h3>
              {footerConfig.show_version && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md inline-block">
                  {footerConfig.system_version || "v2.5.0"}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            {footerConfig.tagline || "Plataforma integrada de gestão empresarial e controle financeiro."}
          </p>

          {/* Status Indicator */}
          {footerConfig.show_status && footerConfig.status_badge_enabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-gray-50 border-gray-200 text-gray-700">
              <span className={`w-2 h-2 rounded-full animate-pulse ${statusStyle.dot}`} />
              {statusStyle.icon}
              <span>{footerConfig.status_text || "Sistemas Operacionais"}</span>
            </div>
          )}
        </div>

        {/* Quick Links */}
        {footerConfig.show_links && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={14} className="text-blue-600" />
              Links & Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              {(footerConfig.links && footerConfig.links.length > 0 ? footerConfig.links : DEFAULT_FOOTER_CONFIG.links).map((link) => {
                if (link.url === "#atalhos") {
                  return (
                    <li key={link.id || link.label}>
                      <button 
                        onClick={openModal}
                        className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left font-medium"
                      >
                        <Keyboard size={13} className="text-blue-600" />
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
                        className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 font-medium"
                      >
                        <span>{link.label}</span>
                        <ExternalLink size={12} className="text-gray-400" />
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={link.id || link.label}>
                    <Link 
                      to={link.url}
                      className="text-gray-600 hover:text-blue-600 transition-colors block font-medium"
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
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={14} className="text-blue-600" />
              Atendimento & Suporte
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              {footerConfig.support_email && (
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${footerConfig.support_email}`} className="hover:text-blue-600 transition-colors truncate">
                    {footerConfig.support_email}
                  </a>
                </li>
              )}
              {footerConfig.support_phone && (
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{footerConfig.support_phone}</span>
                </li>
              )}
              {footerConfig.support_hours && (
                <li className="flex items-center gap-2">
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span>{footerConfig.support_hours}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* External & Social Media */}
        {footerConfig.show_social && (
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-blue-600" />
              Canais Oficiais
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {footerConfig.whatsapp_number && (
                <a
                  href={`https://wa.me/${footerConfig.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all border border-emerald-200 flex items-center gap-2 text-xs font-semibold"
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
                  className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all border border-blue-200 flex items-center gap-2 text-xs font-semibold"
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
                  className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl transition-all border border-pink-200"
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
                  className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition-all border border-sky-200"
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
      <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
        <p>{footerConfig.copyright_text || DEFAULT_FOOTER_CONFIG.copyright_text}</p>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/BaseConhecimento" className="hover:text-blue-600 transition-colors">
            Base de Conhecimento
          </Link>
          <span>•</span>
          <Link to="/Suporte" className="hover:text-blue-600 transition-colors">
            Suporte
          </Link>
          {user?.role === "master" && (
            <>
              <span>•</span>
              <Link to="/PainelAdminMaster" className="hover:text-blue-600 transition-colors">
                Painel Master
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
