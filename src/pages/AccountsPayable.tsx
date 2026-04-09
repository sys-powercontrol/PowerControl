import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Repeat
} from "lucide-react";
import { toast } from "sonner";
import { calculateNextDueDate, Frequency } from "../lib/finance";
import ExportButton from "../components/ExportButton";

export default function AccountsPayable() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canView = hasPermission('finance.view');

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar as contas a pagar. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("Pendentes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId();

  const { data: accountsData = [], isLoading } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable", { _orderBy: "due_date", _orderDir: "asc" }),
    enabled: !!user
  });

  const accounts = React.useMemo(() => {
    if (!currentCompanyId) return accountsData;
    return accountsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [accountsData, currentCompanyId]);

  const { data: bankAccountsData = [] } = useQuery({ 
    queryKey: ["bankAccounts", currentCompanyId], 
    queryFn: () => api.get("bankAccounts"),
    enabled: !!user
  });

  const bankAccounts = React.useMemo(() => {
    if (!currentCompanyId) return bankAccountsData;
    return bankAccountsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [bankAccountsData, currentCompanyId]);

  const { data: cashiersData = [] } = useQuery({ 
    queryKey: ["cashiers", currentCompanyId], 
    queryFn: () => api.get("cashiers"),
    enabled: !!user
  });

  const cashiers = React.useMemo(() => {
    if (!currentCompanyId) return cashiersData;
    return cashiersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [cashiersData, currentCompanyId]);

  const { data: suppliersData = [] } = useQuery({ 
    queryKey: ["suppliers", currentCompanyId], 
    queryFn: () => api.get("suppliers"),
    enabled: !!user
  });

  const suppliers = React.useMemo(() => {
    if (!currentCompanyId) return suppliersData;
    return suppliersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [suppliersData, currentCompanyId]);

  const filteredAccounts = accounts.filter((acc: any) => {
    if (activeTab === "Pendentes") return acc.status === "Pendente";
    if (activeTab === "Pagas") return acc.status === "Pago";
    if (activeTab === "Atrasadas") return acc.status === "Atrasado";
    return true;
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, account }: { id: string, account: { type: string, id: string } }) => {
      // Get current account data to check for recurrence
      const currentAccount = accounts.find((a: any) => a.id === id);
      
      const result = await api.put("accountsPayable", id, { 
        status: "Pago", 
        payment_date: new Date().toISOString(),
        bank_account_id: account.type === 'bank' ? account.id : undefined,
        cashier_id: account.type === 'cashier' ? account.id : undefined
      });

      // If recurring, create the next one
      if (currentAccount?.is_recurring && currentAccount?.frequency) {
        const nextDueDate = calculateNextDueDate(currentAccount.due_date, currentAccount.frequency as Frequency);
        
        await api.post("accountsPayable", {
          ...currentAccount,
          id: undefined, // Ensure new ID
          due_date: nextDueDate,
          status: "Pendente",
          payment_date: undefined,
          bank_account_id: undefined,
          cashier_id: undefined,
          created_at: new Date().toISOString()
        });
        
        toast.info(`Próximo lançamento gerado para ${new Date(nextDueDate).toLocaleDateString()}`);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success("Conta marcada como paga!");
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("accountsPayable", {
      ...data,
      company_id: user?.company_id,
      amount: parseFloat(data.amount as string),
      status: "Pendente",
      is_recurring: data.is_recurring === "on"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      toast.success("Conta cadastrada!");
      setIsModalOpen(false);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    createMutation.mutate(data);
  };

  const handlePay = (id: string) => {
    setCurrentAccountId(id);
    setIsPayModalOpen(true);
  };

  const confirmPayment = () => {
    if (!selectedAccountId || !currentAccountId) {
      toast.error("Selecione uma conta para pagamento");
      return;
    }
    const [type, id] = selectedAccountId.split(':');
    payMutation.mutate({ id: currentAccountId, account: { type, id } });
    setIsPayModalOpen(false);
    setSelectedAccountId("");
    setCurrentAccountId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-500">Gestão de despesas e compromissos.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredAccounts} 
            filename={`contas-pagar-${activeTab.toLowerCase()}`} 
            format="xlsx" 
            title={`Relatório de Contas a Pagar - ${activeTab}`}
            headers={{
              description: 'Descrição',
              supplier: 'Fornecedor',
              amount: 'Valor (R$)',
              due_date: 'Vencimento',
              status: 'Status',
              payment_date: 'Data Pagamento'
            }}
          />
          <ExportButton 
            data={filteredAccounts} 
            filename={`contas-pagar-${activeTab.toLowerCase()}`} 
            format="pdf" 
            title={`Relatório de Contas a Pagar - ${activeTab}`}
            headers={{
              description: 'Descrição',
              supplier: 'Fornecedor',
              amount: 'Valor (R$)',
              due_date: 'Vencimento',
              status: 'Status',
              payment_date: 'Data Pagamento'
            }}
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-shadow shadow-lg shadow-red-200"
          >
            <Plus size={20} />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pendente</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            R$ {accounts.filter((a: any) => a.status === "Pendente").reduce((acc: number, a: any) => acc + (a.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pago (Mês)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            R$ {accounts.filter((a: any) => a.status === "Pago").reduce((acc: number, a: any) => acc + (a.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Contas Atrasadas</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {accounts.filter((a: any) => a.status === "Atrasado").length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {["Pendentes", "Pagas", "Atrasadas"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === tab ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Carregando contas...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhuma conta encontrada nesta categoria.
          </div>
        ) : filteredAccounts.map((acc: any) => (
          <div key={acc.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${acc.status === "Pago" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                <TrendingDown size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {acc.description}
                  {acc.is_recurring && <Repeat size={14} className="text-blue-500" title={`Recorrente (${acc.frequency})`} />}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Building2 size={12} /> {acc.supplier || "Fornecedor não inf."}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Vence em: {new Date(acc.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-6">
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">R$ {acc.amount?.toLocaleString()}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  acc.status === "Pago" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {acc.status}
                </span>
              </div>
              {acc.status !== "Pago" && (
                <button 
                  onClick={() => handlePay(acc.id)}
                  className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
                >
                  <CheckCircle2 size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Pagamento */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPayModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Confirmar Pagamento</h2>
              <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Conta para Débito *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">Selecione uma conta...</option>
                  <optgroup label="Contas Bancárias">
                    {bankAccounts.map((a: any) => (
                      <option key={`bank:${a.id}`} value={`bank:${a.id}`}>{a.name} (R$ {a.balance?.toLocaleString()})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Caixas">
                    {cashiers.filter((c: any) => c.status === "Aberto").map((c: any) => (
                      <option key={`cashier:${c.id}`} value={`cashier:${c.id}`}>{c.name} (R$ {c.balance?.toLocaleString()})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button onClick={() => setIsPayModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button onClick={confirmPayment} className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Nova Conta a Pagar</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição *</label>
                <input name="description" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor (R$) *</label>
                  <input name="amount" type="number" step="0.01" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vencimento *</label>
                  <input name="due_date" type="date" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Fornecedor</label>
                <select name="supplier" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Selecione um fornecedor...</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2">
                  <input type="checkbox" name="is_recurring" id="is_recurring" className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                  <label htmlFor="is_recurring" className="text-sm font-bold text-gray-700">Recorrente?</label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Frequência</label>
                  <select name="frequency" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="px-8 py-2 bg-red-600 text-white rounded-xl font-bold">
                  {createMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
