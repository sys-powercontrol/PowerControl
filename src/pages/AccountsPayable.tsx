import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getTodayBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Calendar,
  Building2,
  CheckCircle2,
  Shield,
  Repeat,
  Lock,
  History,
  CalendarClock,
  Trash2,
  RotateCcw,
  Tag,
  Edit,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { calculateNextDueDate, Frequency } from "../lib/finance";
import ExportButton from "../components/ExportButton";

export default function AccountsPayable() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const canView = hasPermission('finance.view');

  

  const [activeTab, setActiveTab] = useState("Pendentes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [accountToReverse, setAccountToReverse] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  // Batch selection states
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  const [supplierSearch, setSupplierSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const currentCompanyId = api.getCompanyId();

  const { data: accountsData = [], isLoading } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable", { _orderBy: "due_date", _orderDir: "desc" }),
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
    let list = !currentCompanyId ? bankAccountsData : bankAccountsData.filter((item: any) => item.company_id === currentCompanyId);

    // Deduplicate the list by name, bank name and account number
    const seen = new Set();
    list = list.filter((a: any) => {
      const key = `${a.name}-${a.bank_name || ''}-${a.account_number || ''}`.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return list;
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

  const { data: categoriesData = [] } = useQuery({ 
    queryKey: ["categories", currentCompanyId], 
    queryFn: () => api.get("categories"),
    enabled: !!user
  });

  const categories = React.useMemo(() => {
    if (!currentCompanyId) return categoriesData;
    return categoriesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [categoriesData, currentCompanyId]);

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
    if (activeTab === "Pagas") return acc.status === "Pago";
    if (activeTab === "Atrasadas") return acc.status === "Atrasado";
    return true;
  });

  const stats = React.useMemo(() => {
    const currentMonth = getTodayBR().substring(0, 7); // 'YYYY-MM'

    const totalPendente = accountsWithDynamicStatus
      .filter((a: any) => a.status === "Pendente")
      .reduce((acc: number, a: any) => acc + (parseFloat(a.amount) || 0), 0);

    const totalPagoMes = accountsWithDynamicStatus
      .filter((a: any) => {
        if (a.status !== "Pago") return false;
        const dateStr = a.payment_date || a.due_date || a.created_at;
        return dateStr ? String(dateStr).startsWith(currentMonth) : false;
      })
      .reduce((acc: number, a: any) => acc + (parseFloat(a.amount) || 0), 0);

    const countAtrasadas = accountsWithDynamicStatus
      .filter((a: any) => a.status === "Atrasado").length;

    return {
      totalPendente,
      totalPagoMes,
      countAtrasadas
    };
  }, [accountsWithDynamicStatus]);

  const payMutation = useMutation({
    mutationFn: async ({ id, account }: { id: string, account: { type: string, id: string } }) => {
      // Get current account data to check for recurrence
      const currentAccount = accounts.find((a: any) => a.id === id);
      
      const { processAccountPayment } = await import("../lib/finance");
      await processAccountPayment(id, currentAccount, account);

      // If recurring, create the next one respecting max_installments and until_date
      if (currentAccount?.is_recurring && currentAccount?.frequency) {
        const nextDueDate = calculateNextDueDate(currentAccount.due_date, currentAccount.frequency as Frequency);
        const currentNum = currentAccount.installment_number || 1;
        const maxInst = currentAccount.max_installments;
        const untilDate = currentAccount.until_date;

        const shouldGenerate = (!maxInst || currentNum < maxInst) && (!untilDate || nextDueDate <= untilDate);

        if (shouldGenerate) {
          const recurrentId = currentAccount.recurrent_id || currentAccount.id;
          await api.post("accountsPayable", {
            ...currentAccount,
            id: undefined, // Ensure new ID
            recurrent_id: recurrentId,
            installment_number: currentNum + 1,
            due_date: nextDueDate,
            status: "Pendente",
            payment_date: undefined,
            bank_account_id: undefined,
            cashier_id: undefined,
            created_at: new Date().toISOString()
          });
          
          toast.info(`Próximo lançamento (${currentNum + 1}/${maxInst || '∞'}) gerado para ${formatBR(nextDueDate)}`);
        } else {
          toast.info("Ciclo de recorrência encerrado (limite de parcelas ou data limite atingido).");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
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
    
    let supplier_name = data.supplier as string;
    const supplier_id = selectedSupplierId;
    
    if (supplier_id) {
        const sup = suppliers.find((s: any) => s.id === supplier_id);
        if (sup) supplier_name = sup.name;
    }

    let category_name = "";
    if (selectedCategoryId) {
      const cat = categories.find((c: any) => c.id === selectedCategoryId);
      if (cat) category_name = cat.name;
    }

    let newStatus = editingAccount ? editingAccount.status : "Pendente";
    const statusFromForm = data.status as string;
    
    // If user manually changed status in edit form (if we add the field)
    if (statusFromForm && statusFromForm !== newStatus) {
      newStatus = statusFromForm;
    }

    const accountData = {
       ...data,
       supplier: supplier_name,
       supplier_name: supplier_name,
       supplier_id: supplier_id,
       category_id: selectedCategoryId || null,
       category_name: category_name || null,
       company_id: user?.company_id,
       amount: parseFloat(data.amount as string),
       status: newStatus,
       is_recurring: data.is_recurring === "on"
    };

    const mutationPromise = editingAccount
      ? api.put("accountsPayable", editingAccount.id, accountData)
      : api.post("accountsPayable", accountData);

    mutationPromise.then(async () => {
      if (editingAccount && (editingAccount.recurrent_id || editingAccount.is_recurring)) {
        const { updateRecurrencesCascade } = await import("../lib/finance");
        const recId = editingAccount.recurrent_id || editingAccount.id;
        await updateRecurrencesCascade("accountsPayable", recId, editingAccount.due_date, {
          amount: accountData.amount,
          supplier: accountData.supplier,
          supplier_name: accountData.supplier_name,
          category_id: accountData.category_id,
          category_name: accountData.category_name,
          description: (data.description as string) || ""
        });
      }

      // HANDLE FINANCIAL RESTORATION IF REOPENED
      if (editingAccount && editingAccount.status === "Pago" && (newStatus === "Pendente" || newStatus === "Atrasado")) {
        const { reverseAccountPayment } = await import("../lib/finance");
        await reverseAccountPayment(editingAccount);
        toast.info("A conta foi reaberta e o saldo estornado.");
      }
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      toast.success(editingAccount ? "Conta atualizada!" : "Conta cadastrada!");
      setIsModalOpen(false);
      setEditingAccount(null);
    }).catch(async (error) => {
      console.warn("Falha ao salvar CP, acionando offline fallback", error);
      if (!navigator.onLine || error.message?.includes('offline') || error.message?.includes('Failed to fetch')) {
         const { offlineStore } = await import('../lib/offlineStore');
         if (editingAccount) {
            toast.error("Edição offline não disponível no momento.");
         } else {
            await offlineStore.saveAccountPayable(accountData);
            setIsModalOpen(false);
         }
      } else {
         toast.error("Erro ao salvar: " + error.message);
      }
    });
  };

  const handleEdit = (acc: any) => {
    setEditingAccount(acc);
    setSupplierSearch(acc.supplier || "");
    setSelectedSupplierId(acc.supplier_id || "");
    setCategorySearch(acc.category_name || "");
    setSelectedCategoryId(acc.category_id || "");
    setIsModalOpen(true);
  };

  const handlePay = (id: string) => {
    setCurrentAccountId(id);
    setIsPayModalOpen(true);
  };

  const toggleSelectAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAccountIds.size === filteredAccounts.length) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(filteredAccounts.map((a: any) => a.id)));
    }
  };

  const handleBatchPayConfirm = async () => {
    if (!selectedAccountId) {
      toast.error("Selecione uma conta bancária ou caixa para débito.");
      return;
    }
    if (selectedAccountIds.size === 0) return;

    setIsBatchProcessing(true);
    const [type, accountId] = selectedAccountId.split(':');
    const { processAccountPayment } = await import("../lib/finance");

    let successCount = 0;
    for (const id of Array.from(selectedAccountIds)) {
      try {
        const currentAccount = accounts.find((a: any) => a.id === id);
        if (currentAccount && currentAccount.status !== "Pago") {
          await processAccountPayment(id, currentAccount, { type, id: accountId });
          
          if (currentAccount.is_recurring && currentAccount.frequency) {
            const nextDueDate = calculateNextDueDate(currentAccount.due_date, currentAccount.frequency as Frequency);
            await api.post("accountsPayable", {
              ...currentAccount,
              id: undefined,
              due_date: nextDueDate,
              status: "Pendente",
              payment_date: undefined,
              bank_account_id: undefined,
              cashier_id: undefined,
              created_at: new Date().toISOString()
            });
          }
          successCount++;
        }
      } catch (err) {
        console.error(`Erro ao baixar conta ${id}:`, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
    queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["cashiers"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });

    toast.success(`${successCount} contas pagas com sucesso em lote!`);
    setIsBatchProcessing(false);
    setIsBatchPayModalOpen(false);
    setSelectedAccountIds(new Set());
    setSelectedAccountId("");
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbAccount = accounts.find((a: any) => a.id === id);
      if (dbAccount && dbAccount.status === "Pago") {
        throw new Error("Não é possível excluir uma conta que já foi paga. Estorne primeiro.");
      }
      return api.delete("accountsPayable", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
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
      
      const { reverseAccountPayment } = await import("../lib/finance");
      await reverseAccountPayment(dbAccount);
      
      return api.put("accountsPayable", id, {
        status: dbAccount.due_date >= getTodayBR() ? "Pendente" : "Atrasado",
        payment_date: null,
        bank_account_id: null,
        cashier_id: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
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
      
      const historyRecord = {
        old_date: data.oldDate,
        new_date: data.newDate,
        changed_at: new Date().toISOString(),
        changed_by: user?.id || null,
        user_name: user?.full_name || "Usuário não identificado"
      };
      
      const updatedHistory = dbAccount.due_date_history ? [...dbAccount.due_date_history, historyRecord] : [historyRecord];

      return api.put("accountsPayable", data.id, {
        due_date: data.newDate,
        status: data.newDate >= getTodayBR() ? "Pendente" : "Atrasado",
        due_date_history: updatedHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      toast.success("Vencimento alterado com sucesso!");
      setIsEditDateModalOpen(false);
      setNewDueDate("");
    }
  });

  const handleDelete = (id: string) => {
    const acc = accounts.find((a: any) => a.id === id);
    if (acc && acc.status === "Pago") {
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
            Você não tem permissão para visualizar as contas a pagar. 
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
          <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-500">Gestão de despesas e compromissos.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto min-w-0 items-stretch">
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
            className="bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-emerald-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileSpreadsheet className="text-emerald-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 leading-tight truncate">Excel</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

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
            className="bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-rose-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="text-rose-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-rose-700 leading-tight truncate">PDF</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <button 
            onClick={() => {
              setSupplierSearch("");
              setCategorySearch("");
              setSelectedSupplierId("");
              setSelectedCategoryId("");
              setIsModalOpen(true);
            }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md shadow-red-500/20 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] w-full h-full"
          >
            <Plus size={18} className="text-white shrink-0" />
            <span className="truncate">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pendente</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(stats.totalPendente)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pago (Mês)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(stats.totalPagoMes)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Contas Atrasadas</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {stats.countAtrasadas}
          </p>
        </div>
      </div>

      {/* Tabs and Batch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 gap-4">
        <div className="flex">
          {["Pendentes", "Pagas", "Atrasadas"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedAccountIds(new Set());
              }}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === tab ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab !== "Pagas" && filteredAccounts.length > 0 && (
          <div className="flex items-center gap-3 pb-2 sm:pb-0">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
            >
              {selectedAccountIds.size === filteredAccounts.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </button>
            {selectedAccountIds.size > 0 && (
              <button
                onClick={() => setIsBatchPayModalOpen(true)}
                className="px-4 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                Baixar Selecionadas ({selectedAccountIds.size}) - {formatCurrency(
                  filteredAccounts
                    .filter((a: any) => selectedAccountIds.has(a.id))
                    .reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                )}
              </button>
            )}
          </div>
        )}
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
          <div key={acc.id} className={`bg-white p-6 rounded-2xl border transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${selectedAccountIds.has(acc.id) ? "border-red-400 bg-red-50/20" : "border-gray-100"}`}>
            <div className="flex items-center gap-4">
              {activeTab !== "Pagas" && (
                <input
                  type="checkbox"
                  checked={selectedAccountIds.has(acc.id)}
                  onChange={() => toggleSelectAccount(acc.id)}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              )}
              <div className={`p-3 rounded-xl ${acc.status === "Pago" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                <TrendingDown size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {acc.description}
                  {acc.is_recurring && <span title={`Recorrente (${acc.frequency})`}><Repeat size={14} className="text-blue-500" /></span>}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Building2 size={12} /> {acc.supplier || acc.supplier_name || "Fornecedor não inf."}</span>
                  {acc.category_name && <span className="flex items-center gap-1 text-blue-600"><Tag size={12} /> {acc.category_name}</span>}
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
                <p className="text-lg font-bold text-gray-900">{formatCurrency(acc.amount || 0)}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  acc.status === "Pago" ? "bg-green-100 text-green-700" : 
                  acc.status === "Atrasado" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {acc.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {acc.status === "Pago" && (user?.role === 'admin' || user?.role === 'master') && (
                  <>
                    <button 
                      onClick={() => handleEdit(acc)}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold"
                      title="Editar Conta"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleReverse(acc.id)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-bold"
                      title="Estornar Pagamento"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </>
                )}
                {acc.status !== "Pago" && (
                  <>
                    {(user?.role === 'admin' || user?.role === 'master') && (
                      <>
                        <button 
                          onClick={() => handleEdit(acc)}
                          className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold"
                          title="Editar Conta"
                        >
                          <Edit size={20} />
                        </button>
                        <button 
                          onClick={() => handleEditDate(acc.id, acc.due_date)}
                          className="p-3 bg-yellow-100 text-yellow-600 rounded-xl hover:bg-yellow-200 transition-all font-bold"
                          title="Alterar Vencimento"
                        >
                          <CalendarClock size={20} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handlePay(acc.id)}
                      className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all font-bold"
                      title="Registrar Pagamento"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  </>
                )}
                {(user?.role === 'admin' || user?.role === 'master') && (
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all ml-1 font-bold"
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

      {/* Modal Pagamento em Lote */}
      {isBatchPayModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBatchPayModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Baixa em Lote</h2>
                <p className="text-xs text-gray-500">{selectedAccountIds.size} conta(s) selecionada(s)</p>
              </div>
              <button onClick={() => setIsBatchPayModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-xs font-bold text-green-700 uppercase mb-1">Valor Total a Baixar</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(
                    filteredAccounts
                      .filter((a: any) => selectedAccountIds.has(a.id))
                      .reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Conta para Débito Única *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">Selecione uma conta...</option>
                  <optgroup label="Contas Bancárias">
                    {bankAccounts.map((a: any) => (
                      <option key={`bank:${a.id}`} value={`bank:${a.id}`}>{a.name} ({formatCurrency(a.balance || 0)})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Caixas">
                    {cashiers.filter((c: any) => c.status === "Aberto").map((c: any) => (
                      <option key={`cashier:${c.id}`} value={`cashier:${c.id}`}>{c.name} ({formatCurrency(c.balance || 0)})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button onClick={() => setIsBatchPayModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button 
                  onClick={handleBatchPayConfirm} 
                  disabled={isBatchProcessing || !selectedAccountId}
                  className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {isBatchProcessing ? "Processando..." : "Confirmar Baixa em Lote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPayModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
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
                      <option key={`bank:${a.id}`} value={`bank:${a.id}`}>{a.name} ({formatCurrency(a.balance || 0)})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Caixas">
                    {cashiers.filter((c: any) => c.status === "Aberto").map((c: any) => (
                      <option key={`cashier:${c.id}`} value={`cashier:${c.id}`}>{c.name} ({formatCurrency(c.balance || 0)})</option>
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

      {/* Modal Alterar Vencimento */}
      {isEditDateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditDateModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
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

      {/* Modal Confirmar Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsDeleteModalOpen(false); setAccountToDelete(null); }} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6 max-h-[90vh] overflow-y-auto">
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

      {/* Modal Nova Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingAccount ? "Editar Conta" : "Nova Conta a Pagar"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingAccount(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição *</label>
                <input name="description" required defaultValue={editingAccount?.description} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor (R$) *</label>
                  <input name="amount" type="number" step="0.01" required defaultValue={editingAccount?.amount} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Vencimento *</label>
                  <input name="due_date" type="date" required defaultValue={editingAccount?.due_date} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Fornecedor</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar fornecedor..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        if (!e.target.value) setSelectedSupplierId("");
                      }}
                      onFocus={() => {
                        if (!selectedSupplierId) setSupplierSearch("");
                      }}
                    />
                  </div>
                  {supplierSearch.length > 0 && !selectedSupplierId && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {suppliers.filter((s: any) => 
                        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                        s.document?.includes(supplierSearch)
                      ).length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">Nenhum fornecedor encontrado</div>
                      ) : (
                        suppliers.filter((s: any) => 
                          s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                          s.document?.includes(supplierSearch)
                        ).map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedSupplierId(s.id);
                              setSupplierSearch(s.name);
                            }}
                            className="w-full p-3 text-left hover:bg-red-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <p className="text-sm font-bold text-gray-900">{s.name}</p>
                            <p className="text-[10px] text-gray-500">{s.document || "Sem documento"}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Categoria / Centro de Custos</label>
                <div className="relative">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar categoria..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        if (!e.target.value) setSelectedCategoryId("");
                      }}
                    />
                  </div>
                  {categorySearch.length > 0 && !selectedCategoryId && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {categories.filter((c: any) => 
                        c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                        c.code?.includes(categorySearch)
                      ).length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">Nenhuma categoria encontrada</div>
                      ) : (
                        categories.filter((c: any) => 
                          c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                          c.code?.includes(categorySearch)
                        ).map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(c.id);
                              setCategorySearch(c.name);
                            }}
                            className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <p className="text-sm font-bold text-gray-900">{c.name}</p>
                            <p className="text-[10px] text-gray-500">{c.code || "Sem código"}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2">
                  <input type="checkbox" name="is_recurring" id="is_recurring" defaultChecked={editingAccount?.is_recurring} className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                  <label htmlFor="is_recurring" className="text-sm font-bold text-gray-700">Recorrente?</label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Frequência</label>
                  <select name="frequency" defaultValue={editingAccount?.frequency || "MONTHLY"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              </div>
              {editingAccount && (
                <div className="px-1 py-1">
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select 
                    name="status" 
                    defaultValue={editingAccount.status}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                  {editingAccount.status === "Pago" && (
                    <p className="text-[10px] text-orange-600 font-bold mt-1 ml-1">Nota: Mudar para Pendente irá estornar o valor do caixa/banco automaticamente.</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingAccount(null); }} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="px-8 py-2 bg-red-600 text-white rounded-xl font-bold">
                  {editingAccount ? "Salvar Alterações" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Confirmar Estorno */}
      {isReverseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsReverseModalOpen(false); setAccountToReverse(null); }} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto">
              <RotateCcw size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Estornar Pagamento?</h2>
              <p className="text-gray-500">
                O valor será devolvido ao caixa/banco correspondente e a fatura voltará para a lista de cobranças pendentes.
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
