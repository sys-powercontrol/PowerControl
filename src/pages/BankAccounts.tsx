import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Wallet,
  Shield,
  FileText,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { OFXImporter } from "../components/Financial/OFXImporter";

export default function BankAccounts() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission('finance.manage');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedAccountForOFX, setSelectedAccountForOFX] = useState<any>(null);
  const [showGlobalBalance, setShowGlobalBalance] = useState(false);
  const [showAccountBalance, setShowAccountBalance] = useState<Record<string, boolean>>({});

  const toggleAccountBalance = (id: string) => {
    setShowAccountBalance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentCompanyId = api.getCompanyId();

  const { data: accountsData = [], isLoading } = useQuery({ 
    queryKey: ["bankAccounts", currentCompanyId], 
    queryFn: () => api.get("bankAccounts"),
    enabled: !!user
  });

  const accounts = React.useMemo(() => {
    if (!currentCompanyId) return accountsData;
    return accountsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [accountsData, currentCompanyId]);

  const accountMutation = useMutation({
    mutationFn: (data: any) => editingAccount 
      ? api.put("bankAccounts", editingAccount.id, data)
      : api.post("bankAccounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success(editingAccount ? "Conta bancária atualizada!" : "Conta bancária cadastrada!");
      setIsModalOpen(false);
      setEditingAccount(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const accountData = {
      ...data,
      company_id: user?.company_id,
      balance: parseFloat(data.balance as string) || 0,
      is_active: true
    };

    accountMutation.mutate(accountData);
  };

  const openEditModal = (account: any) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para gerenciar as contas bancárias. 
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
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500">Gerencie suas contas e saldos.</p>
        </div>
        <button 
          onClick={() => {
            setEditingAccount(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          Nova Conta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold text-gray-500 uppercase">Saldo Total Consolidado</p>
              <button 
                onClick={() => setShowGlobalBalance(!showGlobalBalance)} 
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                title={showGlobalBalance ? "Ocultar Saldo" : "Exibir Saldo"}
              >
                {showGlobalBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {showGlobalBalance 
                ? formatCurrency(accounts.reduce((acc: number, a: any) => acc + (a.balance || 0), 0))
                : "R$ ••••••"}
            </p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Wallet size={32} />
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Contas Ativas</p>
            <p className="text-3xl font-bold text-gray-900">{accounts.length}</p>
          </div>
          <div className="p-4 bg-gray-50 text-gray-600 rounded-2xl">
            <Building2 size={32} />
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando contas...</div>
        ) : accounts.map((acc: any) => (
          <div key={acc.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Building2 size={24} />
              </div>
              <div className="flex items-start gap-2">
                <button 
                  onClick={() => {
                    setSelectedAccountForOFX(acc);
                    setIsOFXModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Importar OFX"
                >
                  <FileText size={18} />
                </button>
                <button 
                  onClick={() => openEditModal(acc)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{acc.name}</h3>
                <p className="text-xs text-gray-500">{acc.bank_name || "Banco não inf."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Agência</p>
                  <p className="text-sm font-bold text-gray-700">{acc.agency || "---"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Conta</p>
                  <p className="text-sm font-bold text-gray-700">{acc.account_number || "---"}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Saldo em Conta</p>
                  <button 
                    onClick={() => toggleAccountBalance(acc.id)} 
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showAccountBalance[acc.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {showAccountBalance[acc.id] 
                    ? formatCurrency(acc.balance || 0)
                    : "R$ ••••••"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova/Editar Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome da Conta *</label>
                <input name="name" defaultValue={editingAccount?.name} required placeholder="Ex: Conta Corrente Principal" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Banco</label>
                <input name="bank_name" defaultValue={editingAccount?.bank_name} placeholder="Ex: Itaú, Bradesco..." className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Agência</label>
                  <input name="agency" defaultValue={editingAccount?.agency} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Número da Conta</label>
                  <input name="account_number" defaultValue={editingAccount?.account_number} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo de Conta</label>
                <select name="account_type" defaultValue={editingAccount?.account_type || "Corrente"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Poupança">Conta Poupança</option>
                  <option value="Investimento">Conta Investimento</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Saldo Inicial (R$)</label>
                <input name="balance" defaultValue={editingAccount?.balance} type="number" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={accountMutation.isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  {accountMutation.isPending ? "Salvando..." : (editingAccount ? "Salvar" : "Cadastrar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Importar OFX */}
      {isOFXModalOpen && selectedAccountForOFX && (
        <OFXImporter 
          onClose={() => {
            setIsOFXModalOpen(false);
            setSelectedAccountForOFX(null);
          }}
          bankAccountId={selectedAccountForOFX.id}
          bankAccountName={selectedAccountForOFX.name}
        />
      )}
    </div>
  );
}
