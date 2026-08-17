import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { toast } from "sonner";
import { 
  TrendingUp, 
  Building2, 
  DollarSign,
  BarChart3,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Lock,
  Package,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  ShieldAlert,
  RefreshCw,
  Activity,
  Sparkles,
  Wallet,
  ArrowRightLeft
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6'];

const StatCard = ({ title, value, icon: Icon, color, subtitle, badge, trend }: any) => {
  const getTheme = (col: string) => {
    if (col.includes("green") || col.includes("emerald")) {
      return {
        cardBg: "bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 border border-emerald-100",
        iconBg: "bg-emerald-500 text-white shadow-md shadow-emerald-200",
        valueColor: "text-emerald-700",
        accentBg: "bg-emerald-50 text-emerald-700 border-emerald-200"
      };
    }
    if (col.includes("orange") || col.includes("amber")) {
      return {
        cardBg: "bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 border border-amber-100",
        iconBg: "bg-amber-500 text-white shadow-md shadow-amber-200",
        valueColor: "text-amber-700",
        accentBg: "bg-amber-50 text-amber-700 border-amber-200"
      };
    }
    if (col.includes("blue") || col.includes("indigo")) {
      return {
        cardBg: "bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 border border-blue-100",
        iconBg: "bg-blue-600 text-white shadow-md shadow-blue-200",
        valueColor: "text-blue-700",
        accentBg: "bg-blue-50 text-blue-700 border-blue-200"
      };
    }
    if (col.includes("purple") || col.includes("violet")) {
      return {
        cardBg: "bg-gradient-to-br from-white via-violet-50/20 to-violet-50/40 border border-violet-100",
        iconBg: "bg-violet-600 text-white shadow-md shadow-violet-200",
        valueColor: "text-violet-700",
        accentBg: "bg-violet-50 text-violet-700 border-violet-200"
      };
    }
    if (col.includes("red") || col.includes("rose")) {
      return {
        cardBg: "bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 border border-rose-100",
        iconBg: "bg-rose-600 text-white shadow-md shadow-rose-200",
        valueColor: "text-rose-700",
        accentBg: "bg-rose-50 text-rose-700 border-rose-200"
      };
    }
    return {
      cardBg: "bg-white border border-gray-100 shadow-sm",
      iconBg: "bg-gray-600 text-white",
      valueColor: "text-gray-900",
      accentBg: "bg-gray-50 text-gray-700 border-gray-200"
    };
  };

  const theme = getTheme(color);

  return (
    <div className={`p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-lg ${theme.cardBg}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          <Icon size={22} />
        </div>
        {badge && (
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${theme.accentBg}`}>
            {badge}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className={`text-2xl font-black mt-1 tracking-tight ${theme.valueColor}`}>{value}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/60">
          <p className="text-xs text-gray-500 font-medium truncate">{subtitle}</p>
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function GlobalDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dateFilter, setDateFilter] = useState<"30d" | "7d" | "today" | "month" | "all">("30d");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [companySearch, setCompanySearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "cashiers" | "companies" | "audit">("overview");

  // Multi-tenant dataset queries
  const { data: companies, isLoading: loadingCompanies } = useQuery({ 
    queryKey: ["companies", "all"], 
    queryFn: () => api.get("companies", { _all: true }) 
  });
  const { data: sales = [], isLoading: loadingSales } = useQuery({ 
    queryKey: ["sales", "all"], 
    queryFn: () => api.get("sales", { _all: true }) 
  });
  const { data: users = [] } = useQuery({ 
    queryKey: ["users", "all"], 
    queryFn: () => api.get("users", { _all: true }) 
  });
  const { data: payables = [] } = useQuery({
    queryKey: ["accountsPayable", "all"],
    queryFn: () => api.get("accountsPayable", { _all: true })
  });
  const { data: receivables = [] } = useQuery({
    queryKey: ["accountsReceivable", "all"],
    queryFn: () => api.get("accountsReceivable", { _all: true })
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => api.get("products", { _all: true })
  });
  const { data: cashiers = [] } = useQuery({
    queryKey: ["cashiers", "all"],
    queryFn: () => api.get("cashiers", { _all: true })
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit_logs", "all"],
    queryFn: () => api.get("audit_logs", { _all: true, _limit: 25 })
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    toast.success("Dados do ecossistema atualizados com sucesso!");
  };

  const metrics = useMemo(() => {
    const now = getNowBR();
    
    // Filter sales by selected company
    let filteredSales = sales;
    if (selectedCompanyId !== "all") {
      filteredSales = sales.filter((s: any) => s.company_id === selectedCompanyId);
    }

    // Filter by date range
    let startDate: Date;
    let endDate: Date = now;

    if (dateFilter === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (dateFilter === "7d") {
      startDate = subDays(now, 7);
    } else if (dateFilter === "month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (dateFilter === "30d") {
      startDate = subDays(now, 30);
    } else {
      startDate = new Date(2000, 0, 1);
    }

    const rangeSales = filteredSales.filter((s: any) => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d >= startDate && d <= endDate && s.status !== "Cancelada";
    });

    const activeCompanies = companies.filter((c: any) => c.is_active).length;
    const periodRevenue = rangeSales.reduce((acc: number, s: any) => acc + (parseFloat(s.total) || 0), 0);
    const periodSalesCount = rangeSales.length;
    const averageTicket = periodSalesCount > 0 ? periodRevenue / periodSalesCount : 0;

    const totalEcosystemRevenue = sales
      .filter((s: any) => s.status !== "Cancelada")
      .reduce((acc: number, s: any) => acc + (parseFloat(s.total) || 0), 0);

    // Financial obligations
    let filteredPayables = payables;
    let filteredReceivables = receivables;
    if (selectedCompanyId !== "all") {
      filteredPayables = payables.filter((p: any) => p.company_id === selectedCompanyId);
      filteredReceivables = receivables.filter((r: any) => r.company_id === selectedCompanyId);
    }

    const pendingPayables = filteredPayables
      .filter((p: any) => p.status === "Pendente")
      .reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0);

    const pendingReceivables = filteredReceivables
      .filter((r: any) => r.status === "Pendente")
      .reduce((acc: number, r: any) => acc + (parseFloat(r.amount) || 0), 0);

    const netProjected = pendingReceivables - pendingPayables;

    // Cashiers
    let filteredCashiers = cashiers;
    if (selectedCompanyId !== "all") {
      filteredCashiers = cashiers.filter((c: any) => c.company_id === selectedCompanyId);
    }
    const openCashiers = filteredCashiers.filter((c: any) => c.status === "Aberto");
    const openCashiersBalance = openCashiers.reduce((acc: number, c: any) => acc + (parseFloat(c.balance) || 0), 0);

    // Products & stock
    let filteredProducts = products;
    if (selectedCompanyId !== "all") {
      filteredProducts = products.filter((p: any) => p.company_id === selectedCompanyId);
    }
    const totalProductsCount = filteredProducts.length;
    const lowStockCount = filteredProducts.filter((p: any) => (p.stock || 0) <= (p.min_stock || 5)).length;

    // Revenue distribution by payment method
    const paymentMethodsMap: Record<string, number> = {};
    rangeSales.forEach((s: any) => {
      const method = s.payment_method || "Outros";
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + (parseFloat(s.total) || 0);
    });

    const paymentMethodsData = Object.entries(paymentMethodsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Company Ranking
    const companyStatsMap: Record<string, { name: string; revenue: number; salesCount: number; activeUsers: number; openCashiers: number }> = {};
    
    companies.forEach((c: any) => {
      companyStatsMap[c.id] = {
        name: c.name || "Sem Nome",
        revenue: 0,
        salesCount: 0,
        activeUsers: users.filter((u: any) => u.company_id === c.id && u.is_active).length,
        openCashiers: cashiers.filter((ca: any) => ca.company_id === c.id && ca.status === "Aberto").length
      };
    });

    sales.forEach((s: any) => {
      if (s.company_id && companyStatsMap[s.company_id] && s.status !== "Cancelada") {
        companyStatsMap[s.company_id].revenue += parseFloat(s.total) || 0;
        companyStatsMap[s.company_id].salesCount += 1;
      }
    });

    const ranking = Object.entries(companyStatsMap)
      .map(([id, stat]) => ({
        id,
        name: stat.name,
        revenue: stat.revenue,
        salesCount: stat.salesCount,
        averageTicket: stat.salesCount > 0 ? stat.revenue / stat.salesCount : 0,
        activeUsers: stat.activeUsers,
        openCashiers: stat.openCashiers,
        isActive: companies.find((c: any) => c.id === id)?.is_active ?? true
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Timeline Revenue Chart Data (Daily breakdown for last 30 days or period)
    const daysCount = dateFilter === "7d" ? 7 : dateFilter === "today" ? 1 : 30;
    const chartDays = Array.from({ length: daysCount }, (_, i) => {
      const d = subDays(now, daysCount - 1 - i);
      return formatBR(d, 'yyyy-MM-dd');
    });

    const dailyRevenueChart = chartDays.map(dateStr => {
      const daySales = rangeSales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === dateStr);
      const total = daySales.reduce((acc: number, s: any) => acc + (parseFloat(s.total) || 0), 0);
      return {
        date: formatBR(dateStr, 'dd/MM'),
        total,
        qtd: daySales.length
      };
    });

    return {
      activeCompanies,
      totalCompaniesCount: companies.length,
      periodRevenue,
      periodSalesCount,
      averageTicket,
      totalEcosystemRevenue,
      pendingPayables,
      pendingReceivables,
      netProjected,
      openCashiersCount: openCashiers.length,
      openCashiersBalance,
      totalProductsCount,
      lowStockCount,
      paymentMethodsData,
      ranking,
      dailyRevenueChart,
      totalUsersCount: users.length
    };
  }, [companies, sales, users, payables, receivables, products, cashiers, dateFilter, selectedCompanyId]);

  const filteredRanking = useMemo(() => {
    if (!companySearch.trim()) return metrics.ranking;
    return metrics.ranking.filter(c => 
      (c.name || '').toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [metrics.ranking, companySearch]);

  const handleExportSummaryCSV = () => {
    try {
      const headers = ["Posição,Empresa,Status,Faturamento,Qtd Vendas,Ticket Médio,Usuários Ativos,Caixas Abertos\n"];
      const rows = metrics.ranking.map((c, idx) => 
        `"${idx + 1}","${c.name}","${c.isActive ? 'Ativa' : 'Inativa'}","${c.revenue.toFixed(2)}","${c.salesCount}","${c.averageTicket.toFixed(2)}","${c.activeUsers}","${c.openCashiers}"`
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_global_ecossistema_${formatBR(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Relatório CSV gerado e baixado!");
    } catch {
      toast.error("Erro ao exportar relatório em CSV");
    }
  };

  if (user?.role !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full shadow-inner">
          <ShieldAlert size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Acesso Exclusivo Master</h2>
          <p className="text-gray-500 max-w-md mx-auto mt-1">
            Esta página consolida dados estratégicos de todas as empresas do ecossistema e é restrita ao Administrador Geral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-400" /> Executive Console Master
              </span>
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <Clock size={12} /> {formatBR(new Date(), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              Dashboard Global do Ecossistema
            </h1>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Supervisão analítica em tempo real de faturamento, desempenho financeiro, caixas abertos e usuários em todas as empresas cadastradas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleRefresh}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all border border-white/10"
            >
              <RefreshCw size={15} className={(loadingCompanies || loadingSales) ? "animate-spin" : ""} /> Atualizar
            </button>
            <button 
              onClick={handleExportSummaryCSV}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
            >
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={16} className="text-gray-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">Período:</span>
          {(["30d", "7d", "today", "month", "all"] as const).map(p => (
            <button
              key={p}
              onClick={() => setDateFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                dateFilter === p 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p === "30d" && "Últimos 30 dias"}
              {p === "7d" && "Últimos 7 dias"}
              {p === "today" && "Hoje"}
              {p === "month" && "Este Mês"}
              {p === "all" && "Todo o Histórico"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/80 w-full md:w-64">
            <Building2 size={16} className="text-gray-400 shrink-0" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none w-full cursor-pointer"
            >
              <option value="all">Todas as Empresas ({companies.length})</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_active ? "" : "(Inativa)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (8 Core Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Empresas Ativas" 
          value={`${metrics.activeCompanies} / ${metrics.totalCompaniesCount}`} 
          icon={Building2} 
          color="blue"
          badge={`${Math.round((metrics.activeCompanies / (metrics.totalCompaniesCount || 1)) * 100)}% ativas`}
          subtitle={`Total de ${metrics.totalUsersCount} usuários no sistema`}
        />
        <StatCard 
          title="Faturamento no Período" 
          value={formatCurrency(metrics.periodRevenue)} 
          icon={TrendingUp} 
          color="emerald"
          badge={`${metrics.periodSalesCount} vendas`}
          subtitle={`Histórico acumulado: ${formatCurrency(metrics.totalEcosystemRevenue)}`}
        />
        <StatCard 
          title="Ticket Médio Global" 
          value={formatCurrency(metrics.averageTicket)} 
          icon={DollarSign} 
          color="purple"
          subtitle="Média por pedido no ecossistema"
        />
        <StatCard 
          title="Contas a Receber" 
          value={formatCurrency(metrics.pendingReceivables)} 
          icon={ArrowDownRight} 
          color="blue"
          subtitle="Títulos pendentes de recebimento"
        />
        <StatCard 
          title="Contas a Pagar" 
          value={formatCurrency(metrics.pendingPayables)} 
          icon={ArrowUpRight} 
          color="rose"
          subtitle="Obrigações e despesas pendentes"
        />
        <StatCard 
          title="Resultado Projetado" 
          value={formatCurrency(metrics.netProjected)} 
          icon={Wallet} 
          color={metrics.netProjected >= 0 ? "emerald" : "rose"}
          subtitle="A Receber - A Pagar"
        />
        <StatCard 
          title="Caixas Abertos Agora" 
          value={`${metrics.openCashiersCount} caixas`} 
          icon={Lock} 
          color="amber"
          badge={formatCurrency(metrics.openCashiersBalance)}
          subtitle="Saldo total em gavetas abertas"
        />
        <StatCard 
          title="Produtos & Estoque" 
          value={`${metrics.totalProductsCount} itens`} 
          icon={Package} 
          color="indigo"
          badge={metrics.lowStockCount > 0 ? `${metrics.lowStockCount} em alerta` : "Estoque OK"}
          subtitle="Itens cadastrados em catálogo"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
          {[
            { id: "overview", label: "Visão Geral de Vendas", icon: BarChart3 },
            { id: "financial", label: "Matriz Financeira (Pagar x Receber)", icon: Wallet },
            { id: "cashiers", label: "Caixas & Operação", icon: Lock },
            { id: "companies", label: "Ranking de Empresas", icon: Building2 },
            { id: "audit", label: "Logs do Ecossistema", icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
                  isActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: VISÃO GERAL DE VENDAS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timeline Line/Area Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Evolução Diária do Faturamento</h3>
                  <p className="text-xs text-gray-500">Volume de vendas agrupado por dia no período selecionado</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="h-[320px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={metrics.dailyRevenueChart}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Meios de Pagamento</h3>
                  <p className="text-xs text-gray-500">Participação por forma de pagamento</p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <CreditCard size={20} />
                </div>
              </div>

              {metrics.paymentMethodsData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-xs text-gray-400 font-medium">
                  Nenhuma venda registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={metrics.paymentMethodsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="total"
                        >
                          {metrics.paymentMethodsData.map((_, index) => (
                            <Cell key={`pm-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {metrics.paymentMethodsData.map((pm, idx) => (
                      <div key={pm.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50/70">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-gray-700">{pm.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(pm.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ FINANCEIRA */}
      {activeTab === "financial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Resumo de Obrigações Financeiras</h3>
                <p className="text-xs text-gray-500">Comparativo global de Contas a Pagar x Contas a Receber</p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowRightLeft size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <span className="text-xs font-bold text-emerald-700 uppercase">A Receber Total</span>
                <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(metrics.pendingReceivables)}</p>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">Lançamentos de clientes</p>
              </div>

              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                <span className="text-xs font-bold text-rose-700 uppercase">A Pagar Total</span>
                <p className="text-xl font-black text-rose-700 mt-1">{formatCurrency(metrics.pendingPayables)}</p>
                <p className="text-[11px] text-rose-600 mt-1 font-medium">Fornecedores e despesas</p>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Saldo Financeiro Projetado</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  metrics.netProjected >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {metrics.netProjected >= 0 ? "Superávit Projetado" : "Déficit Projetado"}
                </span>
              </div>
              <p className="text-3xl font-black mt-2">{formatCurrency(metrics.netProjected)}</p>
              <p className="text-xs text-indigo-200/80 mt-1">
                Diferença líquida acumulada dos lançamentos financeiros pendentes em todas as empresas.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900">Indicadores de Riscos & Inadimplência</h3>
            <p className="text-xs text-gray-500">Monitoramento da saúde de liquidez dos inquilinos do sistema</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-100 bg-amber-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Inadimplência Projetada</h4>
                    <p className="text-xs text-gray-500">Contas a receber vencidas e não liquidadas</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-amber-700">
                  {formatCurrency(receivables.filter((r: any) => r.status === "Pendente" && new Date(r.due_date) < new Date()).reduce((a: number, b: any) => a + (parseFloat(b.amount) || 0), 0))}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Liquidações Este Mês</h4>
                    <p className="text-xs text-gray-500">Títulos efetivamente pagos/recebidos</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-blue-700">
                  {formatCurrency(receivables.filter((r: any) => r.status === "Recebido").reduce((a: number, b: any) => a + (parseFloat(b.amount) || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAIXAS & OPERAÇÃO */}
      {activeTab === "cashiers" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Caixas Abertos no Ecossistema</h3>
              <p className="text-xs text-gray-500">Turnos de caixa em andamento nas empresas</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
              {metrics.openCashiersCount} Caixas Abertos
            </span>
          </div>

          {cashiers.filter((c: any) => c.status === "Aberto").length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 font-medium">
              Nenhum caixa aberto no momento em todo o ecossistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 font-bold">Empresa</th>
                    <th className="pb-3 font-bold">Nome do Caixa</th>
                    <th className="pb-3 font-bold">Operador / Aberto Por</th>
                    <th className="pb-3 font-bold">Data de Abertura</th>
                    <th className="pb-3 font-bold text-right">Saldo Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                  {cashiers.filter((c: any) => c.status === "Aberto").map((cashier: any) => {
                    const comp = companies.find((co: any) => co.id === cashier.company_id);
                    return (
                      <tr key={cashier.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-bold text-gray-900">{comp?.name || "Empresa"}</td>
                        <td className="py-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {cashier.name}
                        </td>
                        <td className="py-3 text-gray-600">{cashier.opened_by || "Operador"}</td>
                        <td className="py-3 text-gray-500">{formatBR(cashier.opened_at, "dd/MM/yyyy HH:mm")}</td>
                        <td className="py-3 text-right font-extrabold text-emerald-600">
                          {formatCurrency(cashier.balance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RANKING DE EMPRESAS */}
      {activeTab === "companies" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Ranking & Desempenho de Inquilinos</h3>
              <p className="text-xs text-gray-500">Métricas comparativas entre todas as empresas</p>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/80 w-full sm:w-64">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar empresa..." 
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 font-bold"># Pos</th>
                  <th className="pb-3 font-bold">Empresa</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold text-center">Usuários</th>
                  <th className="pb-3 font-bold text-center">Qtd Vendas</th>
                  <th className="pb-3 font-bold text-right">Ticket Médio</th>
                  <th className="pb-3 font-bold text-right">Total Vendido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {filteredRanking.map((comp, idx) => (
                  <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full font-bold ${
                        idx === 0 ? "bg-amber-100 text-amber-800" :
                        idx === 1 ? "bg-slate-100 text-slate-800" :
                        idx === 2 ? "bg-orange-100 text-orange-800" :
                        "text-gray-400"
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-gray-900">{comp.name}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        comp.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {comp.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-3.5 text-center text-gray-600">{comp.activeUsers}</td>
                    <td className="py-3.5 text-center font-bold text-gray-800">{comp.salesCount}</td>
                    <td className="py-3.5 text-right font-bold text-gray-700">{formatCurrency(comp.averageTicket)}</td>
                    <td className="py-3.5 text-right font-black text-blue-600">{formatCurrency(comp.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LOGS DO ECOSSISTEMA */}
      {activeTab === "audit" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Auditoria ao Vivo do Ecossistema</h3>
              <p className="text-xs text-gray-500">Histórico recente de ações realizadas por usuários em todas as empresas</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity size={20} />
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 font-medium">
              Nenhum log de auditoria registrado recentemente.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log: any) => {
                const comp = companies.find((c: any) => c.id === log.company_id);
                return (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {log.action ? log.action.charAt(0) : "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{log.user_name || "Usuário"}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                            {log.module || "Geral"}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 font-medium">{comp?.name || "Empresa"}</span>
                        </div>
                        <p className="text-gray-600 mt-0.5">{log.details || log.description || log.action}</p>
                      </div>
                    </div>
                    <span className="text-gray-400 font-medium text-[11px] whitespace-nowrap ml-4">
                      {formatBR(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp, "dd/MM HH:mm")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

