import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getNowBR } from "../lib/dateUtils";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart, 
  Search, 
  Filter,
  ArrowRight,
  Package,
  Download,
  Calendar
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { subDays, isAfter, parseISO } from "date-fns";
import ExportButton from "../components/ExportButton";

export default function InventoryTurnoverReport() {
  const { user, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");

  const canView = hasPermission('reports.view');

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Package size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar o relatório de giro de estoque. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  const currentCompanyId = api.getCompanyId();

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products"),
    enabled: !!user
  });

  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({ 
    queryKey: ["inventory_movements", currentCompanyId], 
    queryFn: () => api.get("inventory_movements"),
    enabled: !!user
  });

  const { data: categories = [] } = useQuery({ 
    queryKey: ["categories", currentCompanyId], 
    queryFn: () => api.get("categories"),
    enabled: !!user
  });

  const { data: suppliers = [] } = useQuery({ 
    queryKey: ["suppliers", currentCompanyId], 
    queryFn: () => api.get("suppliers"),
    enabled: !!user
  });

  const reportData = useMemo(() => {
    const now = getNowBR();
    const date30 = subDays(now, 30);
    const date60 = subDays(now, 60);
    const date90 = subDays(now, 90);

    // Filter movements to get only sales
    const salesMovements = movements.filter((m: any) => 
      m.type === 'OUT' && (m.reason === 'SALE' || m.reason === 'SALE_KIT_COMPONENT')
    );

    return products.map((product: any) => {
      const productSales = salesMovements.filter((m: any) => m.product_id === product.id);
      
      const getSalesInPeriod = (startDate: Date) => {
        return productSales
          .filter((m: any) => {
            const mDate = m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000) : new Date(m.timestamp);
            return isAfter(mDate, startDate);
          })
          .reduce((acc: number, m: any) => acc + m.quantity, 0);
      };

      const sales30 = getSalesInPeriod(date30);
      const sales60 = getSalesInPeriod(date60);
      const sales90 = getSalesInPeriod(date90);

      const dailyAvg30 = sales30 / 30;
      const dailyAvg90 = sales90 / 90;
      
      // Suggested purchase logic:
      // Target stock = max(min_stock, dailyAvg30 * 30 days buffer)
      const targetStock = Math.max(product.min_stock || 0, Math.ceil(dailyAvg30 * 30));
      const suggestedPurchase = Math.max(0, targetStock - (product.stock_quantity || 0));

      const daysOfStock = dailyAvg30 > 0 ? (product.stock_quantity / dailyAvg30) : Infinity;
      const turnoverRate = dailyAvg30 > 0 ? (sales30 / (product.stock_quantity || 1)) : 0;

      return {
        ...product,
        sales30,
        sales60,
        sales90,
        dailyAvg30,
        dailyAvg90,
        suggestedPurchase,
        daysOfStock,
        turnoverRate,
        isCritical: (product.stock_quantity || 0) <= (product.min_stock || 0)
      };
    }).filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
      const matchesSupplier = selectedSupplier === "all" || p.supplier_id === selectedSupplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [products, movements, searchTerm, selectedCategory, selectedSupplier]);

  const topTurnover = useMemo(() => {
    return [...reportData]
      .sort((a, b) => b.sales30 - a.sales30)
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
        vendas: p.sales30,
        fullName: p.name
      }));
  }, [reportData]);

  const stats = useMemo(() => {
    const criticalCount = reportData.filter(p => p.isCritical).length;
    const totalSuggestedValue = reportData.reduce((acc, p) => acc + (p.suggestedPurchase * (p.cost_price || 0)), 0);
    const avgTurnover = reportData.reduce((acc, p) => acc + p.sales30, 0) / (reportData.length || 1);
    const globalTurnoverRate = reportData.reduce((acc, p) => acc + p.turnoverRate, 0) / (reportData.length || 1);

    return { criticalCount, totalSuggestedValue, avgTurnover, globalTurnoverRate };
  }, [reportData]);

  if (isLoadingProducts || isLoadingMovements) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Giro e Reposição</h1>
          <p className="text-gray-500">Análise de velocidade de vendas e sugestões de compra baseadas em demanda.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={reportData} 
            filename="relatorio-giro-reposicao" 
            format="xlsx" 
            title="Relatório de Giro e Reposição"
            headers={{
              name: 'Produto',
              stock_quantity: 'Estoque Atual',
              min_stock: 'Estoque Mínimo',
              sales30: 'Vendas (30d)',
              sales90: 'Vendas (90d)',
              dailyAvg30: 'Média Diária',
              suggestedPurchase: 'Sugestão de Compra',
              daysOfStock: 'Dias de Estoque'
            }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Estoque Crítico</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.criticalCount} itens</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Giro Médio (30d)</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.avgTurnover.toFixed(1)} un/mês</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Taxa de Giro (30d)</p>
            <h3 className="text-2xl font-bold text-gray-900">{(stats.globalTurnoverRate * 100).toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      {/* Filters & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Top 10 Produtos por Giro (30 dias)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTurnover}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                  {topTurnover.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#3b82f6'} fillOpacity={1 - index * 0.08} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Filter size={20} className="text-blue-600" />
            Filtros de Análise
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
              <select 
                className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Fornecedor</label>
              <select 
                className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="all">Todos os Fornecedores</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Detalhamento de Giro e Reposição</h3>
          <span className="text-xs text-gray-400 font-medium">Exibindo {reportData.length} produtos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4 font-bold">Produto</th>
                <th className="px-6 py-4 font-bold text-center">Estoque Atual</th>
                <th className="px-6 py-4 font-bold text-center">Mínimo</th>
                <th className="px-6 py-4 font-bold text-center">Vendas (30d)</th>
                <th className="px-6 py-4 font-bold text-center">Média Diária</th>
                <th className="px-6 py-4 font-bold text-center">Taxa Giro</th>
                <th className="px-6 py-4 font-bold text-center">Dias Restantes</th>
                <th className="px-6 py-4 font-bold text-center">Sugestão Compra</th>
                <th className="px-6 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportData.map((p: any) => (
                <tr key={p.id} className="text-sm hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku || p.id.substr(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={p.isCritical ? "text-red-600 font-bold" : "text-gray-900 font-medium"}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-500">{p.min_stock || 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-600">{p.sales30}</td>
                  <td className="px-6 py-4 text-center text-gray-500">{p.dailyAvg30.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-purple-600 font-medium">{(p.turnoverRate * 100).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.daysOfStock === Infinity ? (
                      <span className="text-gray-400">---</span>
                    ) : (
                      <span className={p.daysOfStock < 7 ? "text-red-600 font-bold" : "text-gray-900"}>
                        {Math.floor(p.daysOfStock)} dias
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.suggestedPurchase > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-green-600 font-bold">
                        <ArrowRight size={14} />
                        {p.suggestedPurchase}
                      </div>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.isCritical ? (
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase">Crítico</span>
                    ) : p.daysOfStock < 15 ? (
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-bold uppercase">Alerta</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase">Saudável</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
