import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Package,
  Shield,
  BarChart3,
  Printer,
  FileText
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { subDays, isAfter, parseISO } from "date-fns";
import ExportButton from "../components/ExportButton";
import { exportToPdf } from "../lib/utils/pdfExport";

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

export default function ProfitabilityReport() {
  const { user, hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState("30"); // 7, 30, 90, custom
  
  const canView = hasPermission('reports.view');

  

  const currentCompanyId = api.getCompanyId();

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales"),
    enabled: !!user
  });

  const { data: accountsPayable = [], isLoading: isLoadingExpenses } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable"),
    enabled: !!user
  });

  const { data: categories = [] } = useQuery({ 
    queryKey: ["categories", currentCompanyId], 
    queryFn: () => api.get("categories"),
    enabled: !!user
  });

  const reportData = useMemo(() => {
    const now = getNowBR();
    const startDate = subDays(now, parseInt(dateRange));
    
    const filteredSales = sales.filter((s: any) => {
      const saleDate = parseISO(s.sale_date);
      return isAfter(saleDate, startDate) && s.status !== "Cancelada";
    });

    const filteredExpenses = accountsPayable.filter((e: any) => {
      if (e.status !== "Pago" || !e.payment_date) return false;
      const payDate = parseISO(e.payment_date);
      return isAfter(payDate, startDate);
    });

    // Calculate metrics
    let totalRevenue = 0;
    let totalCOGS = 0;
    const productProfit: Record<string, { name: string, profit: number, revenue: number, qty: number }> = {};
    const categoryProfit: Record<string, { name: string, profit: number, revenue: number }> = {};

    filteredSales.forEach((sale: any) => {
      totalRevenue += sale.total || 0;
      
      (sale.items || []).forEach((item: any) => {
        const cost = (item.cost_price || 0) * item.quantity;
        const revenue = item.price * item.quantity;
        const profit = revenue - cost;
        
        totalCOGS += cost;

        // By Product
        if (!productProfit[item.id]) {
          productProfit[item.id] = { name: item.name, profit: 0, revenue: 0, qty: 0 };
        }
        productProfit[item.id].profit += profit;
        productProfit[item.id].revenue += revenue;
        productProfit[item.id].qty += item.quantity;

        // By Category
        const catId = item.category_id || 'uncategorized';
        const catName = categories.find((c: any) => c.id === catId)?.name || 'Sem Categoria';
        
        if (!categoryProfit[catId]) {
          categoryProfit[catId] = { name: catName, profit: 0, revenue: 0 };
        }
        categoryProfit[catId].profit += profit;
        categoryProfit[catId].revenue += revenue;
      });
    });

    const totalExpenses = filteredExpenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Timeline data
    const timeline: Record<string, { date: string, revenue: number, profit: number, expenses: number }> = {};
    
    // Initialize timeline with all days in range
    for (let i = parseInt(dateRange); i >= 0; i--) {
      const d = formatBR(subDays(now, i), 'dd/MM');
      timeline[d] = { date: d, revenue: 0, profit: 0, expenses: 0 };
    }

    filteredSales.forEach((s: any) => {
      const d = formatBR(s.sale_date, 'dd/MM');
      if (timeline[d]) {
        timeline[d].revenue += s.total || 0;
        const saleCOGS = (s.items || []).reduce((acc: number, item: any) => acc + ((item.cost_price || 0) * item.quantity), 0);
        timeline[d].profit += (s.total || 0) - saleCOGS;
      }
    });

    filteredExpenses.forEach((e: any) => {
      const d = formatBR(e.payment_date, 'dd/MM');
      if (timeline[d]) {
        timeline[d].expenses += e.amount || 0;
      }
    });

    return {
      totalRevenue,
      totalCOGS,
      totalExpenses,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      topProducts: Object.values(productProfit).sort((a, b) => b.profit - a.profit).slice(0, 10),
      categoryData: Object.values(categoryProfit).sort((a, b) => b.profit - a.profit),
      timelineData: Object.values(timeline)
    };
  }, [sales, accountsPayable, categories, dateRange]);

  if (isLoadingSales || isLoadingExpenses) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar o relatório de lucratividade. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="profitability-report-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Lucratividade</h1>
          <p className="text-gray-500">Análise detalhada de margens, lucros e desempenho financeiro.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {[
              { label: '7d', value: '7' },
              { label: '30d', value: '30' },
              { label: '90d', value: '90' }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateRange === opt.value 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 hide-on-print">
            <button 
              onClick={() => window.print()}
              className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
              title="Imprimir Relatório"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={() => exportToPdf({ 
                elementId: 'profitability-report-content', 
                filename: 'Relatorio-Lucratividade', 
                title: 'Relatório de Lucratividade',
              })}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
              title="Exportar como PDF"
            >
              <FileText size={16} />
              PDF
            </button>
            <ExportButton 
              data={reportData.topProducts} 
              filename="relatorio-lucratividade" 
              format="xlsx" 
              title="Relatório de Lucratividade - Top Produtos"
              headers={{
                name: 'Produto',
                qty: 'Qtd Vendida',
                revenue: 'Receita Total',
                profit: 'Lucro Bruto'
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Receita Bruta</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.totalRevenue)}
            </h3>
            <p className="text-xs text-gray-400">Total de vendas no período</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <ArrowUpRight size={14} />
              {reportData.grossMargin.toFixed(1)}%
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.grossProfit)}
            </h3>
            <p className="text-xs text-gray-400">Lucro Bruto (Margem de Contribuição)</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <PieChartIcon size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {reportData.netProfit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {reportData.netMargin.toFixed(1)}%
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(reportData.netProfit)}
            </h3>
            <p className="text-xs text-gray-400">Lucro Líquido (Pós Despesas)</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <ArrowDownRight size={20} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Despesas</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.totalExpenses)}
            </h3>
            <p className="text-xs text-gray-400">Contas pagas no período</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Evolução Financeira
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.timelineData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Lucro Bruto" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <PieChartIcon size={20} className="text-blue-600" />
            Lucro por Categoria
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="profit"
                  nameKey="name"
                >
                  {reportData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {reportData.categoryData.slice(0, 4).map((cat, index) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-bold text-gray-900">
                  {formatCurrency(cat.profit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Top 10 Produtos mais Lucrativos</h3>
            <span className="text-xs text-blue-600 font-bold">Por Lucro Bruto</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="px-6 py-4 font-bold">Produto</th>
                  <th className="px-6 py-4 font-bold text-center">Qtd</th>
                  <th className="px-6 py-4 font-bold text-right">Lucro Total</th>
                  <th className="px-6 py-4 font-bold text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.topProducts.map((p: any, index) => (
                  <tr key={p.name} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300">#{index + 1}</span>
                        <p className="font-bold text-gray-900 truncate max-w-[150px]">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">{p.qty}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      {formatCurrency(p.profit)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold">
                        {((p.profit / p.revenue) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Filter size={20} className="text-blue-600" />
            Insights de Performance
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <ArrowUpRight size={18} />
                Melhor Categoria
              </div>
              <p className="text-xs text-blue-600 leading-relaxed">
                A categoria <span className="font-bold">{reportData.categoryData[0]?.name}</span> é a que mais contribui para o seu lucro bruto, representando {((reportData.categoryData[0]?.profit / reportData.grossProfit) * 100).toFixed(1)}% do total.
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-2">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <PieChartIcon size={18} />
                Eficiência Operacional
              </div>
              <p className="text-xs text-purple-600 leading-relaxed">
                Suas despesas operacionais consomem {((reportData.totalExpenses / reportData.grossProfit) * 100).toFixed(1)}% do seu lucro bruto. Uma margem líquida de {reportData.netMargin.toFixed(1)}% é considerada {reportData.netMargin > 15 ? 'excelente' : reportData.netMargin > 5 ? 'saudável' : 'atenciosa'} para o seu setor.
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
              <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                <Package size={18} />
                Mix de Produtos
              </div>
              <p className="text-xs text-orange-600 leading-relaxed">
                Os 10 produtos mais lucrativos geram {((reportData.topProducts.reduce((acc, p) => acc + p.profit, 0) / reportData.grossProfit) * 100).toFixed(1)}% do seu lucro total. Diversificar o mix pode reduzir a dependência desses itens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
