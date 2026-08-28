import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, FileText, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import LegalModal from "./LegalModal";
import { useAuth } from "../lib/auth";

interface TermsAcceptanceCardProps {
  className?: string;
  onAccept?: () => void;
  variant?: "card" | "banner" | "inline";
}

export default function TermsAcceptanceCard({ 
  className = "", 
  onAccept
}: TermsAcceptanceCardProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"terms" | "privacy">("terms");

  const [manualAccepted, setManualAccepted] = useState<boolean>(false);
  const [manualAcceptedAt, setManualAcceptedAt] = useState<string | null>(null);

  const isAccepted = manualAccepted || 
    localStorage.getItem("powercontrol_terms_accepted") === "true" || 
    Boolean(user?.terms_accepted) || 
    Boolean(user);

  const getFormattedDate = () => {
    if (manualAcceptedAt) return manualAcceptedAt;

    const rawDate = localStorage.getItem("powercontrol_terms_accepted_at") || 
      (user as any)?.terms_accepted_at || 
      (user as any)?.created_at;

    if (rawDate) {
      try {
        const dateObj = typeof rawDate === "object" && rawDate !== null && "seconds" in rawDate 
          ? new Date(rawDate.seconds * 1000) 
          : new Date(rawDate);
        
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      } catch (e) {
        console.warn("Could not parse terms date:", e);
      }
    }
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const acceptedAt = getFormattedDate();

  const [isChecked, setIsChecked] = useState<boolean>(() => {
    return localStorage.getItem("powercontrol_terms_accepted") === "true" || !!user;
  });

  const handleConfirmAcceptance = () => {
    if (!isChecked && !isAccepted) {
      toast.error("Por favor, marque a caixa de seleção confirmando a leitura dos termos.");
      return;
    }

    const now = new Date().toISOString();
    localStorage.setItem("powercontrol_terms_accepted", "true");
    localStorage.setItem("powercontrol_terms_accepted_at", now);
    setManualAccepted(true);
    setManualAcceptedAt(new Date(now).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }));

    toast.success("Termos de Uso e Política de Privacidade aceitos com sucesso!");
    if (onAccept) onAccept();
  };

  if (isAccepted) {
    return (
      <div className={`bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 rounded-3xl border border-emerald-200 shadow-xs space-y-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0 shadow-sm shadow-emerald-500/30">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                  Aceite Confirmado
                </span>
                {acceptedAt && (
                  <span className="text-xs text-emerald-700 font-medium">
                    Em {acceptedAt}
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-emerald-950 mt-1">
                Você aceitou os Termos de Uso e a Política de Privacidade
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Seu consentimento está registrado para conformidade com a LGPD e termos contratuais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setModalTab("terms");
                setModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} />
              <span>Termos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTab("privacy");
                setModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Lock size={14} />
              <span>Privacidade</span>
            </button>
          </div>
        </div>

        <LegalModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialTab={modalTab}
        />
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-md space-y-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">
              Aceite dos Termos de Uso e Política de Privacidade
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Para utilizar todos os recursos da plataforma, confirmação dos termos legais é necessária.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
          Pendente de Aceite
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setModalTab("terms");
            setModalOpen(true);
          }}
          className="p-4 bg-gray-50 hover:bg-blue-50/60 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all flex items-center justify-between group cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Termos de Uso</p>
              <p className="text-[11px] text-gray-500">Regras de uso e licença do ERP</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>

        <button
          type="button"
          onClick={() => {
            setModalTab("privacy");
            setModalOpen(true);
          }}
          className="p-4 bg-gray-50 hover:bg-emerald-50/60 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all flex items-center justify-between group cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Política de Privacidade</p>
              <p className="text-[11px] text-gray-500">Proteção de Dados & LGPD</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </button>
      </div>

      <div className="space-y-4 pt-2">
        <label className="flex items-start gap-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs text-gray-600 group-hover:text-gray-900 leading-relaxed font-medium">
            Li e concordo com os{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setModalTab("terms");
                setModalOpen(true);
              }}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Termos de Uso
            </button>{" "}
            e a{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setModalTab("privacy");
                setModalOpen(true);
              }}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Política de Privacidade
            </button>{" "}
            da plataforma PowerControl ERP.
          </span>
        </label>

        <button
          onClick={handleConfirmAcceptance}
          className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck size={18} />
          <span>Aceitar Termos de Uso e Política de Privacidade</span>
        </button>
      </div>

      <LegalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
        onAccept={handleConfirmAcceptance}
      />
    </div>
  );
}
