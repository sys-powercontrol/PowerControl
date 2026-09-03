import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR, getTodayBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Shield,
  DollarSign,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  CheckCheck,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

import ExportButton from "../components/ExportButton";

export default function CommissionPayouts() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();

  const canView = hasPermission('reports.view');
  const canManage = hasPermission('finance.manage');

  const [isConfirmBatchModalOpen, setIsConfirmBatchModalOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [startDate, setStartDate] = useState(formatBR(startOfMonth(getNowBR()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(formatBR(endOfMonth(getNowBR()), 'yyyy-MM-dd'));

  const { data: sellers = [] } = useQuery({ 
    queryKey: ["sellers", currentCompanyId], 
    queryFn: () => api.get("sellers"),
    enabled: !!user
  });

  const { data: sales = [], isLoading } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales"),
    enabled: !!user
  });

  const filteredSales = useMemo(() => {
    return sales.filter((sale: any) => {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const isPending = sale.commission_status === "pending";
      const matchesSeller = selectedSellerId === "all" || sale.seller_id === selectedSellerId;
      const matchesDate = isWithinInterval(saleDate, {
        start: new Date(`${startDate}T00:00:00-03:00`),
        end: new Date(`${endDate}T23:59:59-03:00`)
      });

      return isPending && matchesSeller && matchesDate;
    }).sort((a: any, b: any) => new Date(b.sale_date || b.created_at).getTime() - new Date(a.sale_date || a.created_at).getTime());
  }, [sales, selectedSellerId, startDate, endDate]);

  const totalPending = useMemo(() => {
    return filteredSales.reduce((acc: number, sale: any) => acc + (sale.commission_amount || 0), 0);
  }, [filteredSales]);

  const selectedSellerName = useMemo(() => {
    if (selectedSellerId === "all") return "Múltiplos Vendedores (Todos filtrados)";
    const found = sellers.find((s: any) => s.id === selectedSellerId);
    return found?.name || "Vendedor Selecionado";
  }, [selectedSellerId, sellers]);

  const payoutMutation = useMutation({
    mutationFn: async (sale: any) => {
      // 1. Update sale status
      await api.put("sales", sale.id, {
        commission_status: "paid",
        commission_paid_at: new Date().toISOString()
      });

      // 2. Create accounts payable entry
      await api.post("accountsPayable", {
        company_id: currentCompanyId,
        description: `Comissão: Venda #${sale.id.substr(0, 8).toUpperCase()} - ${sale.seller_name}`,
        amount: sale.commission_amount,
        due_date: getTodayBR(),
        status: "Pago",
        payment_date: new Date().toISOString(),
        category_name: "Comissões de Vendas",
        supplier: sale.seller_name, // Using seller as supplier for tracking
        created_at: new Date().toISOString()
      });

      // 3. Log action
      await api.log({
        action: 'UPDATE',
        entity: 'sales',
        entity_id: sale.id,
        description: `Pagamento de comissão realizado para ${sale.seller_name} - Venda #${sale.id.substr(0, 8).toUpperCase()}`,
        metadata: { amount: sale.commission_amount }
      });

      // 4. Create Notification
      try {
        const companyData: any = queryClient.getQueryData(["company", currentCompanyId]);
        if (!companyData || (companyData.notify_commission !== false && companyData.notify_commission !== "false")) {
          await api.post("notifications", {
            company_id: currentCompanyId,
            title: "Comissão Paga",
            message: `Pagamento de comissão de R$ ${Number(sale.commission_amount || 0).toFixed(2)} registrado para ${sale.seller_name}.`,
            type: "info",
            link: "/Comissoes",
            read: false,
            status: "unread",
            created_at: new Date().toISOString()
          });
        }
      } catch {
        // Silently handle
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Pagamento de comissão registrado!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao processar pagamento: ${error.message}`);
    }
  });

  const batchPayoutMutation = useMutation({
    mutationFn: async (salesList: any[]) => {
      for (const sale of salesList) {
        // 1. Update sale status
        await api.put("sales", sale.id, {
          commission_status: "paid",
          commission_paid_at: new Date().toISOString()
        });

        // 2. Create accounts payable entry
        await api.post("accountsPayable", {
          company_id: currentCompanyId,
          description: `Comissão: Venda #${sale.id.substr(0, 8).toUpperCase()} - ${sale.seller_name}`,
          amount: sale.commission_amount,
          due_date: getTodayBR(),
          status: "Pago",
          payment_date: new Date().toISOString(),
          category_name: "Comissões de Vendas",
          supplier: sale.seller_name,
          created_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      setIsConfirmBatchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas as comissões filtradas foram pagas!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao processar lote de comissões: ${error.message}`);
    }
  });

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar as comissões. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é restrita a gestores financeiros.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fechamento de Comissões</h1>
          <p className="text-gray-500">Gerencie e pague as comissões pendentes dos seus vendedores.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto items-stretch">
          <button
            id="btn-batch-payout-trigger"
            onClick={() => setIsConfirmBatchModalOpen(true)}
            disabled={filteredSales.length === 0 || batchPayoutMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-100 disabled:opacity-50 min-h-[48px] cursor-pointer"
            title="Pagar Todas as Comissões Filtradas"
          >
            {batchPayoutMutation.isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <CheckCheck size={18} />
            )}
            <span>Pagar Todas as Comissões Filtradas ({filteredSales.length})</span>
          </button>

          <ExportButton 
            data={filteredSales} 
            filename="comissoes-pendentes" 
            format="xlsx" 
            title="Relatório de Comissões Pendentes"
            headers={{
              sale_date: 'Data da Venda',
              id: 'ID Venda',
              seller_name: 'Vendedor',
              total: 'Total Venda (R$)',
              commission_amount: 'Comissão (R$)'
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
            data={filteredSales} 
            filename="comissoes-pendentes" 
            format="pdf" 
            title="Relatório de Comissões Pendentes"
            headers={{
              sale_date: 'Data da Venda',
              id: 'ID Venda',
              seller_name: 'Vendedor',
              total: 'Total Venda (R$)',
              commission_amount: 'Comissão (R$)'
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pendente (Filtro)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Vendas Pendentes</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {filteredSales.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Vendedores Ativos</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {sellers.filter((s: any) => s.active !== false).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Vendedor</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
              >
                <option value="all">Todos os Vendedores</option>
                {sellers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end">
            <button 
              onClick={() => {
                setSelectedSellerId("all");
                setStartDate(formatBR(startOfMonth(getNowBR()), 'yyyy-MM-dd'));
                setEndDate(formatBR(endOfMonth(getNowBR()), 'yyyy-MM-dd'));
              }}
              className="w-full py-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Carregando comissões...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-20 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
            <DollarSign size={64} className="mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">Nenhuma comissão pendente encontrada.</p>
            <p className="text-sm">Verifique os filtros ou o período selecionado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-6 py-4 font-bold">Data</th>
                    <th className="px-6 py-4 font-bold">Vendedor</th>
                    <th className="px-6 py-4 font-bold">Venda</th>
                    <th className="px-6 py-4 font-bold text-right">Total Venda</th>
                    <th className="px-6 py-4 font-bold text-right">Comissão</th>
                    <th className="px-6 py-4 font-bold text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSales.map((sale: any) => (
                    <tr key={sale.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBR(sale.sale_date || sale.created_at, "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {sale.seller_name?.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{sale.seller_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-gray-400">#{sale.id.substr(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-600">
                        {formatCurrency(sale.total || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-green-600">{formatCurrency(sale.commission_amount || 0)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => payoutMutation.mutate(sale)}
                          disabled={payoutMutation.isPending}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-100 transition-all disabled:opacity-50"
                          title="Marcar como Pago"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 text-amber-700">
        <AlertCircle className="shrink-0" size={24} />
        <div className="text-sm space-y-1">
          <p className="font-bold">Informação Importante</p>
          <p>Ao marcar uma comissão como paga, o sistema atualizará o status da venda e gerará automaticamente um lançamento de saída no seu Contas a Pagar com status "Pago".</p>
        </div>
      </div>

      {/* Modal de Confirmação de Pagamento em Lote */}
      {isConfirmBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                <DollarSign size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Pagamento em Lote</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Confirme a liquidação e registro das comissões selecionadas no Contas a Pagar:
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm border border-gray-100">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Vendedor(es):</span>
                <span className="font-semibold text-gray-900 truncate max-w-[220px]">{selectedSellerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Vendas no Lote:</span>
                <span className="font-bold text-gray-900">{filteredSales.length} venda(s)</span>
              </div>
              <div className="flex justify-between items-center py-1 text-base">
                <span className="text-gray-700 font-medium">Montante Total a Pagar:</span>
                <span className="font-extrabold text-emerald-600 text-lg">{formatCurrency(totalPending)}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmBatchModalOpen(false)}
                disabled={batchPayoutMutation.isPending}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  batchPayoutMutation.mutate(filteredSales);
                }}
                disabled={batchPayoutMutation.isPending || filteredSales.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {batchPayoutMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck size={18} />
                    <span>Confirmar Pagamento em Lote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
