import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  FileText, 
  Building2, 
  ArrowRightLeft,
  Shield,
  CheckCircle2,
  Upload,
  Plus
} from "lucide-react";
import { OFXImporter } from "../components/Financial/OFXImporter";

export default function BankReconciliation() {
  const { user, hasPermission } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false);

  const canManage = hasPermission('finance.manage');
  const currentCompanyId = api.getCompanyId();

  const { data: accounts = [] } = useQuery({ 
    queryKey: ["bankAccounts", currentCompanyId], 
    queryFn: () => api.get("bankAccounts"),
    enabled: !!user && canManage
  });

  const selectedAccount = accounts.find((a: any) => a.id === selectedAccountId);

  

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para acessar a conciliação bancária.
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação Bancária</h1>
          <p className="text-gray-500">Importe extratos OFX e concilie seus lançamentos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              Selecionar Conta
            </h3>
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma conta bancária cadastrada.</p>
              ) : (
                accounts.map((acc: any) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      selectedAccountId === acc.id 
                        ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-100" 
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-bold text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.bank_name}</p>
                    <p className="text-sm font-bold text-blue-600 mt-2">{formatCurrency(acc.balance || 0)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedAccount && (
            <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase opacity-80 tracking-wider">Pronto para Conciliar</p>
                <h3 className="text-xl font-bold">{selectedAccount.name}</h3>
              </div>
              <button
                onClick={() => setIsOFXModalOpen(true)}
                className="w-full py-3 bg-white text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
              >
                <Upload size={20} />
                Importar Arquivo OFX
              </button>
            </div>
          )}
        </div>

        {/* Instructions / Empty State */}
        <div className="lg:col-span-2">
          {!selectedAccount ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                <ArrowRightLeft size={40} />
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Escolha uma conta bancária</h3>
                <p className="text-gray-500">
                  Selecione uma conta ao lado para iniciar o processo de importação e conciliação de extratos.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Como funciona a conciliação?</h4>
                  <p className="text-sm text-gray-600">
                    O sistema lê o arquivo OFX e tenta encontrar lançamentos de Contas a Pagar ou Receber que coincidam em valor e data.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 size={18} />
                    <h5 className="font-bold">Sugestão Automática</h5>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Lançamentos com o mesmo valor e data próxima (até 3 dias) são sugeridos automaticamente para baixa.
                  </p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Plus size={18} />
                    <h5 className="font-bold">Novos Lançamentos</h5>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Transações não encontradas no sistema podem ser criadas como novos lançamentos financeiros diretamente.
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 mb-4">Últimas Importações</h4>
                <div className="text-center py-12 text-gray-400 italic text-sm">
                  Nenhum histórico de importação disponível para esta conta.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isOFXModalOpen && selectedAccount && (
        <OFXImporter 
          onClose={() => setIsOFXModalOpen(false)}
          bankAccountId={selectedAccount.id}
          bankAccountName={selectedAccount.name}
        />
      )}
    </div>
  );
}
