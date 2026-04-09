import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  TrendingUp, 
  Search, 
  Filter,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Shield,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExportButton from "../components/ExportButton";

export default function CommissionPayouts() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();

  const canView = hasPermission('reports.view');
  const canManage = hasPermission('finance.manage');

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

  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

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
        start: new Date(startDate),
        end: new Date(endDate + 'T23:59:59')
      });

      return isPending && matchesSeller && matchesDate;
    }).sort((a: any, b: any) => new Date(b.sale_date || b.created_at).getTime() - new Date(a.sale_date || a.created_at).getTime());
  }, [sales, selectedSellerId, startDate, endDate]);

  const totalPending = useMemo(() => {
    return filteredSales.reduce((acc: number, sale: any) => acc + (sale.commission_amount || 0), 0);
  }, [filteredSales]);

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
        due_date: format(new Date(), 'yyyy-MM-dd'),
        status: "Pago",
        payment_date: new Date().toISOString(),
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      toast.success("Pagamento de comissão registrado!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao processar pagamento: ${error.message}`);
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fechamento de Comissões</h1>
          <p className="text-gray-500">Gerencie e pague as comissões pendentes dos seus vendedores.</p>
        </div>
        <div className="flex gap-2">
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
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Pendente (Filtro)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            R$ {totalPending.toLocaleString()}
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
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
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
                        {format(new Date(sale.sale_date || sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
                        R$ {sale.total?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-green-600">R$ {sale.commission_amount?.toLocaleString()}</span>
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
    </div>
  );
}
