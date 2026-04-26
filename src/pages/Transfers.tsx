import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  Building2,
  Eye,
  User,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { processMovement } from "../lib/finance";
import { formatCurrency } from "../lib/currencyUtils";

export default function Transfers() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission('finance.manage');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState("Transferência");
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: movements = [], isLoading } = useQuery({ 
    queryKey: ["movements", user?.company_id], 
    queryFn: () => api.get("movements", { company_id: user?.company_id }) 
  });

  const { data: bankAccounts = [] } = useQuery({ 
    queryKey: ["bankAccounts", user?.company_id], 
    queryFn: () => api.get("bankAccounts", { company_id: user?.company_id }) 
  });
  const { data: cashiers = [] } = useQuery({ 
    queryKey: ["cashiers", user?.company_id], 
    queryFn: () => api.get("cashiers", { company_id: user?.company_id }) 
  });

  const allAccounts = useMemo(() => [
    ...bankAccounts.map((a: any) => ({ ...a, account_type: "Banco" })),
    ...cashiers.map((c: any) => ({ ...c, account_type: "Caixa" }))
  ], [bankAccounts, cashiers]);

  const createMutation = useMutation({
    mutationFn: (data: any) => processMovement({
      ...data,
      company_id: user?.company_id,
      user_id: user?.id,
      user_name: user?.full_name || user?.email || "Sistema",
      amount: parseFloat(data.amount as string)
    }),
    onSuccess: (data) => {
      api.log({
        action: 'CREATE',
        entity: 'movements',
        entity_id: data.id,
        description: `Registrou nova movimentação: ${data.type} de R$ ${data.amount}`,
        metadata: data
      });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success("Movimentação realizada!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating movement:", error);
      toast.error("Erro ao salvar movimentação. Verifique as permissões.");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (data.type === "Transferência") {
      if (!data.from_account_id || !data.to_account_id) {
        toast.error("Selecione as contas de origem e destino para transferência.");
        return;
      }
      if (data.from_account_id === data.to_account_id) {
        toast.error("As contas de origem e destino devem ser diferentes.");
        return;
      }
    } else if (data.type === "Entrada") {
      if (!data.to_account_id) {
        toast.error("Selecione a conta de destino.");
        return;
      }
    } else if (data.type === "Saída") {
      if (!data.from_account_id) {
        toast.error("Selecione a conta de origem.");
        return;
      }
    }

    const fromAccountType = data.from_account_id?.toString().split(':')[0];
    const fromAccountId = data.from_account_id?.toString().split(':')[1];
    
    const toAccountType = data.to_account_id?.toString().split(':')[0];
    const toAccountId = data.to_account_id?.toString().split(':')[1];

    const fromAccount = [...bankAccounts, ...cashiers].find(a => a.id === fromAccountId);
    const toAccount = [...bankAccounts, ...cashiers].find(a => a.id === toAccountId);

    createMutation.mutate({
      ...data,
      from_account_id: fromAccountId || null,
      from_account_type: fromAccountType || null,
      from_account_name: fromAccount?.name || null,
      to_account_id: toAccountId || null,
      to_account_type: toAccountType || null,
      to_account_name: toAccount?.name || null
    });
  };

  const filteredMovements = movements.filter((m: any) => 
    m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.from_account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.to_account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a: any, b: any) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar as transferências. 
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
          <h1 className="text-2xl font-bold text-gray-900">Transferências</h1>
          <p className="text-gray-500">Movimentações entre contas e caixas.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            Nova Movimentação
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Carregando movimentações...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhuma movimentação registrada.
          </div>
        ) : filteredMovements.map((m: any) => (
          <div key={m.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                m.type === "Entrada" ? "bg-green-50 text-green-600" : 
                m.type === "Saída" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              }`}>
                {m.type === "Entrada" ? <ArrowDownLeft size={24} /> : 
                 m.type === "Saída" ? <ArrowUpRight size={24} /> : <ArrowRightLeft size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{m.description || "Sem descrição"}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(m.movement_date).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} /> {m.from_account_name || "---"} → {m.to_account_name || "---"}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  m.type === "Entrada" ? "text-green-600" : 
                  m.type === "Saída" ? "text-red-600" : "text-blue-600"
                }`}>
                  {m.type === "Saída" ? "-" : "+"} {formatCurrency(m.amount || 0)}
                </p>
                <span className="text-[10px] font-bold uppercase text-gray-400">{m.type}</span>
              </div>
              <button 
                onClick={() => { setSelectedMovement(m); setIsDetailsModalOpen(true); }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Movimentação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Nova Movimentação</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo *</label>
                <select 
                  name="type" 
                  required 
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Transferência">Transferência</option>
                  <option value="Entrada">Entrada</option>
                  <option value="Saída">Saída</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição</label>
                <input name="description" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor (R$) *</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`space-y-2 ${movementType === "Entrada" ? "opacity-50 pointer-events-none" : ""}`}>
                  <label className="text-sm font-bold text-gray-700">Conta Origem</label>
                  <select 
                    name="from_account_id" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required={movementType === "Saída" || movementType === "Transferência"}
                  >
                    <option value="">Nenhuma</option>
                    {allAccounts.map(a => <option key={a.id} value={`${a.account_type}:${a.id}`}>{a.name} ({a.account_type})</option>)}
                  </select>
                </div>
                <div className={`space-y-2 ${movementType === "Saída" ? "opacity-50 pointer-events-none" : ""}`}>
                  <label className="text-sm font-bold text-gray-700">Conta Destino</label>
                  <select 
                    name="to_account_id" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required={movementType === "Entrada" || movementType === "Transferência"}
                  >
                    <option value="">Nenhuma</option>
                    {allAccounts.map(a => <option key={a.id} value={`${a.account_type}:${a.id}`}>{a.name} ({a.account_type})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  {createMutation.isPending ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {isDetailsModalOpen && selectedMovement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Detalhes da Movimentação</h2>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Tipo</p>
                  <p className={`font-bold ${
                    selectedMovement.type === "Entrada" ? "text-green-600" : 
                    selectedMovement.type === "Saída" ? "text-red-600" : "text-blue-600"
                  }`}>{selectedMovement.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Valor</p>
                  <p className="font-bold text-gray-900">{formatCurrency(selectedMovement.amount || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Data/Hora</p>
                  <p className="text-sm font-medium text-gray-700">{new Date(selectedMovement.movement_date).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Usuário</p>
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <User size={14} className="text-gray-400" />
                    {selectedMovement.user_name || "Sistema"}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Descrição</p>
                <p className="text-sm font-medium text-gray-700">{selectedMovement.description || "Sem descrição"}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Origem</p>
                  <p className="text-sm font-bold text-gray-700">{selectedMovement.from_account_name || "---"}</p>
                </div>
                <ArrowRightLeft size={20} className="text-gray-300 mx-4" />
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Destino</p>
                  <p className="text-sm font-bold text-gray-700">{selectedMovement.to_account_name || "---"}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsDetailsModalOpen(false)} className="px-8 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
