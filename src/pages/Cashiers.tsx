import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { 
  CreditCard, 
  Plus, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  TrendingUp,
  TrendingDown,
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
          company_id: user?.company_id,
        });
      } else {
        return api.post("cashiers", {
          ...data,
          company_id: user?.company_id,
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

  const closeCashierMutation = useMutation({
    mutationFn: (id: string) => api.put("cashiers", id, {
      status: "Fechado",
      closed_at: new Date().toISOString(),
      closed_by: user?.full_name || "Sistema"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success("Caixa fechado!");
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
            {showGlobalBalance ? `R$ ${cashiers.reduce((acc: number, c: any) => acc + (c.balance || 0), 0).toLocaleString()}` : "R$ ••••••"}
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
                  {showBalance[c.id] ? `R$ ${c.balance?.toLocaleString()}` : "R$ ••••••"}
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
                  onClick={() => closeCashierMutation.mutate(c.id)}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpeningModalOpen(false)} />
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl space-y-6 max-w-sm w-full">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryCashier(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <History className="text-blue-600" size={24} />
                  Histórico do Caixa
                </h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">{historyCashier.name}</p>
              </div>
              <button onClick={() => setHistoryCashier(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                
                {/* Fechamento Block (Top, newest) */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ${historyCashier.closed_at ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Lock size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-gray-900">Fechamento</div>
                      <time className="text-xs font-bold text-gray-500 uppercase">{historyCashier.closed_at ? formatBR(historyCashier.closed_at, "dd/MM/yyyy HH:mm") : "---"}</time>
                    </div>
                    <div className="text-sm text-gray-600">
                      {historyCashier.closed_at ? (
                        <>Fechado por <span className="font-bold text-gray-900">{historyCashier.closed_by || "Sistema"}</span></>
                      ) : (
                        <span className="text-green-600 font-medium">Caixa em andamento...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Abertura Block (Bottom, oldest) */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ${historyCashier.opened_at ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Unlock size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-gray-900">Abertura</div>
                      <time className="text-xs font-bold text-gray-500 uppercase">{historyCashier.opened_at ? formatBR(historyCashier.opened_at, "dd/MM/yyyy HH:mm") : "---"}</time>
                    </div>
                    <div className="text-sm text-gray-600">
                      {historyCashier.opened_at ? (
                        <>Aberto por <span className="font-bold text-gray-900">{historyCashier.opened_by || "Sistema"}</span></>
                      ) : (
                        <span>Sem registro de abertura</span>
                      )}
                    </div>
                    {historyCashier.opening_balance !== undefined && (
                      <div className="text-[13px] font-bold text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg inline-block">
                        Saldo Inicial: R$ {Number(historyCashier.opening_balance).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
