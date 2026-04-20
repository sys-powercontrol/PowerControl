import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR, getTodayBR } from "../lib/dateUtils";
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

const StatCard = ({ title, value, icon: Icon, color, subtitle, progress }: any) => (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <Icon size={24} />
        </div>
      </div>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {progress !== undefined ? (
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-[10px] opacity-80">
            <span>Progresso da Meta</span>
            <span>{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500" 
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs mt-2 opacity-70">{subtitle}</p>
      )}
    </div>
  );

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
          value={`R$ ${metrics.totalToday.toLocaleString()}`} 
          icon={ShoppingCart} 
          color="from-blue-500 to-blue-600"
          subtitle={`${metrics.countToday} vendas realizadas hoje`}
        />
        <StatCard 
          title="Vendas no Mês" 
          value={`R$ ${metrics.totalMonth.toLocaleString()}`} 
          icon={TrendingUp} 
          color="from-green-500 to-green-600"
          subtitle={`${metrics.countMonth} vendas no mês`}
        />
        <StatCard 
          title="Minhas Comissões" 
          value={`R$ ${metrics.totalCommissions.toLocaleString()}`} 
          icon={DollarSign} 
          color="from-purple-500 to-purple-600"
          subtitle={`Baseado em ${currentSeller?.commission_rate || 0}% de comissão`}
        />
        <StatCard 
          title="Meta Mensal" 
          value={`R$ ${metrics.goal.toLocaleString()}`} 
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
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                  <td className="py-4 font-bold text-green-600">R$ {sale.total?.toLocaleString()}</td>
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
