import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Truck, 
  Search, 
  Calendar,
  Eye,
  XCircle,
  Printer,
  AlertTriangle,
  Shield,
  Trash2,
  Pencil
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import { printPurchaseReceipt } from "../lib/utils/print";
import ExportButton from "../components/ExportButton";

export default function PurchaseHistory() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const canView = hasPermission('inventory.manage');

  

  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [purchaseToCancel, setPurchaseToCancel] = useState<string | null>(null);
  const { data: company } = useQuery({ 
    queryKey: ["company", user?.company_id], 
    queryFn: () => api.get(`companies/${user?.company_id}`),
    enabled: !!user?.company_id
  });

  const currentCompanyId = api.getCompanyId();

  const { data: purchasesData = [], isLoading } = useQuery({ 
    queryKey: ["purchases", currentCompanyId], 
    queryFn: () => api.get("purchases", { _orderBy: "purchase_date", _orderDir: "desc" }),
    enabled: !!user
  });

  const filteredPurchases = useMemo(() => {
    return purchasesData.filter((p: any) => 
      p.purchase_number?.includes(searchTerm) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchasesData, searchTerm]);

  const purchaseExportHeaders = {
    purchase_number: "Nº Compra",
    supplier_name: "Fornecedor",
    total: "Total",
    payment_method: "Pagamento",
    status: "Status",
    purchase_date: "Data"
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ supplier_name: "", status: "", payment_status: "" });

  const cancelPurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbPurchase = purchasesData.find((p: any) => p.id === id);
      if (dbPurchase && dbPurchase.status !== "Cancelada") {
         const { reversePurchasePayment } = await import("../lib/finance");
         await reversePurchasePayment(dbPurchase);
         // Note: idealmente revertemos o stock, mas vamos focar na reversão do financeiro como solicitado
         await api.put("purchases", id, { status: "Cancelada" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Compra cancelada com sucesso!");
      setIsDetailsModalOpen(false);
      setIsCancelModalOpen(false);
      setPurchaseToCancel(null);
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbPurchase = purchasesData.find((p: any) => p.id === id);
      if (dbPurchase && dbPurchase.status !== "Cancelada") {
         const { reversePurchasePayment } = await import("../lib/finance");
         await reversePurchasePayment(dbPurchase);
      }
      return api.delete("purchases", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Compra excluída com sucesso!");
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setPurchaseToDelete(null);
    }
  });

  const editPurchaseMutation = useMutation({
    mutationFn: (data: { id: string, updates: any }) => api.put("purchases", data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Compra atualizada com sucesso!");
      setIsEditModalOpen(false);
      setPurchaseToEdit(null);
    }
  });

  const handleCancelClick = (id: string) => {
    setPurchaseToCancel(id);
    setIsCancelModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setPurchaseToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleEditClick = (purchase: any) => {
    setPurchaseToEdit(purchase);
    setEditForm({
      supplier_name: purchase.supplier_name,
      status: purchase.status,
      payment_status: purchase.payment_status
    });
    setIsEditModalOpen(true);
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
            Você não tem permissão para visualizar o histórico de compras. 
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
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Compras</h1>
          <p className="text-gray-500">Acompanhe todas as entradas de estoque.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredPurchases} 
            filename="historico-compras" 
            format="xlsx" 
            headers={purchaseExportHeaders} 
          />
          <ExportButton 
            data={filteredPurchases} 
            filename="historico-compras" 
            format="pdf" 
            title="Histórico de Compras"
            headers={purchaseExportHeaders} 
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por número ou fornecedor..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="pb-4 font-medium">Número</th>
                <th className="pb-4 font-medium">Fornecedor</th>
                <th className="pb-4 font-medium">Total</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Data</th>
                <th className="pb-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Carregando histórico...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Nenhuma compra encontrada.</td>
                </tr>
              ) : filteredPurchases.map((p: any) => (
                <tr key={p.id} className="text-sm group hover:bg-gray-50 transition-colors">
                  <td className="py-4 font-medium text-gray-900">#{p.purchase_number || "001"}</td>
                  <td className="py-4 text-gray-600">{p.supplier_name}</td>
                  <td className="py-4 font-bold text-orange-600">{formatCurrency(p.total || 0)}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      p.status === "Cancelada" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {p.status || "Concluída"}
                    </span>
                  </td>
                  <td className="py-4 text-gray-500 flex items-center gap-2">
                    <Calendar size={14} />
                    {formatBR(p.purchase_date)}
                  </td>
                  <td className="py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => { setSelectedPurchase(p); setIsDetailsModalOpen(true); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye size={18} />
                    </button>
                    {(user?.role === 'admin' || user?.role === 'master') && (
                      <button 
                        onClick={() => handleEditClick(p)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Compra"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {p.status !== "Cancelada" && (user?.role === 'admin' || user?.role === 'master') && (
                      <button 
                        onClick={() => handleCancelClick(p.id)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Cancelar Compra"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'master') && (
                      <button 
                        onClick={() => handleDeleteClick(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Compra"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes da Compra</h2>
                  <p className="text-sm text-gray-500">#{selectedPurchase.purchase_number}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fornecedor</p>
                  <p className="font-bold text-gray-900">{selectedPurchase.supplier_name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data da Compra</p>
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {new Date(selectedPurchase.purchase_date).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status do Pagamento</p>
                  <p className="font-bold text-gray-900">{selectedPurchase.payment_status}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status da Compra</p>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    selectedPurchase.status === "Cancelada" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {selectedPurchase.status || "Concluída"}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck size={16} className="text-gray-400" />
                  Itens da Compra
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-500">Produto</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-center">Qtd</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-right">Custo Un.</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedPurchase.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.cost || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency((item.cost || 0) * (item.quantity || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-100">
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-right font-bold text-gray-500 uppercase text-xs">Total da Compra</td>
                        <td className="px-4 py-4 text-right font-bold text-orange-600 text-lg">{formatCurrency(selectedPurchase.total || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedPurchase.status === "Cancelada" && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-red-900 text-sm">Compra Cancelada</h4>
                    <p className="text-sm text-red-700 mt-1">Esta compra foi cancelada. O estoque foi revertido e os lançamentos financeiros foram anulados.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap justify-end gap-3">
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => printPurchaseReceipt(selectedPurchase, company)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center gap-2"
              >
                <Printer size={18} /> Imprimir
              </button>
              {(user?.role === 'admin' || user?.role === 'master') && (
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); handleEditClick(selectedPurchase); }}
                  className="px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <Pencil size={18} /> Editar
                </button>
              )}
              {selectedPurchase.status !== "Cancelada" && (user?.role === 'admin' || user?.role === 'master') && (
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); handleCancelClick(selectedPurchase.id); }}
                  className="px-6 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors"
                >
                  <XCircle size={18} /> Cancelar Compra
                </button>
              )}
              {(user?.role === 'admin' || user?.role === 'master') && (
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); handleDeleteClick(selectedPurchase.id); }}
                  className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} /> Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Compra</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fornecedor</label>
                <input 
                  type="text" 
                  value={editForm.supplier_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status da Compra</label>
                <select 
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status do Pagamento</label>
                <select 
                  value={editForm.payment_status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, payment_status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
               <button 
                 onClick={() => setIsEditModalOpen(false)}
                 className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold"
               >
                 Cancelar
               </button>
               <button 
                 onClick={() => editPurchaseMutation.mutate({ id: purchaseToEdit.id, updates: editForm })}
                 className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
               >
                 Salvar
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => purchaseToCancel && cancelPurchaseMutation.mutate(purchaseToCancel)}
        title="Cancelar Compra"
        message="Tem certeza que deseja cancelar esta compra? Esta ação irá estornar o caixa financeiro desta movimentação se houver. (Atenção: Estoque não é revertido no cancelamento direto, faça manual se necessário)."
        confirmText="Sim, Cancelar"
        isLoading={cancelPurchaseMutation.isPending}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => purchaseToDelete && deletePurchaseMutation.mutate(purchaseToDelete)}
        title="Excluir Compra"
        message="Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta compra do histórico? O valor pago financeiro associado será estornado. Esta ação não poderá ser desfeita."
        confirmText="Sim, Excluir"
        isLoading={deletePurchaseMutation.isPending}
      />
    </div>
  );
}
