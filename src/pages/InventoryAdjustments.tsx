import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { inventory } from "../lib/inventory";
import { 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertCircle,
  Save,
  Search,
  Plus,
  Minus,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function InventoryAdjustments() {
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('MANUAL');
  const [observation, setObservation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", currentCompanyId],
    queryFn: () => api.get("products"),
  });

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  const mutation = useMutation({
    mutationFn: (data: any) => inventory.recordMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast.success("Ajuste de estoque realizado com sucesso!");
      // Reset form
      setSelectedProductId("");
      setQuantity(0);
      setReason("MANUAL");
      setObservation("");
      setSearchTerm("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao realizar ajuste: ${error.message}`);
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajuste de Estoque</h1>
        <p className="text-gray-500">Realize correções manuais de saldo de produtos de forma rápida e segura.</p>
      </div>

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
              
              <div className="max-h-48 overflow-y-auto border border-gray-50 rounded-xl divide-y divide-gray-50">
                {isLoadingProducts ? (
                  <div className="p-4 text-center text-gray-500">Carregando produtos...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Nenhum produto encontrado.</div>
                ) : filteredProducts.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setSearchTerm(p.name);
                    }}
                    className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between ${selectedProductId === p.id ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div>
                      <p className="font-bold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">SKU: {p.sku || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{p.stock_quantity} un</p>
                      <p className="text-[10px] text-gray-400 uppercase">Em estoque</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Ajuste */}
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

            {/* Quantidade e Motivo */}
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
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Observação (Opcional)</label>
              <textarea 
                rows={3}
                placeholder="Descreva o motivo do ajuste..."
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
            >
              {mutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={20} />
                  Confirmar Ajuste
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info size={20} />
              Resumo do Ajuste
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
    </div>
  );
}
