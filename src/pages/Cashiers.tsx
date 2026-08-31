import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  CreditCard, 
  Plus, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  History
} from "lucide-react";
import { toast } from "sonner";

export default function Cashiers() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showBalance, setShowBalance] = useState<Record<string, boolean>>({});
  const [showGlobalBalance, setShowGlobalBalance] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [editingCashier, setEditingCashier] = useState<any>(null);
  const [historyCashier, setHistoryCashier] = useState<any>(null);

  const canView = hasPermission('finance.view');

  

  const currentCompanyId = api.getCompanyId();

  const { data: cashiersData = [], isLoading } = useQuery({ 
    queryKey: ["cashiers", currentCompanyId], 
    queryFn: () => api.get("cashiers"),
    enabled: !!user
  });

  const cashiers = React.useMemo(() => {
    if (!currentCompanyId) return cashiersData;
    return cashiersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [cashiersData, currentCompanyId]);

  const toggleBalance = (id: string) => {
    setShowBalance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const createCashierMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCashier) {
        return api.put("cashiers", editingCashier.id, {
          ...data,
          company_id: currentCompanyId || user?.company_id,
        });
      } else {
        return api.post("cashiers", {
          ...data,
          company_id: currentCompanyId || user?.company_id,
          status: "Fechado",
          balance: 0,
          created_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success(editingCashier ? "Caixa atualizado com sucesso!" : "Caixa criado com sucesso!");
      setIsModalOpen(false);
      setEditingCashier(null);
    }
  });

  const openEditModal = (cashier: any) => {
    setEditingCashier(cashier);
    setIsModalOpen(true);
  };

  const openCashierMutation = useMutation({
    mutationFn: (data: any) => api.put("cashiers", selectedCashier.id, {
      status: "Aberto",
      opening_balance: data.amount,
      balance: data.amount,
      opened_at: new Date().toISOString(),
      opened_by: user?.full_name || "Sistema",
      opened_by_id: user?.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success("Caixa aberto com sucesso!");
      setIsOpeningModalOpen(false);
    }
  });

  const [closingCashier, setClosingCashier] = useState<any>(null);
  const [closingSummary, setClosingSummary] = useState<{ salesCount: number; salesTotal: number; movementsCount: number } | null>(null);
  const [countedBalance, setCountedBalance] = useState<number | string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [isClosingLoading, setIsClosingLoading] = useState(false);

  const handleInitiateClose = async (cashier: any) => {
    setClosingCashier(cashier);
    setCountedBalance(cashier.balance !== undefined ? cashier.balance : "");
    setClosingNotes("");
    setIsClosingLoading(true);
    try {
      const sales: any[] = await api.get("sales", { cashier_id: cashier.id });
      const movements: any[] = await api.get("movements", { from_account_id: cashier.id });

      const unclosedSales = sales.filter((s: any) => !s.cashier_closed_at && s.status !== "Cancelada");
      const unclosedMovements = movements.filter((m: any) => !m.cashier_closed_at);

      const salesTotal = unclosedSales.reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0);

      setClosingSummary({
        salesCount: unclosedSales.length,
        salesTotal,
        movementsCount: unclosedMovements.length
      });
    } catch (err) {
      console.warn("Erro ao buscar resumo de encerramento do caixa:", err);
      setClosingSummary({ salesCount: 0, salesTotal: 0, movementsCount: 0 });
    } finally {
      setIsClosingLoading(false);
    }
  };

  const { data: cashierSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["cashier_sessions", historyCashier?.id],
    queryFn: () => api.get("cashier_sessions", { cashier_id: historyCashier?.id, _orderBy: "closed_at", _orderDir: "desc" }),
    enabled: !!historyCashier?.id
  });

  const closeCashierMutation = useMutation({
    mutationFn: async ({ cashier, counted, notes }: { cashier: any; counted: number; notes: string }) => {
      const now = new Date().toISOString();
      const closedBy = user?.full_name || user?.email || "Sistema";
      const expected = Number(cashier.balance) || 0;
      const difference = Number((counted - expected).toFixed(2));
      const companyId = cashier.company_id || currentCompanyId || user?.company_id;

      // 1. Fetch and link unclosed sales and movements
      try {
        const sales: any[] = await api.get("sales", { cashier_id: cashier.id });
        const movements: any[] = await api.get("movements", { from_account_id: cashier.id });

        const unclosedSales = sales.filter((s: any) => !s.cashier_closed_at);
        for (const sale of unclosedSales) {
          await api.put("sales", sale.id, {
            cashier_closed_at: now,
            cashier_cycle_id: cashier.id
          });
        }

        const unclosedMovements = movements.filter((m: any) => !m.cashier_closed_at);
        for (const mov of unclosedMovements) {
          await api.put("movements", mov.id, {
            cashier_closed_at: now,
            cashier_cycle_id: cashier.id
          });
        }
      } catch (err) {
        console.warn("Aviso ao vincular lançamentos ao fechamento do caixa:", err);
      }

      // 2. Contábil: Criar lançamento de ajuste financeiro se houver discrepância
      if (difference < 0) {
        // Quebra de caixa (falta de dinheiro físico) -> Lançamento de Saída
        try {
          await api.post("movements", {
            company_id: companyId,
            type: "Saída",
            description: `Ajuste de Quebra de Caixa - Caixa: ${cashier.name}`,
            amount: Math.abs(difference),
            from_account_type: "Caixa",
            from_account_id: cashier.id,
            from_account_name: cashier.name,
            category: "Quebra de Caixa",
            movement_date: now,
            cashier_closed_at: now,
            cashier_cycle_id: cashier.id,
            observation: notes ? `Justificativa: ${notes}` : undefined
          });
        } catch (movErr) {
          console.error("Erro ao registrar movimento de quebra de caixa:", movErr);
        }
      } else if (difference > 0) {
        // Sobra de caixa (excesso de dinheiro físico) -> Lançamento de Entrada
        try {
          await api.post("movements", {
            company_id: companyId,
            type: "Entrada",
            description: `Ajuste de Sobra de Caixa - Caixa: ${cashier.name}`,
            amount: difference,
            to_account_type: "Caixa",
            to_account_id: cashier.id,
            to_account_name: cashier.name,
            category: "Sobra de Caixa",
            movement_date: now,
            cashier_closed_at: now,
            cashier_cycle_id: cashier.id,
            observation: notes ? `Justificativa: ${notes}` : undefined
          });
        } catch (movErr) {
          console.error("Erro ao registrar movimento de sobra de caixa:", movErr);
        }
      }

      // 3. Gravar registro permanente de sessão / ciclo de fechamento
      try {
        await api.post("cashier_sessions", {
          company_id: companyId,
          cashier_id: cashier.id,
          cashier_name: cashier.name,
          opened_at: cashier.opened_at || now,
          opened_by: cashier.opened_by || "Sistema",
          opened_by_id: cashier.opened_by_id || user?.id,
          closed_at: now,
          closed_by: closedBy,
          closed_by_id: user?.id,
          opening_balance: Number(cashier.opening_balance) || 0,
          closing_balance: expected,
          counted_balance: counted,
          difference_balance: difference,
          closing_notes: notes || "",
          sales_count: closingSummary?.salesCount || 0,
          sales_total: closingSummary?.salesTotal || 0,
          movements_count: closingSummary?.movementsCount || 0,
          created_at: now
        });
      } catch (sessionErr) {
        console.error("Erro ao registrar sessão de caixa:", sessionErr);
      }

      // 4. Fechar caixa e atualizar saldo para o valor contado
      return api.put("cashiers", cashier.id, {
        status: "Fechado",
        closed_at: now,
        closed_by: closedBy,
        closing_balance: expected,
        counted_balance: counted,
        difference_balance: difference,
        closing_notes: notes || undefined,
        balance: counted
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["cashier_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Caixa fechado e auditoria de turno concluída com sucesso!");
      setClosingCashier(null);
      setClosingSummary(null);
      setCountedBalance("");
      setClosingNotes("");
    }
  });

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <CreditCard size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para gerenciar os caixas. 
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
          <h1 className="text-2xl font-bold text-gray-900">Caixas</h1>
          <p className="text-gray-500">Controle de fluxo de caixa e PDV.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCashier(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          Novo Caixa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Total de Caixas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{cashiers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase">Caixas Abertos</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{cashiers.filter((c: any) => c.status === "Aberto").length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Saldo Consolidado</p>
            <button onClick={() => setShowGlobalBalance(!showGlobalBalance)} className="text-gray-400 hover:text-gray-600 transition-colors">
              {showGlobalBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {showGlobalBalance ? formatCurrency(cashiers.reduce((acc: number, c: any) => acc + (c.balance || 0), 0)) : "R$ ••••••"}
          </p>
        </div>
      </div>

      {/* Cashier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando caixas...</div>
        ) : cashiers.map((c: any) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                  <CreditCard size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === "Aberto" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.status}
                  </span>
                  <button 
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-lg text-gray-900">{c.name}</h3>
                <p className="text-xs text-gray-500">ID: {c.id.substr(0, 8).toUpperCase()}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Saldo Atual</span>
                  <button onClick={() => toggleBalance(c.id)} className="text-gray-400 hover:text-gray-600">
                    {showBalance[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {showBalance[c.id] ? formatCurrency(c.balance || 0) : "R$ ••••••"}
                </p>
              </div>

              {c.status === "Aberto" && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Aberto por</span>
                    <span className="font-bold text-gray-700">{c.opened_by}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Abertura</span>
                    <span className="font-bold text-gray-700">{formatBR(c.opened_at, "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              {c.status === "Fechado" ? (
                <button 
                  onClick={() => { setSelectedCashier(c); setIsOpeningModalOpen(true); }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                  <Unlock size={14} /> Abrir Caixa
                </button>
              ) : (
                <button 
                  onClick={() => handleInitiateClose(c)}
                  className="flex-1 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100"
                >
                  <Lock size={14} /> Fechar Caixa
                </button>
              )}
              <button 
                onClick={() => setHistoryCashier(c)}
                title="Ver Histórico"
                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
              >
                <History size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar Caixa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCashier ? "Editar Caixa" : "Novo Caixa"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              createCashierMutation.mutate(data);
            }} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome do Caixa *</label>
                <input name="name" defaultValue={editingCashier?.name} required placeholder="Ex: Caixa 01, PDV Principal" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Localização/Loja</label>
                <input name="location" defaultValue={editingCashier?.location} placeholder="Ex: Loja Matriz, Filial 01" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={createCashierMutation.isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  {createCashierMutation.isPending ? "Salvando..." : (editingCashier ? "Salvar" : "Criar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Modal */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpeningModalOpen(false)} />
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl space-y-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <h2 className="text-xl font-bold">Abrir Caixa</h2>
              <p className="text-sm text-gray-500">Informe o saldo inicial para abertura.</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat((e.currentTarget.elements.namedItem("amount") as HTMLInputElement).value);
              openCashierMutation.mutate({ amount });
            }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Saldo de Abertura (R$)</label>
                <input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={openCashierMutation.isPending} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
                  {openCashierMutation.isPending ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* History Modal */}
      {historyCashier && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryCashier(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <History className="text-blue-600" size={24} />
                  Histórico e Auditoria de Turnos
                </h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">{historyCashier.name} — ID: {historyCashier.id?.substring(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setHistoryCashier(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status do Turno Atual */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ciclo Atual</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${historyCashier.status === "Aberto" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                    {historyCashier.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Abertura:</span>
                    <span className="font-bold text-slate-800">{historyCashier.opened_at ? formatBR(historyCashier.opened_at, "dd/MM/yy HH:mm") : "---"}</span>
                    <span className="text-[11px] text-slate-500 block truncate">Por: {historyCashier.opened_by || "Sistema"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Saldo Inicial:</span>
                    <span className="font-bold text-blue-700">{formatCurrency(historyCashier.opening_balance || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Saldo em Caixa:</span>
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(historyCashier.balance || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Último Fechamento:</span>
                    <span className="font-bold text-slate-800">{historyCashier.closed_at ? formatBR(historyCashier.closed_at, "dd/MM/yy HH:mm") : "Em andamento"}</span>
                    {historyCashier.closed_by && <span className="text-[11px] text-slate-500 block truncate">Por: {historyCashier.closed_by}</span>}
                  </div>
                </div>
              </div>

              {/* Histórico de Fechamentos Anteriores */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                  <span>Fechamentos Anteriores Gravados</span>
                  <span className="text-xs font-normal text-gray-500">{cashierSessions.length} turno(s) registrado(s)</span>
                </h3>

                {isLoadingSessions ? (
                  <div className="py-8 text-center text-sm text-gray-400 font-medium">Carregando histórico de turnos...</div>
                ) : cashierSessions.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Nenhum turno anterior registrado na base consolidada.</p>
                    <p className="text-xs text-gray-400 mt-1">Os fechamentos realizados a partir de agora aparecerão listados aqui com auditoria completa.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashierSessions.map((session: any) => {
                      const diff = Number(session.difference_balance) || 0;
                      const isExact = diff === 0;
                      const isSurplus = diff > 0;

                      return (
                        <div key={session.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 hover:border-blue-100 transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Lock size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  Fechamento: {session.closed_at ? formatBR(session.closed_at, "dd/MM/yyyy HH:mm") : "---"}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  Aberto em {session.opened_at ? formatBR(session.opened_at, "dd/MM/yyyy HH:mm") : "---"} por <span className="font-semibold text-gray-700">{session.opened_by || "Sistema"}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${isExact ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isSurplus ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {isExact ? "Conferência Exata" : isSurplus ? `Sobra: +${formatCurrency(diff)}` : `Quebra: ${formatCurrency(diff)}`}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50/70 p-3 rounded-xl">
                            <div>
                              <span className="text-gray-400 block font-medium">Saldo Inicial:</span>
                              <span className="font-bold text-gray-800">{formatCurrency(session.opening_balance || 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block font-medium">Saldo Esperado:</span>
                              <span className="font-bold text-gray-800">{formatCurrency(session.closing_balance || 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block font-medium">Saldo Contado:</span>
                              <span className="font-bold text-gray-900">{formatCurrency(session.counted_balance || 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block font-medium">Fechado por:</span>
                              <span className="font-bold text-gray-800 truncate block">{session.closed_by || "Sistema"}</span>
                            </div>
                          </div>

                          {session.closing_notes && (
                            <div className="text-xs bg-amber-50/60 border border-amber-100 text-amber-900 p-2.5 rounded-xl">
                              <span className="font-bold">Observação da Auditoria:</span> {session.closing_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Closing Cashier Confirmation Modal */}
      {closingCashier && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setClosingCashier(null); setClosingSummary(null); }} />
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl space-y-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Encerrar Turno / Fechar Caixa</h2>
              <p className="text-sm text-gray-500 mt-1">
                Caixa: <span className="font-bold text-gray-800">{closingCashier.name}</span>
              </p>
            </div>

            {isClosingLoading ? (
              <div className="py-8 text-center text-sm font-bold text-gray-500">
                Calculando lançamentos pendentes de vinculo...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Vendas no Turno</span>
                    <span className="font-bold text-gray-900">{closingSummary?.salesCount || 0} venda(s)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Total de Vendas</span>
                    <span className="font-bold text-green-600">{formatCurrency(closingSummary?.salesTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Movimentações de Caixa</span>
                    <span className="font-bold text-blue-600">{closingSummary?.movementsCount || 0} registro(s)</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">Saldo Esperado em Caixa</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(closingCashier.balance || 0)}</span>
                  </div>
                </div>

                {/* Valor Contado (Auditoria Física) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Valor Físico em Gaveta / Contado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={countedBalance}
                    onChange={(e) => setCountedBalance(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {countedBalance !== "" && !isNaN(Number(countedBalance)) && (
                    (() => {
                      const expected = Number(closingCashier.balance) || 0;
                      const counted = Number(countedBalance) || 0;
                      const diff = Number((counted - expected).toFixed(2));
                      if (diff === 0) {
                        return (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
                            <span>Conferência Perfeita</span>
                            <span>R$ 0,00 de diferença</span>
                          </div>
                        );
                      }
                      if (diff > 0) {
                        return (
                          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center justify-between">
                            <span>Sobra de Caixa</span>
                            <span>+{formatCurrency(diff)}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between">
                          <span>Falta de Caixa (Divergência)</span>
                          <span>{formatCurrency(diff)}</span>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Observações de Encerramento */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Observações da Auditoria (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Justificativa de sangria ou conferência física..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Todos os lançamentos do turno serão consolidados e vinculados a este operador.
                </p>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setClosingCashier(null); setClosingSummary(null); }} 
                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const counted = countedBalance === "" || isNaN(Number(countedBalance)) 
                        ? (Number(closingCashier.balance) || 0) 
                        : Number(countedBalance);
                      const expected = Number(closingCashier.balance) || 0;
                      const diff = Number((counted - expected).toFixed(2));
                      
                      if (diff !== 0 && !closingNotes.trim()) {
                        toast.error("Por favor, preencha a justificativa da divergência/quebra de caixa antes de confirmar.");
                        return;
                      }

                      closeCashierMutation.mutate({
                        cashier: closingCashier,
                        counted,
                        notes: closingNotes
                      });
                    }} 
                    disabled={closeCashierMutation.isPending} 
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    {closeCashierMutation.isPending ? "Encerrando..." : "Confirmar Fechamento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
