import { useMemo } from "react";
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
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Globe
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { Link } from "react-router-dom";

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => {
  const getTheme = (col: string) => {
    if (col.includes("green")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-emerald-50/10 border border-emerald-100",
        iconBg: "bg-emerald-500 text-white shadow-md shadow-emerald-100/50",
        valueColor: "text-emerald-600",
        waveColor: "#10b981",
        type: "wave",
      };
    }
    if (col.includes("orange")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-orange-50/10 border border-orange-100",
        iconBg: "bg-orange-500 text-white shadow-md shadow-orange-100/50",
        valueColor: "text-orange-500",
        waveColor: "#f97316",
        type: "wave",
      };
    }
    if (col.includes("blue")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-blue-50/10 border border-blue-100",
        iconBg: "bg-blue-600 text-white shadow-md shadow-blue-100/50",
        valueColor: "text-blue-600",
        waveColor: "#2563eb",
        type: "wave",
      };
    }
    if (col.includes("red")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-red-50/10 border border-red-100",
        iconBg: "bg-red-500 text-white shadow-md shadow-red-100/50",
        valueColor: "text-red-500",
        waveColor: "#ef4444",
        type: "wave",
      };
    }
    if (col.includes("yellow")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-amber-50/15 border border-amber-100",
        iconBg: "bg-amber-500 text-white shadow-md shadow-amber-100/50",
        valueColor: "text-amber-500",
        type: "box",
      };
    }
    if (col.includes("purple") || col.includes("violet")) {
      return {
        cardBg: "bg-gradient-to-br from-white to-violet-50/15 border border-violet-100",
        iconBg: "bg-violet-600 text-white shadow-md shadow-violet-100/50",
        valueColor: "text-violet-600",
        type: "cash-register",
      };
    }
    return {
      cardBg: "bg-white border border-gray-100",
      iconBg: "bg-gray-500 text-white",
      valueColor: "text-gray-900",
      type: "none",
    };
  };

  const theme = getTheme(color);

  return (
    <div className={`p-6 rounded-[24px] relative overflow-hidden transition-all duration-300 hover:shadow-md ${theme.cardBg}`}>
      <div className="flex items-center gap-4 z-10 relative">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-semibold text-gray-500 tracking-tight leading-none">{title}</h3>
          <p className={`text-2xl font-extrabold mt-1 tracking-tight leading-none ${theme.valueColor}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-none font-medium">{subtitle}</p>
        </div>
      </div>

      {theme.type === "wave" && (
        <svg className="absolute bottom-0 left-0 right-0 w-full h-8 pointer-events-none select-none" viewBox="0 0 400 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.waveColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={theme.waveColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path 
            d="M 0 38 C 30 38, 50 15, 80 20 C 110 25, 130 42, 170 42 C 210 42, 240 18, 280 20 C 320 22, 350 38, 400 25 L 400 50 L 0 50 Z" 
            fill={`url(#grad-${title.replace(/\s+/g, '')})`}
          />
          <path 
            d="M 0 38 C 30 38, 50 15, 80 20 C 110 25, 130 42, 170 42 C 210 42, 240 18, 280 20 C 320 22, 350 38, 400 25" 
            fill="none" 
            stroke={theme.waveColor} 
            strokeWidth="1.8" 
            strokeLinecap="round"
          />
        </svg>
      )}

      {theme.type === "box" && (
        <svg className="absolute -right-2 -bottom-2 w-24 h-24 text-amber-500/10 pointer-events-none select-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      )}

      {theme.type === "cash-register" && (
        <svg className="absolute -right-2 -bottom-2 w-24 h-24 text-violet-500/10 pointer-events-none select-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M4 19h16a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Z" />
          <path d="M6 14V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6" />
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M12 14v4" />
          <path d="M9 17h6" />
          <circle cx="8" cy="11" r="0.75" />
          <circle cx="12" cy="11" r="0.75" />
          <circle cx="16" cy="11" r="0.75" />
        </svg>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const currentCompanyId = api.getCompanyId();



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

  const currentMonthStr = useMemo(() => formatBR(getNowBR(), 'yyyy-MM'), []);
  const salesThisMonth = useMemo(() => {
    return sales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM') === currentMonthStr);
  }, [sales, currentMonthStr]);

  const totalSalesMonth = useMemo(() => {
    return salesThisMonth.reduce((acc: number, sale: any) => acc + (sale.total || 0), 0);
  }, [salesThisMonth]);
  const totalReceivable = accountsReceivable.filter((a: any) => a.status === "Pendente").reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
  const totalPayable = accountsPayable.filter((a: any) => a.status === "Pendente").reduce((acc: number, a: any) => acc + (a.amount || 0), 0);
  const totalPurchases = purchases.reduce((acc: number, p: any) => acc + (p.total || 0), 0);
  const openCashiers = cashiers.filter((c: any) => c.status === "Aberto").length;
  const lowStockProducts = products.filter((p: any) => p.stock_quantity <= p.min_stock);

  // Generate chart data from last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = getNowBR();
    d.setDate(d.getDate() - (6 - i));
    return formatBR(d, 'yyyy-MM-dd');
  });

  const chartData = last7Days.map(date => {
    const daySales = sales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === date);
    return {
      name: formatBR(date, 'dd/MM'),
      value: daySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0)
    };
  });



  if (!hasPermission('dashboard.view')) {
    return <SellerDashboard />;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Olá, {user?.full_name?.split(' ')[0]}. Veja o que está acontecendo hoje.</p>
          </div>
          {user?.role === 'master' && (
            <Link 
              to="/DashboardGlobal"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Globe size={20} />
              Dashboard Global
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas do Mês" 
          value={formatCurrency(totalSalesMonth)} 
          icon={TrendingUp} 
          color="from-green-500 to-green-600"
          subtitle={`${salesThisMonth.length} vendas realizadas`}
        />
        <StatCard 
          title="Compras do Mês" 
          value={formatCurrency(totalPurchases)} 
          icon={ShoppingCart} 
          color="from-orange-500 to-orange-600"
          subtitle={`${purchases.length} entradas de estoque`}
        />
        <StatCard 
          title="A Receber" 
          value={formatCurrency(totalReceivable)} 
          icon={ArrowUpRight} 
          color="from-blue-500 to-blue-600"
          subtitle="Contas pendentes"
        />
        <StatCard 
          title="A Pagar" 
          value={formatCurrency(totalPayable)} 
          icon={ArrowDownLeft} 
          color="from-red-500 to-red-600"
          subtitle="Compromissos pendentes"
        />
        <StatCard 
          title="Estoque Baixo" 
          value={lowStockProducts.length.toString()} 
          icon={AlertTriangle} 
          color="from-yellow-500 to-yellow-600"
          subtitle="Produtos p/ reposição"
        />
        <StatCard 
          title="Caixas Abertos" 
          value={openCashiers.toString()} 
          icon={Zap} 
          color="from-purple-500 to-purple-600"
          subtitle="Operações em curso"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg">Evolução de Vendas</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">Este Mês</button>
              <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-full">30 Dias</button>
            </div>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Low Stock */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/Vender" className="flex flex-col items-center p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                <ShoppingCart size={24} className="mb-2" />
                <span className="text-xs font-bold">Vender</span>
              </Link>
              <Link to="/Clientes" className="flex flex-col items-center p-4 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors">
                <Users size={24} className="mb-2" />
                <span className="text-xs font-bold">Novo Cliente</span>
              </Link>
              <Link to="/Caixas" className="flex flex-col items-center p-4 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors">
                <CreditCard size={24} className="mb-2" />
                <span className="text-xs font-bold">Caixas</span>
              </Link>
              <Link to="/ContasPagar" className="flex flex-col items-center p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                <TrendingDown size={24} className="mb-2" />
                <span className="text-xs font-bold">Pagar</span>
              </Link>
            </div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertTriangle size={20} />
                <h2 className="font-bold text-lg">Estoque Baixo</h2>
              </div>
              <div className="space-y-4">
                {lowStockProducts.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.stock_quantity} un em estoque</p>
                    </div>
                    <Link to="/Produtos" className="text-blue-600 hover:text-blue-700">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg">Vendas Recentes</h2>
          <Link to="/HistoricoVendas" className="text-sm text-blue-600 font-medium">Ver todas</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="pb-4 font-medium">Número</th>
                <th className="pb-4 font-medium">Cliente</th>
                <th className="pb-4 font-medium">Total</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...sales].sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 5).map((sale: any) => (
                <tr key={sale.id} className="text-sm">
                  <td className="py-4 font-medium text-gray-900">#{sale.sale_number || "001"}</td>
                  <td className="py-4 text-gray-600">{sale.client_name || "Consumidor Final"}</td>
                  <td className="py-4 font-bold text-green-600">{formatCurrency(sale.total || 0)}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                      {sale.status || "Concluída"}
                    </span>
                  </td>
                  <td className="py-4 text-gray-500">{formatBR(sale.sale_date)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Nenhuma venda realizada hoje.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
