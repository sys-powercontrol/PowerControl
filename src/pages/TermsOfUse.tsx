import React from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  ShieldCheck, 
  ArrowLeft, 
  Printer, 
  Lock, 
  Scale, 
  Database, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

import TermsAcceptanceCard from "../components/TermsAcceptanceCard";

export default function TermsOfUse() {
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
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                Documento Legal
              </span>
              <span className="text-xs text-gray-400">Última atualização: 05 de Agosto de 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Termos de Uso do Sistema
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Condições gerais para utilização da plataforma PowerControl ERP e serviços integrados.
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
            to="/PoliticaPrivacidade"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Lock size={16} />
            <span>Política de Privacidade</span>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Terms Document */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Aceitação */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Scale size={22} />
              <h2 className="text-lg font-bold text-gray-900">1. Aceitação dos Termos</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ao acessar, cadastrar-se ou utilizar a plataforma <strong>PowerControl ERP</strong>, a pessoa física ou jurídica contratante concorda integralmente com os presentes Termos de Uso. O uso continuado da plataforma constitui aceitação expressa e incondicional de todas as cláusulas e atualizações deste documento.
            </p>
          </div>

          {/* Card 2: Licença de Uso */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <ShieldCheck size={22} />
              <h2 className="text-lg font-bold text-gray-900">2. Concessão da Licença de Uso</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              A contratante recebe uma licença limitada, não exclusiva, intransferível e revogável para acesso aos serviços de gestão empresarial em nuvem. É expressamente vedado:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 pl-2">
              <li>Engenharia reversa, descompilação ou cópia de código-fonte da aplicação.</li>
              <li>Revenda, sublicenciamento ou disponibilização a terceiros não autorizados.</li>
              <li>Uso da plataforma para fins ilícitos, fraudes fiscais ou atividades não regulamentadas.</li>
            </ul>
          </div>

          {/* Card 3: Responsabilidade por Credenciais */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Lock size={22} />
              <h2 className="text-lg font-bold text-gray-900">3. Segurança e Credenciais de Acesso</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              O usuário é único e exclusivo responsável pela confidencialidade de suas senhas, tokens de API e certificados digitais. Qualquer operação realizada com suas credenciais de acesso será imputada à empresa cadastrada. Recomendamos o uso de autenticação forte e controle rigoroso de permissões por perfil.
            </p>
          </div>

          {/* Card 4: Propriedade dos Dados */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Database size={22} />
              <h2 className="text-lg font-bold text-gray-900">4. Propriedade dos Dados e Armazenamento</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Todos os dados de vendas, clientes, catálogo de produtos, relatórios e históricos financeiros inseridos na plataforma pertencem exclusivamente à empresa contratante. Garantimos a disponibilidade de cópias de segurança (backups) e mecanismos de exportação de dados a qualquer momento.
            </p>
          </div>

          {/* Card 5: Nível de Serviço (SLA) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <AlertCircle size={22} />
              <h2 className="text-lg font-bold text-gray-900">5. Nível de Serviço e Manutenções</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Envidamos os melhores esforços para manter a plataforma disponível 99,8% do tempo. Manutenções programadas serão comunicadas previamente através de avisos no rodapé e painel de notificações do sistema.
            </p>
          </div>

          {/* Accept Terms Card */}
          <TermsAcceptanceCard />
        </div>

        {/* Sidebar Info & Legal Links */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-500/20 space-y-4">
            <FileText size={32} className="text-blue-200" />
            <h3 className="text-xl font-extrabold tracking-tight">Dúvidas Jurídicas?</h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Nossa equipe técnica e jurídica está à disposição para esclarecer qualquer ponto contratual ou de conformidade.
            </p>
            <div className="pt-2 border-t border-blue-500/40 text-xs space-y-2 text-blue-100">
              <p><strong>E-mail Legal:</strong> juridico@powercontrol.com.br</p>
              <p><strong>DPO / LGPD:</strong> dpo@powercontrol.com.br</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle size={18} className="text-blue-600" />
              Navegação Relacionada
            </h3>
            <div className="space-y-2">
              <Link
                to="/PoliticaPrivacidade"
                className="w-full p-3.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-2xl font-bold text-xs flex items-center justify-between text-gray-700 transition-colors"
              >
                <span>Política de Privacidade (LGPD)</span>
                <Lock size={14} />
              </Link>
              <Link
                to="/Suporte"
                className="w-full p-3.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-2xl font-bold text-xs flex items-center justify-between text-gray-700 transition-colors"
              >
                <span>Central de Suporte</span>
                <HelpCircle size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
