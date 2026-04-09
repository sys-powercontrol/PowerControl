import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Info
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  format,
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

export default function CashFlowReport() {
  const { user, hasPermission } = useAuth();
  const currentCompanyId = api.getCompanyId();

  const canView = hasPermission('reports.view');

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar o fluxo de caixa. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [filterType, setFilterType] = useState("current_month");

  const { data: sales = [] } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales"),
    enabled: !!user
  });

  const { data: purchases = [] } = useQuery({ 
    queryKey: ["purchases", currentCompanyId], 
    queryFn: () => api.get("purchases"),
    enabled: !!user
  });

  const { data: accountsPayable = [] } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable"),
    enabled: !!user
  });

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    const now = new Date();
    if (type === "current_month") {
      setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
    } else if (type === "last_month") {
      const lastMonth = subMonths(now, 1);
      setDateRange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
    }
  };

  const dreData = useMemo(() => {
    const filteredSales = sales.filter((s: any) => {
      if (s.company_id !== currentCompanyId) return false;
      if (s.status === "Cancelada") return false;
      const date = parseISO(s.sale_date);
      return isWithinInterval(date, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
    });

    const filteredPurchases = purchases.filter((p: any) => {
      if (p.company_id !== currentCompanyId) return false;
      if (p.status === "Cancelada") return false;
      const date = parseISO(p.purchase_date);
      return isWithinInterval(date, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
    });

    const filteredExpenses = accountsPayable.filter((a: any) => {
      if (a.company_id !== currentCompanyId) return false;
      if (a.status !== "Pago") return false;
      // Use due_date as fallback if payment_date is not available
      const date = parseISO(a.payment_date || a.due_date);
      return isWithinInterval(date, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
    });

    const totalRevenue = filteredSales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    const totalCOGS = filteredPurchases.reduce((acc: number, p: any) => acc + (p.total || 0), 0);
    const totalOpEx = filteredExpenses.reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
    
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalOpEx;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCOGS,
      totalOpEx,
      grossProfit,
      netProfit,
      profitMargin,
      salesCount: filteredSales.length,
      purchasesCount: filteredPurchases.length,
      expensesCount: filteredExpenses.length
    };
  }, [sales, purchases, accountsPayable, currentCompanyId, dateRange]);

  const chartData = [
    { name: 'Receitas', valor: dreData.totalRevenue, color: '#10B981' },
    { name: 'CPV (Compras)', valor: dreData.totalCOGS, color: '#EF4444' },
    { name: 'Despesas Op.', valor: dreData.totalOpEx, color: '#F59E0B' },
  ];

  const pieData = [
    { name: 'CPV', value: dreData.totalCOGS },
    { name: 'Despesas', value: dreData.totalOpEx },
    { name: 'Lucro', value: Math.max(0, dreData.netProfit) },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DRE Simplificado</h1>
          <p className="text-gray-500">Demonstrativo de Resultados do Exercício e Lucratividade.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex">
            <button 
              onClick={() => handleFilterChange("current_month")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === "current_month" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Mês Atual
            </button>
            <button 
              onClick={() => handleFilterChange("last_month")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === "last_month" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Mês Anterior
            </button>
            <button 
              onClick={() => setFilterType("custom")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === "custom" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Personalizado
            </button>
          </div>
        </div>
      </div>

      {filterType === "custom" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-end gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Calendar size={16} /> Data Inicial
            </label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
            />
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Calendar size={16} /> Data Final
            </label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={64} className="text-green-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Bruta</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(dreData.totalRevenue)}</h3>
          <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
            <ArrowUpRight size={14} />
            <span>{dreData.salesCount} vendas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingDown size={64} className="text-red-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPV (Compras)</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(dreData.totalCOGS)}</h3>
          <div className="flex items-center gap-1 mt-2 text-red-600 text-xs font-bold">
            <ArrowDownRight size={14} />
            <span>{dreData.purchasesCount} compras</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign size={64} className="text-orange-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Despesas Op.</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(dreData.totalOpEx)}</h3>
          <div className="flex items-center gap-1 mt-2 text-orange-600 text-xs font-bold">
            <ArrowDownRight size={14} />
            <span>{dreData.expensesCount} pagamentos</span>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden group ${dreData.netProfit >= 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-red-600 border-red-600 text-white'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
            <BarChart3 size={64} />
          </div>
          <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Lucro Líquido</p>
          <h3 className="text-2xl font-bold mt-2">{formatCurrency(dreData.netProfit)}</h3>
          <div className="flex items-center gap-1 mt-2 opacity-90 text-xs font-bold">
            <Info size={14} />
            <span>Margem: {dreData.profitMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Comparativo Financeiro</h3>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Composição do Faturamento</h3>
            <PieChartIcon size={20} className="text-gray-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DRE Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Demonstrativo Detalhado</h3>
          <button className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:text-blue-700">
            <Download size={16} /> Exportar PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <th className="px-6 py-4 font-bold">Descrição da Conta</th>
                <th className="px-6 py-4 font-bold text-right">Valor</th>
                <th className="px-6 py-4 font-bold text-right">% Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-6 py-4 font-bold text-gray-900">(=) RECEITA BRUTA DE VENDAS</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(dreData.totalRevenue)}</td>
                <td className="px-6 py-4 text-right text-gray-500">100%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-600 pl-10">(-) Custo dos Produtos Vendidos (CPV)</td>
                <td className="px-6 py-4 text-right text-red-600">({formatCurrency(dreData.totalCOGS)})</td>
                <td className="px-6 py-4 text-right text-gray-400">{dreData.totalRevenue > 0 ? ((dreData.totalCOGS / dreData.totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="bg-gray-50/30">
                <td className="px-6 py-4 font-bold text-gray-900">(=) LUCRO BRUTO</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(dreData.grossProfit)}</td>
                <td className="px-6 py-4 text-right text-gray-500">{dreData.totalRevenue > 0 ? ((dreData.grossProfit / dreData.totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-600 pl-10">(-) Despesas Operacionais (Pagas)</td>
                <td className="px-6 py-4 text-right text-orange-600">({formatCurrency(dreData.totalOpEx)})</td>
                <td className="px-6 py-4 text-right text-gray-400">{dreData.totalRevenue > 0 ? ((dreData.totalOpEx / dreData.totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className={`border-t-2 ${dreData.netProfit >= 0 ? 'bg-blue-50/50' : 'bg-red-50/50'}`}>
                <td className="px-6 py-6 font-bold text-lg text-gray-900">(=) LUCRO LÍQUIDO DO PERÍODO</td>
                <td className={`px-6 py-6 text-right font-bold text-xl ${dreData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(dreData.netProfit)}
                </td>
                <td className="px-6 py-6 text-right font-bold text-gray-900">{dreData.profitMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
