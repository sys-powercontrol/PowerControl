import React, { useState } from "react";
import { 
  X, 
  FileText, 
  Lock, 
  ShieldCheck, 
  Printer, 
  Scale, 
  Database, 
  AlertCircle, 
  Eye, 
  UserCheck, 
  KeyRound, 
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "privacy";
  onAccept?: () => void;
}

export default function LegalModal({
  isOpen,
  onClose,
  initialTab = "terms",
  onAccept
}: LegalModalProps) {
  const [selectedTab, setSelectedTab] = useState<"terms" | "privacy" | null>(null);
  const activeTab = selectedTab ?? initialTab;

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedTab(null);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${activeTab === "terms" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
              {activeTab === "terms" ? <FileText size={22} /> : <Lock size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  activeTab === "terms" 
                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {activeTab === "terms" ? "Documento Contratual" : "Conformidade LGPD"}
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">V2026.1</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mt-0.5">
                {activeTab === "terms" ? "Termos de Uso do Sistema" : "Política de Privacidade"}
              </h2>
            </div>
          </div>

          {/* Navigation Tabs & Close */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="bg-gray-200/80 p-1 rounded-2xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedTab("terms")}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "terms"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Termos de Uso
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("privacy")}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "privacy"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Privacidade
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
              title="Fechar janela"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-gray-700">
          {activeTab === "terms" ? (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-start gap-3">
                <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  Estes Termos de Uso regem o acesso e a utilização dos serviços de gestão empresarial fornecidos pela plataforma PowerControl ERP.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <Scale size={18} />
                  <h3>1. Aceitação dos Termos</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Ao se cadastrar ou efetuar login na plataforma PowerControl ERP, a pessoa física ou jurídica contratante concorda integralmente com os presentes Termos de Uso. O uso continuado da plataforma confirma o aceite irrevogável deste regulamento.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <ShieldCheck size={18} />
                  <h3>2. Concessão de Licença e Uso Permitido</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Concedemos uma licença limitada, não exclusiva e intransferível para gestão de vendas, estoque, finanças e emissão fiscal. É estritamente vedado copiar, descompilar, vender ou explorar comercialmente a estrutura do software a terceiros.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <Lock size={18} />
                  <h3>3. Responsabilidade pelas Credenciais</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  O usuário é integralmente responsável por manter a confidencialidade de seu e-mail, senha e certificados digitais. Operações realizadas através do seu login serão imputadas à empresa cadastrada.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <Database size={18} />
                  <h3>4. Propriedade Intelectual dos Dados</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Todos os registros de vendas, contatos de clientes e histórico financeiro pertencem à sua empresa. Mantemos rotinas diárias de backup seguro em nuvem com alta disponibilidade.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <AlertCircle size={18} />
                  <h3>5. Garantias e Suporte Técnico</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Garantimos meta de disponibilidade de 99,8%. Nosso suporte técnico está disponível via central de atendimento e e-mail corporativo em horário comercial.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  Esta política descreve como coletamos, usamos, armazenamos e protegemos seus dados em plena conformidade com a LGPD (Lei nº 13.709/2018).
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <Database size={18} />
                  <h3>1. Coleta de Dados Pessoais</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Coletamos informações cadastrais básicas (Nome, CPF/CNPJ, E-mail, Telefone e Endereço) e dados operacionais necessários para emissão de notas e gestão do estabelecimento.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <Eye size={18} />
                  <h3>2. Finalidade e Utilização</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Os dados são utilizados exclusivamente para autenticação, processamento de transações, cumprimento de obrigações tributárias (SEFAZ) e comunicações importantes do sistema.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <UserCheck size={18} />
                  <h3>3. Direitos do Titular sob a LGPD</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800">Acesso facilitado aos dados</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800">Correção de dados incompletos</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800">Portabilidade cadastral</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800">Revogação do consentimento</span>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <KeyRound size={18} />
                  <h3>4. Criptografia e Segurança</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Empregamos protocolos modernos de criptografia (TLS 1.3 / AES-256) em trânsito e em repouso, garantindo sigilo absoluto das informações armazenadas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            <Link
              to={activeTab === "terms" ? "/TermosDeUso" : "/PoliticaPrivacidade"}
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <ExternalLink size={15} />
              <span>Abrir em Página Completa</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  handleClose();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer w-full sm:w-auto"
              >
                Aceitar e Continuar
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors cursor-pointer w-full sm:w-auto"
            >
              Entendi / Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
