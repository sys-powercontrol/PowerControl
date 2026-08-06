import React from "react";
import { Link } from "react-router-dom";
import { 
  Lock, 
  ShieldCheck, 
  ArrowLeft, 
  Printer, 
  FileText, 
  Eye, 
  Database, 
  UserCheck, 
  KeyRound,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

import TermsAcceptanceCard from "../components/TermsAcceptanceCard";

export default function PrivacyPolicy() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            to="/Configuracoes" 
            className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl transition-colors cursor-pointer"
            title="Voltar para Configurações"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <ShieldCheck size={13} />
                Conformidade LGPD
              </span>
              <span className="text-xs text-gray-400">Última atualização: 05 de Agosto de 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Política de Privacidade e Proteção de Dados
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Como tratamos, protegemos e armazenamos as suas informações pessoais e operacionais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
          <Link
            to="/TermosDeUso"
            className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <FileText size={16} />
            <span>Termos de Uso</span>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Document Body */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Coleta de Dados */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Database size={22} />
              <h2 className="text-lg font-bold text-gray-900">1. Coleta de Dados Pessoais e Comerciais</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Coletamos apenas as informações estritamente necessárias para a prestação dos serviços de gestão empresarial do <strong>PowerControl ERP</strong>, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 pl-2">
              <li>Dados cadastrais de usuários (Nome, E-mail, Telefone, Cargo e CPF/CNPJ).</li>
              <li>Informações da empresa (Razão Social, Nome Fantasia, CNPJ, Inscrição Estadual e Endereço).</li>
              <li>Dados de transações fiscais, vendas, movimentações financeiras e estoque.</li>
              <li>Logs de auditoria e conexões para garantia da segurança do sistema.</li>
            </ul>
          </div>

          {/* Card 2: Finalidade e Uso */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Eye size={22} />
              <h2 className="text-lg font-bold text-gray-900">2. Finalidade do Tratamento dos Dados</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Os dados coletados são tratados com as seguintes finalidades legítimas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 pl-2">
              <li>Emissão de documentos fiscais e integração com órgãos governamentais (SEFAZ).</li>
              <li>Processamento de vendas, controle financeiro e cálculo de comissões.</li>
              <li>Envio de notificações operacionais (alertas de estoque, suporte e cobranças).</li>
              <li>Cumprimento de obrigações legais e regulatórias vigentes.</li>
            </ul>
          </div>

          {/* Card 3: Direitos do Titular (LGPD) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <UserCheck size={22} />
              <h2 className="text-lg font-bold text-gray-900">3. Direitos do Titular sob a LGPD (Lei nº 13.709/2018)</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Conforme a Lei Geral de Proteção de Dados, os titulares de dados pessoais têm direito a:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-gray-800">Confirmação da existência de tratamento</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-gray-800">Acesso facilitado aos dados</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-gray-800">Correção de dados incompletos ou inexatos</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-gray-800">Portabilidade dos dados cadastrais</span>
              </div>
            </div>
          </div>

          {/* Card 4: Criptografia e Armazenamento */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <KeyRound size={22} />
              <h2 className="text-lg font-bold text-gray-900">4. Segurança e Criptografia</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Utilizamos altos padrões de segurança em nuvem com criptografia de ponta a ponta (TLS 1.3 / AES-256), controle de acesso restrito e monitoramento contínuo contra acessos não autorizados.
            </p>
          </div>

          {/* Terms Acceptance Card */}
          <TermsAcceptanceCard />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-emerald-600/20 space-y-4">
            <Lock size={32} className="text-emerald-200" />
            <h3 className="text-xl font-extrabold tracking-tight">Encarregado de Dados (DPO)</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Para exercer seus direitos de privacidade ou esclarecer dúvidas sobre tratamento de dados:
            </p>
            <div className="pt-2 border-t border-emerald-600/50 text-xs space-y-2 text-emerald-100">
              <p><strong>DPO Responsável:</strong> Privacidade & Segurança</p>
              <p><strong>E-mail:</strong> dpo@powercontrol.com.br</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle size={18} className="text-emerald-600" />
              Navegação Relacionada
            </h3>
            <div className="space-y-2">
              <Link
                to="/TermosDeUso"
                className="w-full p-3.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-bold text-xs flex items-center justify-between text-gray-700 transition-colors"
              >
                <span>Termos de Uso do Sistema</span>
                <FileText size={14} />
              </Link>
              <Link
                to="/Suporte"
                className="w-full p-3.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-bold text-xs flex items-center justify-between text-gray-700 transition-colors"
              >
                <span>Central de Atendimento</span>
                <HelpCircle size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
