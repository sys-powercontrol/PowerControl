import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR } from "../lib/dateUtils";
import { 
  TrendingUp, 
  Building2, 
  Users, 
  DollarSign,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon,
  Globe
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { subDays, format, startOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f43f5e'];

export default function GlobalDashboard() {
  const { user } = useAuth();

  if (user?.role !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Globe size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é exclusiva para o Administrador Master do sistema.
          </p>
        </div>
      </div>
    );
  }

  const { data: companies = [] } = useQuery({ 
    queryKey: ["companies", "all"], 
    queryFn: () => api.get("companies", { _all: true }) 
  });
  const { data: sales = [] } = useQuery({ 
    queryKey: ["sales", "all"], 
    queryFn: () => api.get("sales", { _all: true }) 
  });
  const { data: users = [] } = useQuery({ 
    queryKey: ["users", "all"], 
    queryFn: () => api.get("users", { _all: true }) 
  });

  const metrics = useMemo(() => {
    const now = getNowBR();
    const monthStart = startOfMonth(now);
    
    const activeCompanies = companies.filter((c: any) => c.is_active).length;
    const totalRevenue = sales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    
    const monthlySales = sales.filter((s: any) => {
      const date = new Date(s.sale_date);
      return isWithinInterval(date, { start: monthStart, end: now });
    });
    
    const monthlyRevenue = monthlySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);
    
    // Revenue by company ranking
    const companyRevenueMap: Record<string, number> = {};
    sales.forEach((s: any) => {
      if (s.company_id) {
        companyRevenueMap[s.company_id] = (companyRevenueMap[s.company_id] || 0) + (s.total || 0);
      }
    });

    const ranking = Object.entries(companyRevenueMap)
      .map(([id, total]) => ({
        id,
        name: companies.find((c: any) => c.id === id)?.name || "Desconhecida",
        total
      }))
      .sort((a, b) => b.total - a.total);

    // Revenue by day (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(now, 29 - i);
      return formatBR(d, 'yyyy-MM-dd');
    });

    const dailyRevenue = last30Days.map(date => {
      const daySales = sales.filter((s: any) => s.sale_date && formatBR(s.sale_date, 'yyyy-MM-dd') === date);
      return {
        date: formatBR(date, 'dd/MM'),
        total: daySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0)
      };
    });

    return {
      activeCompanies,
      totalRevenue,
      monthlyRevenue,
      monthlySalesCount: monthlySales.length,
      totalUsers: users.length,
      ranking,
      dailyRevenue
    };
  }, [companies, sales, users]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
          <ArrowUpRight size={14} />
          <span>Ativo</span>
        </div>
      </div>
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs mt-2 text-gray-400 font-medium">{subtitle}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
          <Globe size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Global</h1>
          <p className="text-gray-500">Visão consolidada de todo o ecossistema PowerControl.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Empresas Ativas" 
          value={metrics.activeCompanies.toString()} 
          icon={Building2} 
          color="bg-blue-50 text-blue-600"
          subtitle={`De um total de ${companies.length} empresas`}
        />
        <StatCard 
          title="Faturamento Mensal" 
          value={`R$ ${metrics.monthlyRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-green-50 text-green-600"
          subtitle={`${metrics.monthlySalesCount} vendas este mês`}
        />
        <StatCard 
          title="Faturamento Total" 
          value={`R$ ${metrics.totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-purple-50 text-purple-600"
          subtitle="Acumulado histórico"
        />
        <StatCard 
          title="Usuários Totais" 
          value={metrics.totalUsers.toString()} 
          icon={Users} 
          color="bg-orange-50 text-orange-600"
          subtitle="Em todas as empresas"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Revenue Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Evolução do Faturamento</h3>
              <p className="text-sm text-gray-500">Vendas consolidadas nos últimos 30 dias</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Faturamento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Distribuição por Empresa</h3>
              <p className="text-sm text-gray-500">Participação no faturamento total</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl">
              <PieChartIcon size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ranking.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {metrics.ranking.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ranking Table/Bar Chart */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Ranking de Faturamento</h3>
            <p className="text-sm text-gray-500">Empresas com maior volume de vendas</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-xl">
            <TrendingUp size={20} className="text-green-600" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ranking.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }}
                  width={150}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="pb-4 font-bold">Posição</th>
                  <th className="pb-4 font-bold">Empresa</th>
                  <th className="pb-4 font-bold text-right">Total Vendido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metrics.ranking.slice(0, 10).map((company, index) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-100 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "text-gray-400"
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="font-bold text-gray-900">{company.name}</span>
                    </td>
                    <td className="py-4 text-right font-bold text-blue-600">
                      R$ {company.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
