import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { inventory } from "../lib/inventory";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertCircle,
  Save,
  Search,
  Plus,
  Minus,
  Info,
  Warehouse,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import StockMapPowerBI from "../components/Inventory/StockMapPowerBI";

const getProductLocation = (p: any): string => {
  if (!p) return "";
  if (p.storage_location) return p.storage_location;
  if (p.storage_code) return p.storage_code;
  const parts = [p.storage_room, p.storage_rack, p.storage_shelf].filter(Boolean);
  if (parts.length > 0) {
    if (p.storage_room && p.storage_rack && p.storage_shelf) return `${p.storage_room}-${p.storage_rack}/${p.storage_shelf}`;
    return parts.join("-");
  }
  return "";
};

export default function InventoryAdjustments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'SIMPLE' | 'TRANSFER' | 'MAP'>('SIMPLE');

  const paramProductId = searchParams.get("productId") || "";
  const [selectedProductId, setSelectedProductId] = useState(paramProductId);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('MANUAL');
  const [observation, setObservation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [destCompanyId, setDestCompanyId] = useState("");

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", currentCompanyId],
    queryFn: () => api.get("products"),
  });

  const selectedProduct = useMemo(() => {
    const targetId = selectedProductId || paramProductId;
    return products.find((p: any) => p.id === targetId);
  }, [products, selectedProductId, paramProductId]);
  
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.get("companies"),
    enabled: user?.role === 'master' || user?.role === 'admin',
  });

  const filteredProducts = products.filter((p: any) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const loc = getProductLocation(p).toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term) ||
      loc.includes(term)
    );
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (!navigator.onLine) {
        const { offlineStore } = await import("../lib/offlineStore");
        await offlineStore.saveInventoryMovement(data, user);
        return { isOffline: true };
      }
      return inventory.recordMovement(data);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      if (res?.isOffline) {
        toast.info("Ajuste de estoque salvo offline! Será sincronizado ao reconectar.");
      } else {
        toast.success("Ajuste de estoque realizado com sucesso!");
      }
      // Reset form
      setSelectedProductId("");
      setQuantity(0);
      setReason("MANUAL");
      setObservation("");
      setSearchTerm("");
    },
    onError: async (error: any, data: any) => {
      console.warn("Falha no ajuste online, acionando offline fallback", error);
      if (!navigator.onLine || error.message?.includes('offline') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        const { offlineStore } = await import("../lib/offlineStore");
        await offlineStore.saveInventoryMovement(data, user);
        setSelectedProductId("");
        setQuantity(0);
        setReason("MANUAL");
        setObservation("");
        setSearchTerm("");
      } else {
        toast.error(`Erro ao realizar ajuste: ${error.message}`);
      }
    }
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => inventory.processTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast.success("Transferência inter-filial realizada com sucesso!");
      // Reset form
      setSelectedProductId("");
      setQuantity(0);
      setDestCompanyId("");
      setObservation("");
      setSearchTerm("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao realizar transferência: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }

    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }

    if (activeTab === 'TRANSFER') {
      if (!destCompanyId) {
        toast.error("Selecione a filial de destino");
        return;
      }
      transferMutation.mutate({
        sourceCompanyId: currentCompanyId,
        destCompanyId,
        productId: selectedProductId,
        sku: selectedProduct?.sku,
        quantity,
        observation
      });
      return;
    }

    mutation.mutate({
      product_id: selectedProductId,
      product_name: selectedProduct?.name,
      company_id: currentCompanyId,
      type,
      reason,
      quantity,
      observation
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Ajuste de Estoque</h1>
           <p className="text-gray-500">Realize correções manuais, transfira saldo entre filiais ou visualize o mapa físico de armazenagem.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl w-full sm:w-auto min-w-[320px] max-w-lg shadow-2xs">
           <button
             type="button"
             onClick={() => setActiveTab('SIMPLE')}
             className={`flex-1 py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
               activeTab === 'SIMPLE' 
               ? 'bg-white text-blue-600 shadow-md' 
               : 'text-gray-500 hover:bg-gray-200'
             }`}
           >
             Ajuste Simples
           </button>
           {(user?.role === 'master' || user?.role === 'admin') && (
             <button
               type="button"
               onClick={() => setActiveTab('TRANSFER')}
               className={`flex-1 py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                 activeTab === 'TRANSFER' 
                 ? 'bg-white text-blue-600 shadow-md' 
                 : 'text-gray-500 hover:bg-gray-200'
               }`}
             >
               Transferência
             </button>
           )}
           <button
             type="button"
             onClick={() => setActiveTab('MAP')}
             className={`flex-1 py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
               activeTab === 'MAP' 
               ? 'bg-white text-cyan-600 shadow-md border border-cyan-100' 
               : 'text-gray-500 hover:bg-gray-200'
             }`}
           >
             <Warehouse size={15} className="text-cyan-600" />
             Mapa de Estoque
           </button>
        </div>
      </div>

      {activeTab === 'MAP' ? (
        <StockMapPowerBI 
          products={products}
          onSelectProductForAdjustment={(productId) => {
            setSelectedProductId(productId);
            const prod = products.find((p: any) => p.id === productId);
            if (prod) setSearchTerm(prod.name);
            setActiveTab('SIMPLE');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            {/* Seleção de Produto */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">1. Selecione o Produto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou SKU..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 bg-white">
                {isLoadingProducts ? (
                  <div className="p-4 text-center text-gray-500">Carregando produtos...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Nenhum produto encontrado.</div>
                ) : filteredProducts.map((p: any) => {
                  const loc = getProductLocation(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setSearchTerm(p.name);
                      }}
                      className={`w-full text-left p-3.5 hover:bg-blue-50/80 transition-colors flex items-center justify-between cursor-pointer ${
                        selectedProductId === p.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-500 font-mono">SKU: {p.sku || "N/A"}</span>
                          {loc ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded text-[10px] font-bold flex items-center gap-1">
                              <Warehouse size={10} className="text-emerald-600" />
                              {loc}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Sem endereço</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-gray-900">{p.stock_quantity} un</p>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Em estoque</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'SIMPLE' && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700">2. Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType('IN')}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      type === 'IN' 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <ArrowUpCircle size={24} />
                    <span className="font-bold">Entrada (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('OUT')}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      type === 'OUT' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <ArrowDownCircle size={24} />
                    <span className="font-bold">Saída (-)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quantidade e Motivo/Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Quantidade</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500"
                    >
                      <Minus size={16} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {activeTab === 'SIMPLE' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Motivo</label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="MANUAL">Ajuste Manual</option>
                    <option value="QUEBRA">Quebra / Avaria</option>
                    <option value="PERDA">Perda / Roubo</option>
                    <option value="INVENTARIO">Inventário Periódico</option>
                    <option value="BONIFICACAO">Bonificação</option>
                    <option value="RETURN">Devolução de Cliente</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Filial de Destino</label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={destCompanyId}
                    onChange={(e) => setDestCompanyId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {companies.map((c: any) => (
                      c.id !== currentCompanyId && (
                        <option key={c.id} value={c.id}>{c.name} {c.cnpj ? `(${c.cnpj})` : ''}</option>
                      )
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Observação (Opcional)</label>
              <textarea 
                rows={3}
                placeholder={activeTab === 'TRANSFER' ? "Descreva os detalhes da transferência..." : "Descreva o motivo do ajuste..."}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || transferMutation.isPending}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
            >
              {mutation.isPending || transferMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={20} />
                  {activeTab === 'TRANSFER' ? 'Confirmar Transferência' : 'Confirmar Ajuste'}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {/* Storage Location Card */}
          {selectedProduct && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Warehouse size={16} className="text-emerald-600" />
                Localização Física no Estoque
              </h3>
              {getProductLocation(selectedProduct) ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Endereço Consolidado</p>
                    <p className="text-base font-black text-emerald-900 font-mono mt-0.5">
                      {getProductLocation(selectedProduct)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Sala / Setor</p>
                      <p className="font-bold text-gray-800 truncate mt-0.5">{selectedProduct.storage_room || "—"}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Armário / Estante</p>
                      <p className="font-bold text-gray-800 truncate mt-0.5">{selectedProduct.storage_rack || "—"}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Gaveta / Prateleira</p>
                      <p className="font-bold text-gray-800 truncate mt-0.5">{selectedProduct.storage_shelf || "—"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                  <HelpCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Sem endereço de estoque</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Cadastre sala, armário ou gaveta no catálogo de produtos para mapeamento físico.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info size={20} />
              Resumo da Operação
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-blue-500 pb-2">
                <span className="opacity-80">Produto:</span>
                <span className="font-bold">{selectedProduct?.name || "---"}</span>
              </div>
              <div className="flex justify-between border-b border-blue-500 pb-2">
                <span className="opacity-80">Estoque Atual:</span>
                <span className="font-bold">{selectedProduct?.stock_quantity || 0} un</span>
              </div>
              {activeTab === 'SIMPLE' ? (
                <>
                  <div className="flex justify-between border-b border-blue-500 pb-2">
                    <span className="opacity-80">Alteração:</span>
                    <span className={`font-bold ${type === 'IN' ? 'text-green-300' : 'text-red-300'}`}>
                      {type === 'IN' ? '+' : '-'}{quantity || 0} un
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="opacity-80">Novo Estoque:</span>
                    <span className="text-xl font-black">
                      {(selectedProduct?.stock_quantity || 0) + (type === 'IN' ? (quantity || 0) : -(quantity || 0))} un
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between border-b border-blue-500 pb-2">
                    <span className="opacity-80">Saída Transferência:</span>
                    <span className="font-bold text-red-300">
                      -{quantity || 0} un
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="opacity-80">Estoque Restante:</span>
                    <span className="text-xl font-black">
                      {Math.max(0, (selectedProduct?.stock_quantity || 0) - (quantity || 0))} un
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
            <div className="flex gap-3 text-amber-700">
              <AlertCircle className="shrink-0" size={24} />
              <div className="text-sm space-y-2">
                <p className="font-bold">Atenção!</p>
                <p>Esta operação é irreversível e será registrada no histórico de auditoria do sistema com seu usuário.</p>
                <p>Certifique-se de que os valores estão corretos antes de confirmar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
