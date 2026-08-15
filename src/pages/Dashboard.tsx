import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatCurrency } from "../lib/currencyUtils";
import { formatBR, getNowBR } from "../lib/dateUtils";
import SellerDashboard from "./SellerDashboard";
import { 
  TrendingUp, 
  Users, 
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Globe,
  Filter,
  Award,
  Wallet,
  BarChart3,
  CheckCircle2,
  Package,
  ArrowRightLeft,
  Calendar,
  Download
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Link } from "react-router-dom";
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f43f5e'];

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
              {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const currentCompanyId = api.getCompanyId();

  const [dateFilter, setDateFilter] = useState<"30d" | "7d" | "today" | "month">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "stock" | "sales">("overview");

  const { data: companyData } = useQuery({
    queryKey: ["company", currentCompanyId],
    queryFn: () => currentCompanyId ? api.get("companies", currentCompanyId) : null,
    enabled: !!currentCompanyId
  });

  const companyName = companyData?.name || (user as any)?.company_name || "Empresa Principal";

  const { data: salesData = [] } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales"),
    enabled: !!user
  });
  const { data: productsData = [] } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products"),
    enabled: !!user
  });
  const { data: cashiersData = [] } = useQuery({ 
    queryKey: ["cashiers", currentCompanyId], 
    queryFn: () => api.get("cashiers"),
    enabled: !!user
  });
  const { data: accountsPayableData = [] } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable"),
    enabled: !!user
  });
  const { data: accountsReceivableData = [] } = useQuery({ 
    queryKey: ["accountsReceivable", currentCompanyId], 
    queryFn: () => api.get("accountsReceivable"),
    enabled: !!user
  });
  const { data: purchasesData = [] } = useQuery({ 
    queryKey: ["purchases", currentCompanyId], 
    queryFn: () => api.get("purchases"),
    enabled: !!user
  });
  const { data: clientsData = [] } = useQuery({
    queryKey: ["clients", currentCompanyId],
    queryFn: () => api.get("clients"),
    enabled: !!user
  });

  const sales = useMemo(() => {
    if (!currentCompanyId) return salesData;
    return salesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [salesData, currentCompanyId]);

  const products = useMemo(() => {
    if (!currentCompanyId) return productsData;
    return productsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [productsData, currentCompanyId]);

  const cashiers = useMemo(() => {
    if (!currentCompanyId) return cashiersData;
    return cashiersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [cashiersData, currentCompanyId]);

  const accountsPayable = useMemo(() => {
    if (!currentCompanyId) return accountsPayableData;
    return accountsPayableData.filter((item: any) => item.company_id === currentCompanyId);
  }, [accountsPayableData, currentCompanyId]);

  const accountsReceivable = useMemo(() => {
    if (!currentCompanyId) return accountsReceivableData;
    return accountsReceivableData.filter((item: any) => item.company_id === currentCompanyId);
  }, [accountsReceivableData, currentCompanyId]);

  const purchases = useMemo(() => {
    if (!currentCompanyId) return purchasesData;
    return purchasesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [purchasesData, currentCompanyId]);

  // Comprehensive Period Filtering & Metrics Calculations
  const periodMetrics = useMemo(() => {
    const now = getNowBR();
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
    } else {
      startDate = subDays(now, 30);
    }

    // Filtered sales in selected period
    const periodSales = sales.filter((s: any) => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d >= startDate && d <= endDate && s.status !== "Cancelada";
    });

    const periodRevenue = periodSales.reduce((acc: number, s: any) => acc + (parseFloat(s.total) || 0), 0);
    const salesCount = periodSales.length;
    const averageTicket = salesCount > 0 ? periodRevenue / salesCount : 0;

    // Filtered purchases in selected period
    const periodPurchases = purchases.filter((p: any) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d >= startDate && d <= endDate;
    });
    const periodPurchasesTotal = periodPurchases.reduce((acc: number, p: any) => acc + (parseFloat(p.total) || 0), 0);

    // Receivables & Payables Summary
    const pendingReceivableList = accountsReceivable.filter((a: any) => a.status === "Pendente");
    const totalReceivable = pendingReceivableList.reduce((acc: number, a: any) => acc + (parseFloat(a.amount) || 0), 0);
    
    const pendingPayableList = accountsPayable.filter((a: any) => a.status === "Pendente");
    const totalPayable = pendingPayableList.reduce((acc: number, a: any) => acc + (parseFloat(a.amount) || 0), 0);

    const projectedBalance = totalReceivable - totalPayable;

    // Open cashiers
    const openCashiersList = cashiers.filter((c: any) => c.status === "Aberto");
    const openCashiersCount = openCashiersList.length;
    const openCashiersTotalBalance = openCashiersList.reduce((acc: number, c: any) => acc + (parseFloat(c.balance) || 0), 0);

    // Low stock
    const lowStockList = products.filter((p: any) => (p.stock_quantity || p.stock || 0) <= (p.min_stock || 5));

    // Daily Sales Timeline Chart
    const daysCount = dateFilter === "7d" ? 7 : dateFilter === "today" ? 1 : 30;
    const chartDays = Array.from({ length: daysCount }, (_, i) => {
      const d = subDays(now, daysCount - 1 - i);
      return formatBR(d, 'yyyy-MM-dd');
    });

    const dailyChartData = chartDays.map(dateStr => {
      const daySales = periodSales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === dateStr);
      const total = daySales.reduce((acc: number, s: any) => acc + (parseFloat(s.total) || 0), 0);
      return {
        date: formatBR(dateStr, 'dd/MM'),
        total,
        count: daySales.length
      };
    });

    // Payment Methods Breakdown
    const paymentMethodsMap: Record<string, number> = {};
    periodSales.forEach((s: any) => {
      const m = s.payment_method || "Outros";
      paymentMethodsMap[m] = (paymentMethodsMap[m] || 0) + (parseFloat(s.total) || 0);
    });

    const paymentMethodsData = Object.entries(paymentMethodsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Top Selling Products Breakdown
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    periodSales.forEach((s: any) => {
      if (Array.isArray(s.items)) {
        s.items.forEach((item: any) => {
          const pName = item.product_name || item.name || "Produto Sem Nome";
          const qty = parseFloat(item.quantity) || 1;
          const subtotal = parseFloat(item.subtotal || item.total) || (qty * (parseFloat(item.unit_price) || 0));
          if (!productSalesMap[pName]) {
            productSalesMap[pName] = { name: pName, qty: 0, revenue: 0 };
          }
          productSalesMap[pName].qty += qty;
          productSalesMap[pName].revenue += subtotal;
        });
      }
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top Seller Ranking
    const sellerSalesMap: Record<string, { name: string; revenue: number; count: number }> = {};
    periodSales.forEach((s: any) => {
      const seller = s.seller_name || s.created_by || "Vendedor Padrão";
      if (!sellerSalesMap[seller]) {
        sellerSalesMap[seller] = { name: seller, revenue: 0, count: 0 };
      }
      sellerSalesMap[seller].revenue += parseFloat(s.total) || 0;
      sellerSalesMap[seller].count += 1;
    });

    const topSellers = Object.values(sellerSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      periodRevenue,
      salesCount,
      averageTicket,
      periodPurchasesTotal,
      periodPurchasesCount: periodPurchases.length,
      totalReceivable,
      pendingReceivableCount: pendingReceivableList.length,
      totalPayable,
      pendingPayableCount: pendingPayableList.length,
      projectedBalance,
      openCashiersCount,
      openCashiersTotalBalance,
      openCashiersList,
      lowStockList,
      dailyChartData,
      paymentMethodsData,
      topSellingProducts,
      topSellers
    };
  }, [sales, purchases, accountsReceivable, accountsPayable, cashiers, products, dateFilter]);

  const handleExportCSV = () => {
    try {
      const headers = ["Data,Número Venda,Cliente,Meio Pagamento,Status,Total\n"];
      const rows = sales.slice(0, 50).map((s: any) => 
        `"${formatBR(s.sale_date)}","#${s.sale_number || s.id.substring(0,6)}","${s.client_name || 'Consumidor Final'}","${s.payment_method || 'PIX'}","${s.status || 'Concluída'}","${(s.total || 0).toFixed(2)}"`
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_vendas_dashboard_${formatBR(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Relatório baixado com sucesso!");
    } catch {
      toast.error("Erro ao gerar relatório CSV.");
    }
  };

  if (!hasPermission('dashboard.view')) {
    return <SellerDashboard />;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel Executivo</h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-extrabold border border-blue-200">
              {companyName}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Olá, <span className="font-bold text-gray-800">{user?.full_name?.split(' ')[0]}</span>. Aqui está o resumo operacional e financeiro do seu negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'master' && (
            <Link 
              to="/DashboardGlobal"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-indigo-100"
            >
              <Globe size={16} />
              Dashboard Global
            </Link>
          )}

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download size={15} /> Exportar Vendas
          </button>

          <Link
            to="/Vender"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-100 transition-all"
          >
            <ShoppingCart size={16} /> Abrir PDV / Vender
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter size={16} className="text-gray-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">Período:</span>
          {(["30d", "7d", "today", "month"] as const).map(p => (
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
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" />
            Atualizado em tempo real
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            {clientsData.length} Clientes Cadastrados
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Faturamento do Período" 
          value={formatCurrency(periodMetrics.periodRevenue)} 
          icon={TrendingUp} 
          color="emerald"
          badge={`${periodMetrics.salesCount} vendas`}
          subtitle={`Ticket Médio: ${formatCurrency(periodMetrics.averageTicket)}`}
        />
        <StatCard 
          title="Contas a Receber" 
          value={formatCurrency(periodMetrics.totalReceivable)} 
          icon={ArrowUpRight} 
          color="blue"
          badge={`${periodMetrics.pendingReceivableCount} pendentes`}
          subtitle="Entradas futuras confirmadas"
        />
        <StatCard 
          title="Contas a Pagar" 
          value={formatCurrency(periodMetrics.totalPayable)} 
          icon={ArrowDownLeft} 
          color="rose"
          badge={`${periodMetrics.pendingPayableCount} pendentes`}
          subtitle="Compromissos e despesas"
        />
        <StatCard 
          title="Saldo Projetado" 
          value={formatCurrency(periodMetrics.projectedBalance)} 
          icon={Wallet} 
          color={periodMetrics.projectedBalance >= 0 ? "emerald" : "rose"}
          subtitle="Receber (-) Pagar"
        />
        <StatCard 
          title="Compras & Entradas" 
          value={formatCurrency(periodMetrics.periodPurchasesTotal)} 
          icon={ShoppingCart} 
          color="amber"
          badge={`${periodMetrics.periodPurchasesCount} pedidos`}
          subtitle="Aportes de estoque no período"
        />
        <StatCard 
          title="Caixas Abertos" 
          value={`${periodMetrics.openCashiersCount} caixas`} 
          icon={Zap} 
          color="purple"
          badge={formatCurrency(periodMetrics.openCashiersTotalBalance)}
          subtitle="Saldo em gavetas ativas"
        />
        <StatCard 
          title="Estoque em Alerta" 
          value={`${periodMetrics.lowStockList.length} itens`} 
          icon={AlertTriangle} 
          color={periodMetrics.lowStockList.length > 0 ? "rose" : "emerald"}
          subtitle="Abaixo do limite mínimo"
        />
        <StatCard 
          title="Catálogo Ativo" 
          value={`${products.length} produtos`} 
          icon={Package} 
          color="indigo"
          subtitle="Itens disponíveis para venda"
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
          {[
            { id: "overview", label: "Desempenho de Vendas", icon: BarChart3 },
            { id: "financial", label: "Fluxo Financeiro & Projeção", icon: Wallet },
            { id: "stock", label: "Estoque & Reposição", icon: Package },
            { id: "sales", label: "Últimas Vendas & Caixas", icon: ShoppingCart }
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

      {/* TAB 1: DESEMPENHO DE VENDAS */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Timeline Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Evolução Diária do Faturamento</h3>
                  <p className="text-xs text-gray-500">Curva de vendas no período selecionado</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={periodMetrics.dailyChartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Formas de Pagamento</h3>
                  <p className="text-xs text-gray-500">Distribuição por meio de recebimento</p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <CreditCard size={20} />
                </div>
              </div>

              {periodMetrics.paymentMethodsData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400 font-medium">
                  Nenhuma venda no período.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={periodMetrics.paymentMethodsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="total"
                        >
                          {periodMetrics.paymentMethodsData.map((_, index) => (
                            <Cell key={`pm-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {periodMetrics.paymentMethodsData.map((pm, idx) => (
                      <div key={pm.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50">
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

          {/* Top Products and Top Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Produtos Mais Vendidos</h3>
                  <p className="text-xs text-gray-500">Ranking por faturamento no período</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award size={20} />
                </div>
              </div>

              {periodMetrics.topSellingProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  Nenhum produto registrado nas vendas do período.
                </div>
              ) : (
                <div className="space-y-3">
                  {periodMetrics.topSellingProducts.map((p, idx) => (
                    <div key={p.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          idx === 0 ? "bg-amber-100 text-amber-800" :
                          idx === 1 ? "bg-gray-200 text-gray-800" :
                          idx === 2 ? "bg-orange-100 text-orange-800" :
                          "bg-blue-50 text-blue-700"
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[180px] sm:max-w-xs">{p.name}</p>
                          <p className="text-[11px] text-gray-500">{p.qty} unidades vendidas</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Desempenho da Equipe de Vendas</h3>
                  <p className="text-xs text-gray-500">Vendedores com maior volume de vendas</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users size={20} />
                </div>
              </div>

              {periodMetrics.topSellers.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  Nenhum registro de vendas no período.
                </div>
              ) : (
                <div className="space-y-3">
                  {periodMetrics.topSellers.map((s) => (
                    <div key={s.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{s.name}</p>
                          <p className="text-[11px] text-gray-500">{s.count} atendimento(s)</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-indigo-700">{formatCurrency(s.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLUXO FINANCEIRO */}
      {activeTab === "financial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Resumo de Contas em Aberto</h3>
                <p className="text-xs text-gray-500">Projeção imediata de lançamentos pendentes</p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowRightLeft size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <span className="text-xs font-bold text-emerald-700 uppercase">A Receber Total</span>
                <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(periodMetrics.totalReceivable)}</p>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">{periodMetrics.pendingReceivableCount} lançamentos</p>
              </div>

              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
                <span className="text-xs font-bold text-rose-700 uppercase">A Pagar Total</span>
                <p className="text-xl font-black text-rose-700 mt-1">{formatCurrency(periodMetrics.totalPayable)}</p>
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{periodMetrics.pendingPayableCount} obrigações</p>
              </div>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Saldo Líquido Projetado</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  periodMetrics.projectedBalance >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {periodMetrics.projectedBalance >= 0 ? "Superávit" : "Déficit"}
                </span>
              </div>
              <p className="text-3xl font-black mt-2">{formatCurrency(periodMetrics.projectedBalance)}</p>
              <p className="text-xs text-slate-300 mt-1">Diferença entre o total a receber e a pagar pendentes na empresa.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link to="/ContasReceber" className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl text-center transition-colors">
                Ver Contas a Receber
              </Link>
              <Link to="/ContasPagar" className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl text-center transition-colors">
                Ver Contas a Pagar
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900">Atalhos Financeiros Rápidos</h3>
            <p className="text-xs text-gray-500">Operações mais utilizadas para gestão financeira</p>

            <div className="grid grid-cols-2 gap-4">
              <Link to="/ConciliacaoBancaria" className="p-4 bg-blue-50/70 hover:bg-blue-100/80 rounded-2xl border border-blue-100 flex flex-col gap-2 transition-all">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <span className="text-xs font-extrabold text-blue-900">Conciliação OFX</span>
                <span className="text-[11px] text-blue-600">Importar extratos bancários</span>
              </Link>

              <Link to="/RelatorioFluxoCaixa" className="p-4 bg-purple-50/70 hover:bg-purple-100/80 rounded-2xl border border-purple-100 flex flex-col gap-2 transition-all">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <span className="text-xs font-extrabold text-purple-900">Relatório de Caixa</span>
                <span className="text-[11px] text-purple-600">Demonstrativo DRE e Fluxo</span>
              </Link>

              <Link to="/Comissoes" className="p-4 bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl border border-amber-100 flex flex-col gap-2 transition-all">
                <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center">
                  <Award size={20} />
                </div>
                <span className="text-xs font-extrabold text-amber-900">Comissões</span>
                <span className="text-[11px] text-amber-600">Apuração de vendedores</span>
              </Link>

              <Link to="/ContasBancarias" className="p-4 bg-emerald-50/70 hover:bg-emerald-100/80 rounded-2xl border border-emerald-100 flex flex-col gap-2 transition-all">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <span className="text-xs font-extrabold text-emerald-900">Contas Bancárias</span>
                <span className="text-[11px] text-emerald-600">Gerenciar saldos e bancos</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESTOQUE & REPOSIÇÃO */}
      {activeTab === "stock" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Produtos com Estoque Baixo ou Crítico</h3>
              <p className="text-xs text-gray-500">Itens que necessitam de pedido de compra ou reposição urgente</p>
            </div>
            <Link to="/Produtos" className="text-xs font-bold text-blue-600 hover:underline">
              Gerenciar Estoque Completo
            </Link>
          </div>

          {periodMetrics.lowStockList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-gray-800">Estoque Regular!</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1">Nenhum produto está abaixo da quantidade mínima estipulada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 font-bold">Produto</th>
                    <th className="pb-3 font-bold">Código / Categoria</th>
                    <th className="pb-3 font-bold">Estoque Atual</th>
                    <th className="pb-3 font-bold">Mínimo</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                  {periodMetrics.lowStockList.map((p: any) => {
                    const currentStock = p.stock_quantity ?? p.stock ?? 0;
                    const minStock = p.min_stock ?? 5;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-bold text-gray-900">{p.name}</td>
                        <td className="py-3 text-gray-500">{p.code || p.category_name || "Geral"}</td>
                        <td className="py-3 font-black text-rose-600">{currentStock} un</td>
                        <td className="py-3 text-gray-600">{minStock} un</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold uppercase text-[10px]">
                            Crítico
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link to="/Compras" className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            Comprar <ArrowRight size={12} />
                          </Link>
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

      {/* TAB 4: ÚLTIMAS VENDAS E CAIXAS */}
      {activeTab === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Vendas Recentes</h3>
                <p className="text-xs text-gray-500">Últimas transações finalizadas no sistema</p>
              </div>
              <Link to="/HistoricoVendas" className="text-xs font-bold text-blue-600 hover:underline">
                Ver Histórico Completo
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 font-bold">Venda</th>
                    <th className="pb-3 font-bold">Cliente</th>
                    <th className="pb-3 font-bold">Forma</th>
                    <th className="pb-3 font-bold">Data</th>
                    <th className="pb-3 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-700">
                  {sales.slice(0, 8).map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-bold text-gray-900">#{sale.sale_number || sale.id.substring(0, 6)}</td>
                      <td className="py-3 text-gray-600">{sale.client_name || "Consumidor Final"}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold text-[10px]">
                          {sale.payment_method || "PIX"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">{formatBR(sale.sale_date)}</td>
                      <td className="py-3 text-right font-black text-emerald-600">{formatCurrency(sale.total || 0)}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-gray-400">Nenhuma venda realizada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Caixas Abertos</h3>
              <Link to="/Caixas" className="text-xs font-bold text-blue-600 hover:underline">
                Gerenciar Caixas
              </Link>
            </div>

            {periodMetrics.openCashiersList.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 font-medium">
                Nenhum caixa aberto nesta empresa no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {periodMetrics.openCashiersList.map((cashier: any) => (
                  <div key={cashier.id} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-900">{cashier.name}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aberto
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>Operador: {cashier.opened_by || "Atendente"}</span>
                      <span className="font-bold text-gray-900">{formatCurrency(cashier.balance || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

