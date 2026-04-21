import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getTodayBR } from "../lib/dateUtils";
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Calendar,
  User,
  CheckCircle2,
  Building2,
  Shield,
  Lock,
  Repeat,
  History,
  CalendarClock,
  Trash2,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { calculateNextDueDate, Frequency } from "../lib/finance";
import ExportButton from "../components/ExportButton";

export default function AccountsReceivable() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canView = hasPermission('finance.view');

  

  const [activeTab, setActiveTab] = useState("Pendentes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [accountToReverse, setAccountToReverse] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId();

  const { data: accountsData = [], isLoading } = useQuery({ 
    queryKey: ["accountsReceivable", currentCompanyId], 
    queryFn: () => api.get("accountsReceivable", { _orderBy: "due_date", _orderDir: "asc" }),
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

  const { data: clientsData = [] } = useQuery({ 
    queryKey: ["clients", currentCompanyId], 
    queryFn: () => api.get("clients"),
    enabled: !!user
  });

  const clients = React.useMemo(() => {
    if (!currentCompanyId) return clientsData;
    return clientsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [clientsData, currentCompanyId]);

  const hasOpenCashier = React.useMemo(() => {
    const today = getTodayBR();
    return cashiers.some((c: any) => 
      c.status === "Aberto" && 
      c.opened_by_id === user?.id &&
      c.opened_at?.startsWith(today)
    );
  }, [cashiers, user?.id]);

  const accountsWithDynamicStatus = React.useMemo(() => {
    const today = getTodayBR();
    return accounts.map((acc: any) => {
      let currentStatus = acc.status;
      if (currentStatus === "Pendente" && acc.due_date && acc.due_date < today) {
        currentStatus = "Atrasado";
      }
      return { ...acc, status: currentStatus };
    });
  }, [accounts]);

  const filteredAccounts = accountsWithDynamicStatus.filter((acc: any) => {
    if (activeTab === "Pendentes") return acc.status === "Pendente";
    if (activeTab === "Recebidas") return acc.status === "Recebido";
    if (activeTab === "Atrasadas") return acc.status === "Atrasado";
    return true;
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, account }: { id: string, account: { type: string, id: string } }) => {
      // Get current account data to check for recurrence
      const currentAccount = accounts.find((a: any) => a.id === id);
      
      const { processAccountReceipt } = await import("../lib/finance");
      await processAccountReceipt(id, currentAccount, account);

      // If recurring, create the next one
      if (currentAccount?.is_recurring && currentAccount?.frequency) {
        const nextDueDate = calculateNextDueDate(currentAccount.due_date, currentAccount.frequency as Frequency);
        
        await api.post("accountsReceivable", {
          ...currentAccount,
          id: undefined, // Ensure new ID
          due_date: nextDueDate,
          status: "Pendente",
          receipt_date: undefined,
          bank_account_id: undefined,
          cashier_id: undefined,
          created_at: new Date().toISOString()
        });
        
        toast.info(`Próximo lançamento gerado para ${formatBR(nextDueDate)}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Conta marcada como recebida!");
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("accountsReceivable", {
      ...data,
      company_id: user?.company_id,
      amount: parseFloat(data.amount as string),
      status: "Pendente",
      is_recurring: data.is_recurring === "on"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
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

  const handleReceive = (id: string) => {
    setCurrentAccountId(id);
    setIsReceiveModalOpen(true);
  };

  const confirmReceipt = () => {
    if (!selectedAccountId || !currentAccountId) {
      toast.error("Selecione uma conta para recebimento");
      return;
    }
    const [type, id] = selectedAccountId.split(':');
    receiveMutation.mutate({ id: currentAccountId, account: { type, id } });
    setIsReceiveModalOpen(false);
    setSelectedAccountId("");
    setCurrentAccountId(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbAccount = accounts.find((a: any) => a.id === id);
      if (dbAccount && dbAccount.status === "Recebido") {
        throw new Error("Não é possível excluir uma conta que já foi finalizada. Estorne primeiro.");
      }
      return api.delete("accountsReceivable", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Conta excluída com sucesso.");
    }
  });

  const reverseMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbAccount = accounts.find((a: any) => a.id === id);
      if (!dbAccount) throw new Error("Conta não encontrada");
      
      const { reverseAccountReceipt } = await import("../lib/finance");
      await reverseAccountReceipt(dbAccount);
      
      return api.put("accountsReceivable", id, {
        status: dbAccount.due_date >= getTodayBR() ? "Pendente" : "Atrasado",
        receipt_date: null,
        bank_account_id: null,
        cashier_id: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Estorno concluído! A fatura voltou a ficar pendente/atrasada.");
      setIsReverseModalOpen(false);
      setAccountToReverse(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao estornar a conta.");
    }
  });

  const extendDateMutation = useMutation({
    mutationFn: (data: { id: string, newDate: string, oldDate: string }) => {
      const dbAccount = accounts.find((a: any) => a.id === data.id);
      if (dbAccount && (dbAccount.status === 'Recebido' || dbAccount.status === 'Pago')) {
          throw new Error('Não é possível modificar parâmetros de uma conta que já foi finalizada. Estorne primeiro.');
      }
      const historyRecord = {
        old_date: data.oldDate,
        new_date: data.newDate,
        changed_at: new Date().toISOString(),
        changed_by: user?.id || null,
        user_name: user?.full_name || "Usuário não identificado"
      };
      
      const updatedHistory = dbAccount.due_date_history ? [...dbAccount.due_date_history, historyRecord] : [historyRecord];

      return api.put("accountsReceivable", data.id, {
        due_date: data.newDate,
        status: data.newDate >= getTodayBR() ? "Pendente" : "Atrasado",
        due_date_history: updatedHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      toast.success("Vencimento alterado com sucesso!");
      setIsEditDateModalOpen(false);
      setNewDueDate("");
    }
  });

  const handleDelete = (id: string) => {
    const acc = accounts.find((a: any) => a.id === id);
    if (acc && acc.status === "Recebido") {
      toast.warning("Por favor, clique no botão Estornar antes de excluir este registro de fatura.");
      return;
    }
    setAccountToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete);
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleReverse = (id: string) => {
    setAccountToReverse(id);
    setIsReverseModalOpen(true);
  };

  const handleEditDate = (id: string, currentDate: string) => {
    setCurrentAccountId(id);
    setNewDueDate(currentDate);
    setIsEditDateModalOpen(true);
  };

  const confirmDateEdit = () => {
    if (!currentAccountId || !newDueDate) return;
    const account = accounts.find((a: any) => a.id === currentAccountId);
    if (account) {
        if (newDueDate === account.due_date) {
             toast.error("O novo vencimento deve ser diferente do atual.");
             return;
        }
        extendDateMutation.mutate({ id: currentAccountId, newDate: newDueDate, oldDate: account.due_date });
    }
  };

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar as contas a receber. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {!hasOpenCashier && (user?.role !== 'admin' && user?.role !== 'master') && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-3xl">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-md space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Lock size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Caixa Fechado</h2>
              <p className="text-gray-500">
                Você precisa ter um caixa aberto para realizar recebimentos. 
                Por favor, abra um caixa antes de continuar.
              </p>
            </div>
            <button 
              onClick={() => navigate("/caixas")}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              Ir para Gestão de Caixas
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
          <p className="text-gray-500">Gestão de recebimentos e faturamento.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredAccounts} 
            filename={`contas-receber-${activeTab.toLowerCase()}`} 
            format="xlsx" 
            title={`Relatório de Contas a Receber - ${activeTab}`}
            headers={{
              description: 'Descrição',
              client_name: 'Cliente',
              amount: 'Valor (R$)',
              due_date: 'Vencimento',
              status: 'Status',
              receipt_date: 'Data Recebimento'
            }}
          />
          <ExportButton 
            data={filteredAccounts} 
            filename={`contas-receber-${activeTab.toLowerCase()}`} 
            format="pdf" 
            title={`Relatório de Contas a Receber - ${activeTab}`}
            headers={{
              description: 'Descrição',
              client_name: 'Cliente',
              amount: 'Valor (R$)',
              due_date: 'Vencimento',
              status: 'Status',
              receipt_date: 'Data Recebimento'
            }}
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-shadow shadow-lg shadow-green-200"
          >
            <Plus size={20} />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pendente</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            R$ {accountsWithDynamicStatus.filter((a: any) => a.status === "Pendente").reduce((acc: number, a: any) => acc + (a.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Recebido (Mês)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            R$ {accountsWithDynamicStatus.filter((a: any) => a.status === "Recebido").reduce((acc: number, a: any) => acc + (a.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Contas Atrasadas</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {accountsWithDynamicStatus.filter((a: any) => a.status === "Atrasado").length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {["Pendentes", "Recebidas", "Atrasadas"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === tab ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"
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
              <div className={`p-3 rounded-xl ${acc.status === "Recebido" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {acc.description}
                  {acc.is_recurring && <span title={`Recorrente (${acc.frequency})`}><Repeat size={14} className="text-blue-500" /></span>}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><User size={12} /> {acc.client_name || "Cliente não inf."}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Vence em: {formatBR(acc.due_date)}</span>
                  {acc.due_date_history && acc.due_date_history.length > 0 && (
                     <span className="flex items-center gap-1 text-yellow-600" title={`${acc.due_date_history.length} alterações de data no histórico`}>
                         <History size={12} /> Alterada ({acc.due_date_history.length}x)
                     </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-6">
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">R$ {acc.amount?.toLocaleString()}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  acc.status === "Recebido" ? "bg-green-100 text-green-700" : 
                  acc.status === "Atrasado" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {acc.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {acc.status === "Recebido" && (user?.role === 'admin' || user?.role === 'master') && (
                  <button 
                    onClick={() => handleReverse(acc.id)}
                    className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                    title="Estornar Recebimento"
                  >
                    <RotateCcw size={20} />
                  </button>
                )}
                {acc.status !== "Recebido" && (
                  <>
                    {(user?.role === 'admin' || user?.role === 'master') && (
                      <button 
                        onClick={() => handleEditDate(acc.id, acc.due_date)}
                        className="p-3 bg-yellow-100 text-yellow-600 rounded-xl hover:bg-yellow-200 transition-all"
                        title="Alterar Vencimento"
                      >
                        <CalendarClock size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleReceive(acc.id)}
                      className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
                      title="Registrar Recebimento"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  </>
                )}
                {(user?.role === 'admin' || user?.role === 'master') && (
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all ml-1"
                    title="Excluir Conta"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Recebimento */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsReceiveModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Confirmar Recebimento</h2>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Conta para Crédito *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
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
                <button onClick={() => setIsReceiveModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button onClick={confirmReceipt} className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alterar Vencimento */}
      {isEditDateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditDateModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex flex-col">
                <span>Alterar Vencimento</span>
                <span className="text-xs text-gray-500 font-normal">A data atual será armazenada no histórico de alterações da conta.</span>
              </h2>
              <button onClick={() => setIsEditDateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nova Data de Vencimento *</label>
                <input 
                  type="date"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              
              {currentAccountId && accounts.find((a: any) => a.id === currentAccountId)?.due_date_history && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Histórico Mapeado</h3>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto">
                    {accounts.find((a: any) => a.id === currentAccountId)?.due_date_history.map((hist: any, index: number) => (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">De <span className="font-bold text-gray-800">{formatBR(hist.old_date)}</span> para <span className="font-bold text-gray-800">{formatBR(hist.new_date)}</span></p>
                        <p className="text-gray-400 mt-1">Por {hist.user_name || "Usuário não identificado"} em {formatBR(hist.changed_at?.substring(0, 10))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6">
                <button onClick={() => setIsEditDateModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button onClick={confirmDateEdit} disabled={extendDateMutation.isPending} className="px-8 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600">
                  {extendDateMutation.isPending ? "Alterando..." : "Confirmar e Gravar"}
                </button>
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
              <h2 className="text-xl font-bold">Nova Conta a Receber</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição *</label>
                <input name="description" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor (R$) *</label>
                  <input name="amount" type="number" step="0.01" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vencimento *</label>
                  <input name="due_date" type="date" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cliente</label>
                <select name="client_name" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Selecione um cliente...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2">
                  <input type="checkbox" name="is_recurring" id="is_recurring" className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                  <label htmlFor="is_recurring" className="text-sm font-bold text-gray-700">Recorrente?</label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Frequência</label>
                  <select name="frequency" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm">
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold">
                  {createMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsDeleteModalOpen(false); setAccountToDelete(null); }} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Excluir Conta?</h2>
              <p className="text-gray-500">
                Esta ação não pode ser desfeita. Deseja realmente excluir permanentemente este lançamento?
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => { setIsDeleteModalOpen(false); setAccountToDelete(null); }} className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button 
                onClick={confirmDelete} 
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir Conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Estorno */}
      {isReverseModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsReverseModalOpen(false); setAccountToReverse(null); }} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto">
              <RotateCcw size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Estornar Recebimento?</h2>
              <p className="text-gray-500">
                O valor será retirado do caixa/banco correspondente e a fatura voltará para a lista de cobranças pendentes.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => { setIsReverseModalOpen(false); setAccountToReverse(null); }} className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button 
                onClick={() => accountToReverse && reverseMutation.mutate(accountToReverse)} 
                disabled={reverseMutation.isPending}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
              >
                {reverseMutation.isPending ? "Processando..." : "Estornar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
