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
  Pencil,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Warehouse,
  Building2,
  ChevronDown
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
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");

  const isMaster = user?.role === 'master';
  const isAdminOrMaster = user?.role === 'admin' || isMaster;
  const canView = hasPermission('inventory.manage') || isAdminOrMaster;

  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [purchaseToCancel, setPurchaseToCancel] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId() || user?.company_id;

  const { data: companies = [] } = useQuery({ 
    queryKey: ["companies", "all"], 
    queryFn: () => api.get("companies", { _all: true }).then(r => Array.isArray(r) ? r : []),
    enabled: isMaster
  });

  const companiesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(companies)) {
      companies.forEach((c: any) => {
        if (c.id) map.set(c.id, c);
      });
    }
    return map;
  }, [companies]);

  const { data: company } = useQuery({ 
    queryKey: ["company", currentCompanyId], 
    queryFn: () => api.get(`companies/${currentCompanyId}`),
    enabled: !!currentCompanyId
  });

  const { data: purchasesData = [], isLoading } = useQuery({ 
    queryKey: ["purchases", isMaster ? selectedCompanyFilter : currentCompanyId], 
    queryFn: () => {
      if (isMaster) {
        if (selectedCompanyFilter === "all") {
          return api.get("purchases", { _all: true, _orderBy: "purchase_date", _orderDir: "desc" });
        } else {
          return api.get("purchases", { company_id: selectedCompanyFilter, _orderBy: "purchase_date", _orderDir: "desc" });
        }
      }
      return api.get("purchases", { _orderBy: "purchase_date", _orderDir: "desc" });
    },
    enabled: !!user
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ["products", isMaster ? selectedCompanyFilter : currentCompanyId],
    queryFn: () => {
      if (isMaster) {
        if (selectedCompanyFilter === "all") {
          return api.get("products", { _all: true });
        } else {
          return api.get("products", { company_id: selectedCompanyFilter });
        }
      }
      return api.get("products", currentCompanyId ? { company_id: currentCompanyId } : {});
    },
    enabled: !!user
  });

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    productsData.forEach((p: any) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [productsData]);

  const getProductLoc = (item: any): string => {
    if (item.storage_location) return item.storage_location;
    const prod = item.id ? productMap.get(item.id) : null;
    if (prod?.storage_location) return prod.storage_location;
    if (prod?.storage_code) return prod.storage_code;
    const parts = [item.storage_room || prod?.storage_room, item.storage_rack || prod?.storage_rack, item.storage_shelf || prod?.storage_shelf].filter(Boolean);
    if (parts.length > 0) {
      return parts.join("-");
    }
    return "";
  };

  const filteredPurchases = useMemo(() => {
    return purchasesData.filter((p: any) => {
      const matchesSearch = 
        p.purchase_number?.includes(searchTerm) ||
        p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (isMaster && companiesMap.get(p.company_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [purchasesData, searchTerm, isMaster, companiesMap]);

  const purchaseExportHeaders = {
    purchase_number: "Nº Compra",
    ...(isMaster ? { company_name: "Empresa" } : {}),
    supplier_name: "Fornecedor",
    total: "Total",
    payment_method: "Pagamento",
    status: "Status",
    purchase_date: "Data"
  };

  const exportData = useMemo(() => {
    if (!isMaster) return filteredPurchases;
    return filteredPurchases.map((p: any) => ({
      ...p,
      company_name: companiesMap.get(p.company_id)?.name || p.company_name || "N/A"
    }));
  }, [filteredPurchases, isMaster, companiesMap]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ supplier_name: "", status: "", payment_status: "" });

  const cancelPurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      let dbPurchase = purchasesData.find((p: any) => p.id === id);
      if (!dbPurchase) {
        dbPurchase = await api.get(`purchases/${id}`);
      }
      if (dbPurchase && dbPurchase.status !== "Cancelada") {
         const { reversePurchasePayment } = await import("../lib/finance");
         const { inventory } = await import("../lib/inventory");
         
         // 1. Revert financial payment/entries
         try {
           await reversePurchasePayment(dbPurchase);
         } catch (err: any) {
           console.warn("Aviso ao estornar pagamento:", err?.message || err);
         }
         
         // 2. Revert inventory stock
         try {
           await inventory.reversePurchaseStock(dbPurchase, user);
         } catch (err: any) {
           console.warn("Aviso ao estornar estoque:", err?.message || err);
         }
         
         // 3. Update associated accounts payable
         try {
           const { collection, query, where, getDocs, updateDoc, doc } = await import("firebase/firestore");
           const { db } = await import("../lib/firebase");
           const payablesQuery = query(collection(db, "accountsPayable"), where("purchase_id", "==", id));
           const payablesSnap = await getDocs(payablesQuery);
           for (const payableDoc of payablesSnap.docs) {
             await updateDoc(doc(db, "accountsPayable", payableDoc.id), { status: "Cancelado" });
           }
         } catch (payablesErr) {
           console.error("Erro ao cancelar contas a pagar vinculadas:", payablesErr);
         }

         // 4. Mark purchase as Cancelada
         await api.put("purchases", id, { status: "Cancelada" });

         // 5. Audit log
         if (api.log) {
           await api.log({
             action: "UPDATE",
             description: `Cancelamento da compra #${id.substring(0, 8).toUpperCase()}`,
             entity: "purchases",
             entity_id: id,
             company_id: dbPurchase.company_id
           }, user);
         }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Compra cancelada e estoque estornado com sucesso!");
      setIsDetailsModalOpen(false);
      setIsCancelModalOpen(false);
      setPurchaseToCancel(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao cancelar compra.");
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      let dbPurchase = purchasesData.find((p: any) => p.id === id);
      if (!dbPurchase) {
        try {
          dbPurchase = await api.get(`purchases/${id}`);
        } catch {
          // ignore
        }
      }
      if (dbPurchase && dbPurchase.status !== "Cancelada") {
         const { reversePurchasePayment } = await import("../lib/finance");
         const { inventory } = await import("../lib/inventory");
         try {
           await reversePurchasePayment(dbPurchase);
         } catch (err: any) {
           console.warn("Aviso ao estornar pagamento na exclusão:", err?.message || err);
         }
         try {
           await inventory.reversePurchaseStock(dbPurchase, user);
         } catch (err: any) {
           console.warn("Aviso ao estornar estoque na exclusão:", err?.message || err);
         }
      }

      // Cancel or clean up associated accounts payable
      try {
        const { collection, query, where, getDocs, updateDoc, doc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        const payablesQuery = query(collection(db, "accountsPayable"), where("purchase_id", "==", id));
        const payablesSnap = await getDocs(payablesQuery);
        for (const payableDoc of payablesSnap.docs) {
          await updateDoc(doc(db, "accountsPayable", payableDoc.id), { status: "Cancelado" });
        }
      } catch (payablesErr) {
        console.error("Erro ao cancelar contas a pagar na exclusão da compra:", payablesErr);
      }

      // Audit log before deleting
      if (api.log && dbPurchase) {
        try {
          await api.log({
            action: "DELETE",
            description: `Exclusão da compra #${id.substring(0, 8).toUpperCase()}`,
            entity: "purchases",
            entity_id: id,
            company_id: dbPurchase.company_id
          }, user);
        } catch {
          // ignore log failure
        }
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
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir compra.");
    }
  });

  const editPurchaseMutation = useMutation({
    mutationFn: (data: { id: string, updates: any }) => api.put("purchases", data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Compra atualizada com sucesso!");
      setIsEditModalOpen(false);
      setPurchaseToEdit(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar compra.");
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
      supplier_name: purchase.supplier_name || "",
      status: purchase.status || "Concluída",
      payment_status: purchase.payment_status || "Pendente"
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
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto items-stretch">
          <ExportButton 
            data={exportData} 
            filename="historico-compras" 
            format="xlsx" 
            headers={purchaseExportHeaders} 
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
            data={exportData} 
            filename="historico-compras" 
            format="pdf" 
            title="Histórico de Compras"
            headers={purchaseExportHeaders} 
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
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={isMaster ? "Buscar por número, fornecedor ou empresa..." : "Buscar por número ou fornecedor..."} 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isMaster && (
            <div className="flex items-center gap-2 min-w-[240px]">
              <div className="relative w-full">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">Todas as Empresas ({companies.length})</option>
                  {companies.map((comp: any) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name || comp.trade_name || comp.fantasy_name || comp.razao_social || "Empresa sem nome"}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="pb-4 font-medium">Número</th>
                {isMaster && <th className="pb-4 font-medium">Empresa</th>}
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
                  <td colSpan={isMaster ? 7 : 6} className="py-8 text-center text-gray-500">Carregando histórico...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={isMaster ? 7 : 6} className="py-8 text-center text-gray-500">Nenhuma compra encontrada.</td>
                </tr>
              ) : filteredPurchases.map((p: any) => {
                const targetCompany = companiesMap.get(p.company_id) || company;
                const companyName = targetCompany?.name || p.company_name || "N/A";

                return (
                  <tr key={p.id} className="text-sm group hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">#{p.purchase_number || "001"}</td>
                    {isMaster && (
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 size={12} className="text-slate-500" />
                          {companyName}
                        </span>
                      </td>
                    )}
                    <td className="py-4 text-gray-600">{p.supplier_name || "Sem fornecedor"}</td>
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
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <button 
                          onClick={() => {
                             if (targetCompany) {
                               printPurchaseReceipt(p, targetCompany);
                             } else {
                               toast.error("Dados da empresa não encontrados.");
                             }
                          }}
                          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Imprimir Comprovante"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={() => { setSelectedPurchase(p); setIsDetailsModalOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {isAdminOrMaster && (
                          <button 
                            onClick={() => handleEditClick(p)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Compra"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {p.status !== "Cancelada" && isAdminOrMaster && (
                          <button 
                            onClick={() => handleCancelClick(p.id)}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar Compra"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        {isAdminOrMaster && (
                          <button 
                            onClick={() => handleDeleteClick(p.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Compra"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes da Compra</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">#{selectedPurchase.purchase_number}</p>
                    {isMaster && (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        {companiesMap.get(selectedPurchase.company_id)?.name || "Empresa"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fornecedor</p>
                  <p className="font-bold text-gray-900">{selectedPurchase.supplier_name || "N/A"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data da Compra</p>
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {selectedPurchase.purchase_date ? new Date(selectedPurchase.purchase_date).toLocaleString() : "-"}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status do Pagamento</p>
                  <p className="font-bold text-gray-900">{selectedPurchase.payment_status || "-"}</p>
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
                      {selectedPurchase.items?.map((item: any, i: number) => {
                        const loc = getProductLoc(item);
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              <div className="flex flex-col">
                                <span className="truncate">{item.name}</span>
                                {loc && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5 w-fit mt-0.5">
                                    <Warehouse size={10} className="text-emerald-600" />
                                    {loc}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.cost || 0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency((item.cost || 0) * (item.quantity || 0))}</td>
                          </tr>
                        );
                      })}
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
                onClick={() => printPurchaseReceipt(selectedPurchase, companiesMap.get(selectedPurchase.company_id) || company)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center gap-2"
              >
                <Printer size={18} /> Imprimir
              </button>
              {isAdminOrMaster && (
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); handleEditClick(selectedPurchase); }}
                  className="px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <Pencil size={18} /> Editar
                </button>
              )}
              {selectedPurchase.status !== "Cancelada" && isAdminOrMaster && (
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); handleCancelClick(selectedPurchase.id); }}
                  className="px-6 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors"
                >
                  <XCircle size={18} /> Cancelar Compra
                </button>
              )}
              {isAdminOrMaster && (
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
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
        message="Tem certeza que deseja cancelar esta compra? O estoque dos itens comprados e o lançamento financeiro/caixa serão estornados automaticamente."
        confirmText="Sim, Cancelar"
        isLoading={cancelPurchaseMutation.isPending}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => purchaseToDelete && deletePurchaseMutation.mutate(purchaseToDelete)}
        title="Excluir Compra"
        message="Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta compra do histórico? O estoque e o lançamento financeiro/caixa serão estornados automaticamente caso a compra não esteja cancelada."
        confirmText="Sim, Excluir"
        isLoading={deletePurchaseMutation.isPending}
      />
    </div>
  );
}

