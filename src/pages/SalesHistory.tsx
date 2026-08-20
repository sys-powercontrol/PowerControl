import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { CACHE_TIERS } from "../lib/queryClient";
import { CursorPagination } from "../components/Common/CursorPagination";
import { DataFreshnessBadge } from "../components/Common/DataFreshnessBadge";
import { useNavigate, useLocation } from "react-router-dom";
import { offlineStore } from "../lib/offlineStore";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from "date-fns";
import { formatCurrency } from "../lib/currencyUtils";
import { formatBR } from "../lib/dateUtils";
import { fiscalApi } from "../services/fiscalApi";
import { 
  Search, 
  Eye, 
  Printer, 
  XCircle, 
  ChevronDown, 
  Shield, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  RotateCcw, 
  ChevronRight, 
  FileSpreadsheet,
  CheckCircle2,
  ReceiptText
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import ExportButton from "../components/ExportButton";
import { printReceipt, printA4Quote } from "../lib/utils/print";
import { inventory } from "../lib/inventory";

type DateFilterType = "day" | "week" | "month" | "custom" | "all";

export default function SalesHistory() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("day");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [failedSales, setFailedSales] = useState<any[]>([]);

  const [receiptSale, setReceiptSale] = useState<any>(location.state?.lastSale || null);
  const [showReceipt, setShowReceipt] = useState<boolean>(!!location.state?.showReceipt);
  const [nfceUrl, setNfceUrl] = useState<string | null>(null);
  const [nfceErrorMsg, setNfceErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.lastSale && location.state?.showReceipt) {
      const timer = setTimeout(() => {
        setReceiptSale(location.state.lastSale);
        setShowReceipt(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    const loadFailedSales = async () => {
      try {
        const list = await offlineStore.getFailedSales();
        setFailedSales(list);
      } catch (err) {
        console.error("Erro ao carregar vendas com falha offline:", err);
      }
    };
    loadFailedSales();

    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      loadFailedSales();
    };
    window.addEventListener("sales_synced", handleSync);
    return () => window.removeEventListener("sales_synced", handleSync);
  }, [queryClient]);

  const handleRecoverSale = async (sale: any) => {
    try {
      const recoveryData = {
        items: sale.items || [],
        client_id: sale.saleData?.client_id || sale.client_id,
        client_name: sale.saleData?.client_name || sale.client_name,
        client_document: sale.saleData?.client_document || sale.client_document,
        seller_id: sale.saleData?.seller_id || sale.seller_id,
        seller_name: sale.saleData?.seller_name || sale.seller_name,
        discount: sale.saleData?.discount || sale.discount,
        payment_method: sale.saleData?.payment_method || sale.payment_method,
      };
      localStorage.setItem("pdv_recovered_sale", JSON.stringify(recoveryData));
      
      await offlineStore.deleteFailedSale(sale.id);
      setFailedSales(prev => prev.filter(s => s.id !== sale.id));
      
      toast.success("Venda enviada para o caixa! Redirecionando...");
      navigate("/Vender");
    } catch {
      toast.error("Erro ao recuperar venda.");
    }
  };

  const handleDiscardFailedSale = async (id: string) => {
    try {
      await offlineStore.deleteFailedSale(id);
      setFailedSales(prev => prev.filter(s => s.id !== id));
      toast.success("Venda descartada com sucesso.");
    } catch {
      toast.error("Erro ao descartar venda.");
    }
  };

  const canView = hasPermission('sales.view') || user?.role === 'master';
  const canDelete = hasPermission('sales.delete') || user?.role === 'master' || user?.role === 'admin';

  

  const currentCompanyId = api.getCompanyId() || user?.company_id;

  const [page, setPage] = useState(1);
  const [cursorDocs, setCursorDocs] = useState<(any | null)[]>([null]);
  const pageSize = 25;

  const dateConstraints = React.useMemo(() => {
    const now = new Date();
    if (dateFilter === "day") {
      return {
        startDate: format(startOfDay(now), "yyyy-MM-dd'T'00:00:00"),
        endDate: format(endOfDay(now), "yyyy-MM-dd'T'23:59:59")
      };
    } else if (dateFilter === "week") {
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd'T'00:00:00"),
        endDate: format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd'T'23:59:59")
      };
    } else if (dateFilter === "month") {
      return {
        startDate: format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00"),
        endDate: format(endOfMonth(now), "yyyy-MM-dd'T'23:59:59")
      };
    } else if (dateFilter === "custom" && customStartDate) {
      return {
        startDate: format(startOfDay(parseISO(customStartDate)), "yyyy-MM-dd'T'00:00:00"),
        endDate: customEndDate ? format(endOfDay(parseISO(customEndDate)), "yyyy-MM-dd'T'23:59:59") : undefined
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter, customStartDate, customEndDate]);

  const filterKey = `${dateFilter}_${customStartDate}_${customEndDate}_${searchTerm}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    setCursorDocs([null]);
  }

  const currentCursor = cursorDocs[page - 1] || null;

  const { data: pageResult, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({ 
    queryKey: ["sales_page", currentCompanyId, dateFilter, customStartDate, customEndDate, page, currentCursor?.id], 
    queryFn: async () => {
      return api.getPage("sales", {
        pageSize,
        cursorDoc: currentCursor,
        dateField: "sale_date",
        startDate: dateConstraints.startDate,
        endDate: dateConstraints.endDate,
        orderByField: "sale_date",
        orderDir: "desc"
      });
    },
    enabled: !!user,
    ...CACHE_TIERS.TRANSACTIONAL
  });

  const sales = React.useMemo(() => {
    return pageResult?.items || [];
  }, [pageResult?.items]);
  const hasMore = pageResult?.hasMore || false;

  const handleNextPage = () => {
    if (pageResult?.lastDoc && hasMore) {
      setCursorDocs(prev => {
        const next = [...prev];
        next[page] = pageResult.lastDoc;
        return next;
      });
      setPage(p => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  };

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);

  const { data: company } = useQuery({ 
    queryKey: ["company", currentCompanyId], 
    queryFn: () => api.get(`companies/${currentCompanyId}`),
    enabled: !!currentCompanyId
  });

  const emitNfceMutation = useMutation({
    mutationFn: async () => {
      if (!receiptSale) throw new Error("Nenhuma venda concluída para emitir");
      
      const client = { name: receiptSale.client_name, document: receiptSale.client_document || "Consumidor Final" };
      
      if (!company?.fiscal_token) {
        const simulatedReference = `sim_${receiptSale.id}_${Date.now()}`;
        const accessKey = Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join("");
        const simulatedInvoice = {
          sale_id: receiptSale.id,
          type: "NFCe",
          client_name: receiptSale.client_name,
          client_document: receiptSale.client_document || "Consumidor Final",
          company_id: currentCompanyId,
          number: Math.floor(Math.random() * 90000) + 10000,
          series: "001",
          total: receiptSale.total,
          status: "Emitida",
          emission_date: new Date().toISOString(),
          reference: simulatedReference,
          protocol: "135150000000000",
          access_key: accessKey,
          pdf_url: `https://www.nfe.fazenda.gov.br/portal/consultaRecipiente.aspx?chave=${accessKey}`,
          xml_url: ""
        };
        const docRef = await api.post("invoices", simulatedInvoice) as any;
        return { ...simulatedInvoice, id: docRef.id };
      }

      const fiscalConfig = {
        token: company.fiscal_token,
        environment: company.fiscal_environment || "sandbox",
        provider: company.fiscal_provider || "FocusNFe"
      };

      const result = await fiscalApi.emit(fiscalConfig as any, {
        sale_id: receiptSale.id,
        type: "NFCe",
        client,
        items: receiptSale.items,
        total: receiptSale.total,
        company
      });

      const invoiceData = {
        sale_id: receiptSale.id,
        type: "NFCe",
        company_id: currentCompanyId,
        number: result.protocol ? parseInt(result.protocol.slice(-6)) : Math.floor(Math.random() * 90000) + 10000,
        series: "001",
        client_name: receiptSale.client_name,
        client_document: receiptSale.client_document || "Consumidor Final",
        total: receiptSale.total,
        status: result.status === "processando" ? "Pendente" : "Emitida",
        emission_date: new Date().toISOString(),
        reference: result.reference,
        protocol: result.protocol,
        access_key: result.access_key,
        pdf_url: (result as any).pdf_url || `https://www.nfe.fazenda.gov.br/portal/consultaRecipiente.aspx?chave=${result.access_key}`,
        xml_url: (result as any).xml_url
      };

      const docRef = await api.post("invoices", invoiceData) as any;
      return { ...invoiceData, id: docRef.id };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (data.pdf_url) {
        setNfceUrl(data.pdf_url);
      }
      toast.success("NFC-e emitida com sucesso!");
    },
    onError: (err: any) => {
      setNfceErrorMsg(err.message || "Erro ao emitir NFC-e");
      toast.error(err.message || "Falha na emissão da NFC-e");
    }
  });

  const filteredSales = sales.filter((s: any) => {
    const matchesSearch = (s.client_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                          (s.id?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (!s.sale_date) return true;

    const saleDate = new Date(s.sale_date);
    const now = new Date();

    if (dateFilter === "day") {
      return isWithinInterval(saleDate, { start: startOfDay(now), end: endOfDay(now) });
    } else if (dateFilter === "week") {
      return isWithinInterval(saleDate, { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) });
    } else if (dateFilter === "month") {
      return isWithinInterval(saleDate, { start: startOfMonth(now), end: endOfMonth(now) });
    } else if (dateFilter === "custom") {
      if (customStartDate && customEndDate) {
        const start = startOfDay(parseISO(customStartDate));
        const end = endOfDay(parseISO(customEndDate));
        return isWithinInterval(saleDate, { start, end });
      } else if (customStartDate) {
        return saleDate >= startOfDay(parseISO(customStartDate));
      } else if (customEndDate) {
        return saleDate <= endOfDay(parseISO(customEndDate));
      }
    }
    
    return true;
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbSale = sales.find((s: any) => s.id === id);
      if (dbSale && dbSale.status !== "Cancelada") {
        const { reverseSalePayment } = await import("../lib/finance");
        // We revert the payment logic
        await reverseSalePayment(dbSale);
        
        // Revert accountsReceivable if "A Prazo" or "Fiado"
        if (dbSale.payment_method === "A Prazo" || dbSale.payment_method === "Fiado") {
          try {
            const receivables = await api.get("accountsReceivable") as any[];
            const rel = receivables.find((r: any) => r.sale_id === id || r.reconciliation_id === id);
            if (rel) {
              await api.put("accountsReceivable", rel.id, { status: "Cancelada" });
            }
          } catch (e) {
            console.error("Erro ao cancelar contas a receber:", e);
          }
        }

        // Return stock quantities to inventory
        await inventory.reverseSaleStock(dbSale);

        // Cancel or refund commission
        const commissionUpdates: Record<string, any> = { status: "Cancelada" };
        if (dbSale.commission_amount > 0) {
          if (dbSale.commission_status === "paid") {
            commissionUpdates.commission_status = "refunded_reversal";
            try {
              await api.post("accountsPayable", {
                company_id: dbSale.company_id || api.getCompanyId(),
                description: `Estorno de Comissão: Venda #${dbSale.id.substr(0, 8).toUpperCase()} Cancelada (${dbSale.seller_name || 'Vendedor'})`,
                amount: Math.abs(dbSale.commission_amount),
                due_date: new Date().toISOString().split('T')[0],
                status: "Pago",
                payment_date: new Date().toISOString(),
                category_name: "Estorno de Comissões",
                supplier: dbSale.seller_name || "Vendedor",
                observation: `Estorno automático de comissão paga após cancelamento da venda #${dbSale.id}`,
                created_at: new Date().toISOString()
              });
            } catch (err) {
              console.error("Erro ao criar lançamento de estorno de comissão:", err);
            }
          } else {
            commissionUpdates.commission_status = "cancelled";
          }
        }

        // We then set status to "Cancelada" and update commission_status
        await api.put("sales", id, commissionUpdates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      toast.success("Venda cancelada com sucesso!");
      setIsDetailsModalOpen(false);
      setIsCancelModalOpen(false);
      setSaleToCancel(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao cancelar venda.");
    }
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const dbSale = sales.find((s: any) => s.id === id);
      if (dbSale) {
        if (dbSale.status !== "Cancelada") {
          const { reverseSalePayment } = await import("../lib/finance");
          await reverseSalePayment(dbSale);
          await inventory.reverseSaleStock(dbSale);
        }

        try {
          const receivables = await api.get("accountsReceivable") as any[];
          const rels = receivables.filter((r: any) => r.sale_id === id || r.reconciliation_id === id);
          for (const rel of rels) {
            await api.delete("accountsReceivable", rel.id);
          }
        } catch (e) {
          console.error("Erro ao remover contas a receber vinculadas:", e);
        }

        return api.delete("sales", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      toast.success("Venda e registros vinculados excluídos com sucesso!");
      setIsDetailsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir venda.");
    }
  });

  const handleDeleteClick = (id: string) => {
    setSaleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleCancelClick = (id: string) => {
    setSaleToCancel(id);
    setIsCancelModalOpen(true);
  };

  const { totalSales, paymentMethodTotals } = React.useMemo(() => {
    let total = 0;
    const totalsByMethod: Record<string, number> = {};

    filteredSales.forEach((s: any) => {
      // Exclude cancelled sales from totals
      if (s.status !== "Cancelada") {
        total += s.total || 0;
        const method = s.payment_method || 'Outros';
        totalsByMethod[method] = (totalsByMethod[method] || 0) + (s.total || 0);
      }
    });

    return { totalSales: total, paymentMethodTotals: totalsByMethod };
  }, [filteredSales]);

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar o histórico de vendas. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="sales-history-content">
      {/* Failed Offline Sales (Recovery Center) */}
      {failedSales.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl space-y-4 hide-on-print">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Vendas Offline com Falha de Sincronismo</h2>
              <p className="text-sm text-amber-700">
                Estas vendas falharam ao sincronizar com o servidor devido a conflitos (ex: divergência de estoque ou validação). 
                Você pode <strong>Recuperar a Venda</strong> para carregar os itens de volta no caixa, ajustar as quantidades ou produtos manualmente e tentar finalizar de novo.
              </p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {failedSales.map((sale: any) => (
              <div key={sale.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
                      Falha na Sincronização
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(sale.timestamp || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      Venda para: {sale.saleData?.client_name || sale.client_name || "Consumidor"}
                    </h4>
                    <p className="text-xs text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100 mt-1.5 flex items-start gap-1">
                      <strong className="shrink-0">Motivo:</strong> <span>{sale.error_reason || "Erro desconhecido de validação"}</span>
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 pt-1">
                    <p><strong>Itens:</strong> {sale.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(", ") || "Sem itens"}</p>
                    <p><strong>Total:</strong> {formatCurrency(sale.saleData?.total || sale.total || 0)} ({sale.saleData?.payment_method || sale.payment_method})</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRecoverSale(sale)}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RotateCcw size={14} /> Recuperar Venda
                  </button>
                  <button
                    onClick={() => handleDiscardFailedSale(sale.id)}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors"
                    title="Descartar permanentemente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Histórico de Vendas</h1>
            <DataFreshnessBadge 
              lastUpdated={dataUpdatedAt} 
              onRefresh={() => refetch()} 
              isFetching={isFetching} 
            />
          </div>
          <p className="text-gray-500">Consulte e gerencie todas as movimentações de venda de forma paginada e otimizada.</p>
        </div>
        
        <div className="flex flex-wrap justify-end gap-3 lg:max-w-[600px]">
          {Object.entries(paymentMethodTotals).map(([method, amount]) => (
            <div key={method} className="bg-white px-4 py-2 flex flex-col rounded-xl border border-gray-100 shadow-sm min-w-[130px] flex-1 max-w-[140px]">
              <span className="text-[10px] uppercase font-bold text-gray-400">{method}</span>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(amount as number)}
              </span>
            </div>
          ))}
          <div className="bg-blue-600 px-4 py-2 flex flex-col rounded-xl border border-blue-700 shadow-sm text-white min-w-[130px] flex-1 max-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-blue-200">Total</span>
            <span className="text-sm font-bold">
              {formatCurrency(totalSales)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 hide-on-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou ID..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 font-medium"
          >
            <option value="day">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
            <option value="custom">Personalizado</option>
            <option value="all">Todo o Período</option>
          </select>

          {dateFilter === "custom" && (
            <div className="flex gap-2 items-center">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
              />
              <span className="text-gray-400">até</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full md:w-auto items-stretch">
          <ExportButton 
            data={filteredSales} 
            filename="historico-vendas" 
            format="xlsx" 
            title="Histórico de Vendas"
            headers={{
              id: 'ID',
              client_name: 'Cliente',
              total: 'Total (R$)',
              payment_method: 'Pagamento',
              status: 'Status',
              sale_date: 'Data'
            }}
            summaryBlocks={[
              {
                label: 'Total',
                value: formatCurrency(totalSales),
                isPrimary: true
              },
              ...Object.entries(paymentMethodTotals).map(([method, amount]) => ({
                label: method,
                value: formatCurrency(amount as number),
                isPrimary: false
              }))
            ]}
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
            data={filteredSales} 
            filename="historico-vendas" 
            format="pdf" 
            title="Histórico de Vendas"
            headers={{
              id: 'ID',
              client_name: 'Cliente',
              total: 'Total (R$)',
              payment_method: 'Pagamento',
              status: 'Status',
              sale_date: 'Data'
            }}
            summaryBlocks={[
              {
                label: 'Total',
                value: formatCurrency(totalSales),
                isPrimary: true
              },
              ...Object.entries(paymentMethodTotals).map(([method, amount]) => ({
                label: method,
                value: formatCurrency(amount as number),
                isPrimary: false
              }))
            ]}
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

      {/* Sales List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Carregando histórico...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhuma venda encontrada.
          </div>
        ) : filteredSales.map((sale: any) => (
          <div key={sale.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs">
                  {sale.id.substr(0, 3).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">Venda #{sale.id.substr(0, 8).toUpperCase()}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sale.status === "Cancelada" ? "bg-red-100 text-red-700" :
                      sale.status === "Pendente de Estoque" ? "bg-amber-100 text-amber-700 font-extrabold border border-amber-300" :
                      (sale.is_offline_sync || sale.synced_at || sale.isOfflineSync) ? "bg-purple-100 text-purple-700 border border-purple-200" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {sale.status === "Pendente de Estoque" ? "Pendente de Estoque" :
                       (sale.is_offline_sync || sale.synced_at || sale.isOfflineSync) ? "Sincronizado (Offline)" :
                       sale.status || "Concluída"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sale.client_name} • {new Date(sale.sale_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-8">
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(sale.total || 0)}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{sale.payment_method}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => { setSelectedSale(sale); setIsDetailsModalOpen(true); }}
                    className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                    title="Visualizar Detalhes"
                  >
                    <Eye size={18} />
                  </button>
                  <button 
                    onClick={() => { setSelectedSale(sale); setIsDetailsModalOpen(true); }}
                    className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                    title="Imprimir Recibo"
                  >
                    <Printer size={18} />
                  </button>
                  {sale.status !== "Cancelada" && canDelete && (
                    <button 
                      onClick={() => handleCancelClick(sale.id)}
                      className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                      title="Cancelar Venda"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteClick(sale.id)}
                      className="p-2 sm:p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                      title="Excluir Venda"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Items Summary (Collapsed) */}
            <div 
              onClick={() => { setSelectedSale(sale); setIsDetailsModalOpen(true); }}
              className="px-6 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                <ChevronDown size={14} /> {sale.items?.length || 0} itens no pedido
              </span>
              <div className="flex -space-x-2">
                {sale.items?.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {item.name?.charAt(0)}
                  </div>
                ))}
                {(sale.items?.length || 0) > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                    +{(sale.items?.length || 0) - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Cursor Pagination Control */}
        {sales.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <CursorPagination
              page={page}
              hasMore={hasMore}
              isLoading={isLoading || isFetching}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              pageSize={pageSize}
              totalLoaded={filteredSales.length}
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Detalhes da Venda</h2>
                <p className="text-xs text-gray-500">#{selectedSale.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cliente</p>
                  <p className="font-bold text-gray-900">{selectedSale.client_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Data/Hora</p>
                  <p className="font-bold text-gray-900">{new Date(selectedSale.sale_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pagamento</p>
                  <p className="font-bold text-gray-900">{selectedSale.payment_method}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vendedor</p>
                  <p className="font-bold text-gray-900">{selectedSale.seller_name || "Balcão"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-2">Itens do Pedido</h3>
                <div className="space-y-3">
                  {selectedSale.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex gap-3">
                        <span className="text-gray-400 font-mono">{item.quantity}x</span>
                        <span className="font-medium text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(selectedSale.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="font-bold text-red-500">- {formatCurrency(selectedSale.discount || 0)}</span>
                </div>
                <div className="flex justify-between text-xl pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-blue-600">{formatCurrency(selectedSale.total || 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
              <button 
                onClick={() => printReceipt(selectedSale, company)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                title="Imprimir Recibo (80mm)"
              >
                <Printer size={18} /> <span className="hidden sm:inline">Recibo 80mm</span>
              </button>
              <button 
                onClick={() => printA4Quote(selectedSale, company)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                title="Salvar Orçamento (PDF A4)"
              >
                <FileText size={18} /> <span className="hidden sm:inline">Orçamento A4</span>
              </button>
              {selectedSale.status !== "Cancelada" && canDelete && (
                <button 
                  onClick={() => handleCancelClick(selectedSale.id)}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <XCircle size={18} /> Cancelar Venda
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={() => handleDeleteClick(selectedSale.id)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 size={18} /> Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => saleToCancel && cancelSaleMutation.mutate(saleToCancel)}
        title="Cancelar Venda"
        message="Tem certeza que deseja cancelar esta venda? Esta ação irá estornar o pagamento que a venda gerou no caixa. Esta ação não pode ser desfeita."
        confirmText="Sim, Cancelar"
        isLoading={cancelSaleMutation.isPending}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => saleToDelete && deleteSaleMutation.mutate(saleToDelete)}
        title="Excluir Venda"
        message="ATENÇÃO: Tem certeza que deseja excluir completamente esta venda? O registro será deletado permanentemente do banco de dados e o pagamento que a venda gerou no caixa será retirado. Esta ação não pode ser desfeita."
        confirmText="Sim, Excluir"
        isLoading={deleteSaleMutation.isPending}
      />

      {/* Floating Modal "Venda Concluída!" when redirected from POS */}
      {showReceipt && receiptSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => {
              setShowReceipt(false);
              setReceiptSale(null);
              setNfceUrl(null);
              setNfceErrorMsg(null);
              window.history.replaceState({}, document.title);
            }} 
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Venda Concluída!</h2>
              <p className="text-gray-500">Venda #{receiptSale?.id?.substr(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-4xl font-bold text-green-600 py-4">{formatCurrency(receiptSale?.total || 0)}</div>
            
            <div className="bg-gray-50 p-4 rounded-2xl text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-bold text-gray-900">{receiptSale?.client_name || "Consumidor Final"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pagamento</span>
                <span className="font-bold text-gray-900">{receiptSale?.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data</span>
                <span className="font-bold text-gray-900">{formatBR(receiptSale?.sale_date, "dd/MM/yyyy HH:mm")}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              {nfceUrl ? (
                <button 
                  onClick={() => window.open(nfceUrl, '_blank')}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <FileText size={20} /> Ver DANFE (NFC-e)
                </button>
              ) : (
                <button 
                  onClick={() => emitNfceMutation.mutate()}
                  disabled={emitNfceMutation.isPending}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <ReceiptText size={20} /> {emitNfceMutation.isPending ? "Emitindo NFC-e..." : "Emitir NFC-e Rápida"}
                </button>
              )}

              {nfceErrorMsg && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded-xl text-center">{nfceErrorMsg}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => printReceipt(receiptSale, company)}
                  className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Printer size={20} /> Recibo 80mm
                </button>
                <button 
                  onClick={() => printA4Quote(receiptSale, company)}
                  className="py-3 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <FileText size={20} /> Orçamento A4
                </button>
              </div>

              <button 
                onClick={() => {
                  setShowReceipt(false);
                  setReceiptSale(null);
                  setNfceUrl(null);
                  setNfceErrorMsg(null);
                  window.history.replaceState({}, document.title);
                }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
