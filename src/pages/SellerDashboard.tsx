import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR, getTodayBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Target,
  ArrowRight
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

const StatCard = ({ title, value, icon: Icon, color, subtitle, progress }: any) => {
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
          
          {progress !== undefined ? (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-gray-500">
                <span>Progresso da Meta</span>
                <span className={theme.valueColor}>{Math.min(100, Math.round(progress))}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${color.includes("orange") ? "bg-orange-500" : "bg-blue-600"}`} 
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1.5 leading-none font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {theme.type === "wave" && progress === undefined && (
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

export default function SellerDashboard() {
  const { user } = useAuth();
  const currentCompanyId = api.getCompanyId();

  const { data: salesData = [] } = useQuery({ 
    queryKey: ["sales", currentCompanyId], 
    queryFn: () => api.get("sales"),
    enabled: !!user
  });

  const { data: sellersData = [], isLoading: isLoadingSellers } = useQuery({ 
    queryKey: ["sellers", currentCompanyId], 
    queryFn: () => api.get("sellers"),
    enabled: !!user
  });

  const currentSeller = useMemo(() => {
    return sellersData.find((s: any) => s.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [sellersData, user?.email]);

  const sellerSales = useMemo(() => {
    if (!currentSeller) return [];
    return salesData.filter((sale: any) => sale.seller_id === currentSeller.id);
  }, [salesData, currentSeller]);

  const metrics = useMemo(() => {
    const today = getTodayBR();
    const thisMonth = today.slice(0, 7);

    const salesToday = sellerSales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === today);
    const salesMonth = sellerSales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM') === thisMonth);

    const totalToday = salesToday.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    const totalMonth = salesMonth.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    
    const commissionRate = currentSeller?.commission_rate || 0;
    const totalCommissions = (totalMonth * commissionRate) / 100;

    const goal = currentSeller?.monthly_goal || 0;
    const goalProgress = goal > 0 ? (totalMonth / goal) * 100 : 0;

    return {
      totalToday,
      totalMonth,
      totalCommissions,
      goal,
      goalProgress,
      countToday: salesToday.length,
      countMonth: salesMonth.length
    };
  }, [sellerSales, currentSeller]);

  // Generate chart data from last 7 days
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = getNowBR();
      d.setDate(d.getDate() - (6 - i));
      return formatBR(d, 'yyyy-MM-dd');
    });

    return last7Days.map(date => {
      const daySales = sellerSales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === date);
      return {
        name: formatBR(date, 'dd/MM'),
        value: daySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0)
      };
    });
  }, [sellerSales]);



  if (!currentSeller && !isLoadingSellers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-full">
          <Target size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendedor não vinculado</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Seu usuário não está vinculado a um registro de vendedor. 
            Peça ao administrador para cadastrar seu e-mail ({user?.email}) na lista de vendedores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel do Vendedor</h1>
        <p className="text-gray-500">Olá, {user?.full_name?.split(' ')[0]}. Acompanhe seu desempenho de vendas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas Hoje" 
          value={formatCurrency(metrics.totalToday)} 
          icon={ShoppingCart} 
          color="from-blue-500 to-blue-600"
          subtitle={`${metrics.countToday} vendas realizadas hoje`}
        />
        <StatCard 
          title="Vendas no Mês" 
          value={formatCurrency(metrics.totalMonth)} 
          icon={TrendingUp} 
          color="from-green-500 to-green-600"
          subtitle={`${metrics.countMonth} vendas no mês`}
        />
        <StatCard 
          title="Minhas Comissões" 
          value={formatCurrency(metrics.totalCommissions)} 
          icon={DollarSign} 
          color="from-purple-500 to-purple-600"
          subtitle={`Baseado em ${currentSeller?.commission_rate || 0}% de comissão`}
        />
        <StatCard 
          title="Meta Mensal" 
          value={formatCurrency(metrics.goal)} 
          icon={Target} 
          color="from-orange-500 to-orange-600"
          progress={metrics.goalProgress}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg">Meu Desempenho (7 dias)</h2>
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

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-bold text-lg mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link to="/Vender" className="flex items-center justify-between p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-bold">
              <div className="flex items-center gap-3">
                <ShoppingCart size={20} />
                <span>Nova Venda</span>
              </div>
              <ArrowRight size={18} />
            </Link>
            <Link to="/Clientes" className="flex items-center justify-between p-4 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors font-bold">
              <div className="flex items-center gap-3">
                <ArrowRight size={20} className="rotate-[-45deg]" />
                <span>Cadastrar Cliente</span>
              </div>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg">Minhas Vendas Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="pb-4 font-medium">Número</th>
                <th className="pb-4 font-medium">Cliente</th>
                <th className="pb-4 font-medium">Total</th>
                <th className="pb-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...sellerSales].sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).slice(0, 5).map((sale: any) => (
                <tr key={sale.id} className="text-sm">
                  <td className="py-4 font-medium text-gray-900">#{sale.sale_number || "001"}</td>
                  <td className="py-4 text-gray-600">{sale.client_name || "Consumidor Final"}</td>
                  <td className="py-4 font-bold text-green-600">{formatCurrency(sale.total || 0)}</td>
                  <td className="py-4 text-gray-500">{formatBR(sale.sale_date)}</td>
                </tr>
              ))}
              {sellerSales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">Você ainda não realizou vendas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
