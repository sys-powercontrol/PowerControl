import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  FileText, 
  XCircle,
  ChevronDown,
  Shield,
  Calendar
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import ExportButton from "../components/ExportButton";
import { printReceipt } from "../lib/utils/print";

type DateFilterType = "day" | "week" | "month" | "custom" | "all";

export default function SalesHistory() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("day");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const canView = hasPermission('sales.view');
  const canDelete = hasPermission('sales.delete');

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

  const currentCompanyId = api.getCompanyId();

  const { data: salesData = [], isLoading } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales", { _orderBy: "sale_date", _orderDir: "desc" }),
    enabled: !!user
  });

  const sales = React.useMemo(() => {
    return salesData;
  }, [salesData]);

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<string | null>(null);
  const { data: company } = useQuery({ 
    queryKey: ["company", user?.company_id], 
    queryFn: () => api.get(`companies/${user?.company_id}`),
    enabled: !!user?.company_id
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
    mutationFn: (id: string) => api.put("sales", id, { status: "Cancelada" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda cancelada com sucesso!");
      setIsDetailsModalOpen(false);
      setIsCancelModalOpen(false);
      setSaleToCancel(null);
    }
  });

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

  return (
    <div className="space-y-8" id="sales-history-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Vendas</h1>
          <p className="text-gray-500">Consulte e gerencie todas as movimentações de venda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(paymentMethodTotals).map(([method, amount]) => (
            <div key={method} className="bg-white px-4 py-2 flex flex-col rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">{method}</span>
              <span className="text-sm font-bold text-gray-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount as number)}
              </span>
            </div>
          ))}
          <div className="bg-blue-600 px-4 py-2 flex flex-col rounded-xl border border-blue-700 shadow-sm text-white">
            <span className="text-[10px] uppercase font-bold text-blue-200">Total</span>
            <span className="text-sm font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales)}
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

        <div className="flex gap-2">
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
          />
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
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales),
                isPrimary: true
              },
              ...Object.entries(paymentMethodTotals).map(([method, amount]) => ({
                label: method,
                value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount as number),
                isPrimary: false
              }))
            ]}
          />
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
                      sale.status === "Cancelada" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {sale.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sale.client_name} • {new Date(sale.sale_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-8">
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">R$ {sale.total?.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{sale.payment_method}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setSelectedSale(sale); setIsDetailsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Printer size={18} />
                  </button>
                  {sale.status !== "Cancelada" && canDelete && (
                    <button 
                      onClick={() => handleCancelClick(sale.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircle size={18} />
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
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                      <span className="font-bold text-gray-900">R$ {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">R$ {selectedSale.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="font-bold text-red-500">- R$ {selectedSale.discount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-blue-600">R$ {selectedSale.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => printReceipt(selectedSale, company)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <Printer size={18} /> Imprimir Comprovante
              </button>
              {selectedSale.status !== "Cancelada" && (
                <button 
                  onClick={() => handleCancelClick(selectedSale.id)}
                  className="flex-1 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <XCircle size={18} /> Cancelar Venda
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
        message="Tem certeza que deseja cancelar esta venda? Esta ação irá reverter o estoque dos produtos e anular o lançamento financeiro. Esta ação não pode ser desfeita."
        confirmText="Sim, Cancelar"
        isLoading={cancelSaleMutation.isPending}
      />
    </div>
  );
}
