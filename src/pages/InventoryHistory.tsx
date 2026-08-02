import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { 
  History, 
  Search, 
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Filter,
  Package,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import React, { useState, useMemo } from "react";


import ExportButton from "../components/ExportButton";

export default function InventoryHistory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterReason, setFilterReason] = useState<string>("all");

  const currentCompanyId = api.getCompanyId();

  const { data: movements = [], isLoading } = useQuery({ 
    queryKey: ["inventory_movements", currentCompanyId], 
    queryFn: () => api.get("inventory_movements", { _orderBy: "timestamp", _orderDir: "desc" }),
    enabled: !!user
  });

  

  const filteredMovements = useMemo(() => {
    let result = [...movements];

    if (searchTerm) {
      result = result.filter((m: any) => 
        m.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reference_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      result = result.filter((m: any) => m.type === filterType);
    }

    if (filterReason !== "all") {
      result = result.filter((m: any) => m.reason === filterReason);
    }

    return result;
  }, [movements, searchTerm, filterType, filterReason]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "---";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return formatBR(date, "dd/MM/yyyy HH:mm");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex (Histórico de Estoque)</h1>
          <p className="text-gray-500">Rastreabilidade completa de todas as movimentações de produtos.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto min-w-0 items-stretch">
          <ExportButton 
            data={filteredMovements} 
            filename="historico-estoque" 
            format="xlsx" 
            title="Histórico de Movimentações de Estoque"
            headers={{
              timestamp: 'Data/Hora',
              product_name: 'Produto',
              type: 'Tipo',
              reason: 'Motivo',
              quantity: 'Quantidade',
              previous_stock: 'Estoque Anterior',
              current_stock: 'Estoque Atual',
              user_name: 'Usuário'
            }}
            className="bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-emerald-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileSpreadsheet className="text-emerald-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 leading-tight truncate">Excel</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <ExportButton 
            data={filteredMovements} 
            filename="historico-estoque" 
            format="pdf" 
            title="Histórico de Movimentações de Estoque"
            headers={{
              timestamp: 'Data/Hora',
              product_name: 'Produto',
              type: 'Tipo',
              reason: 'Motivo',
              quantity: 'Quantidade',
              previous_stock: 'Estoque Anterior',
              current_stock: 'Estoque Atual',
              user_name: 'Usuário'
            }}
            className="bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-rose-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="text-rose-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-rose-700 leading-tight truncate">PDF</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por produto, usuário ou referência..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos os Tipos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Saídas</option>
              <option value="ADJUSTMENT">Ajustes</option>
              <option value="TRANSFER_IN">Transferência (Entrada)</option>
              <option value="TRANSFER_OUT">Transferência (Saída)</option>
            </select>
          </div>

          <div className="relative">
            <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
            >
              <option value="all">Todos os Motivos</option>
              <option value="SALE">Vendas</option>
              <option value="PURCHASE">Compras</option>
              <option value="MANUAL">Manual</option>
              <option value="CANCEL">Cancelamentos</option>
              <option value="RETURN">Devoluções</option>
              <option value="TRANSFER">Transferências</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="pb-4 font-bold">Data/Hora</th>
                <th className="pb-4 font-bold">Produto</th>
                <th className="pb-4 font-bold">Tipo</th>
                <th className="pb-4 font-bold">Motivo / Obs</th>
                <th className="pb-4 font-bold text-center">Qtd</th>
                <th className="pb-4 font-bold text-center">Anterior</th>
                <th className="pb-4 font-bold text-center">Atual</th>
                <th className="pb-4 font-bold">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">Carregando movimentações...</td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma movimentação encontrada.</p>
                  </td>
                </tr>
              ) : filteredMovements.map((m: any) => (
                <tr key={m.id} className="text-sm group hover:bg-gray-50 transition-colors">
                  <td className="py-4 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDate(m.timestamp)}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                        <Package size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{m.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {m.product_id.substr(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {m.type === 'IN' || m.type === 'TRANSFER_IN' ? (
                        <div className="flex items-center gap-1 text-green-600 font-bold">
                          <ArrowUpCircle size={16} />
                          <span>{m.type === 'TRANSFER_IN' ? 'Transf. Entrada' : 'Entrada'}</span>
                        </div>
                      ) : m.type === 'OUT' || m.type === 'TRANSFER_OUT' ? (
                        <div className="flex items-center gap-1 text-red-600 font-bold">
                          <ArrowDownCircle size={16} />
                          <span>{m.type === 'TRANSFER_OUT' ? 'Transf. Saída' : 'Saída'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-blue-600 font-bold">
                          <Settings size={16} />
                          <span>Ajuste</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase w-fit">
                        {m.reason}
                      </span>
                      {m.observation && (
                        <span className="text-[10px] text-gray-500 italic max-w-[150px] truncate" title={m.observation}>
                          {m.observation}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-center font-bold text-gray-900">
                    {m.type === 'OUT' || m.type === 'TRANSFER_OUT' ? '-' : (m.type === 'IN' || m.type === 'TRANSFER_IN') ? '+' : ''}{m.quantity}
                  </td>
                  <td className="py-4 text-center text-gray-500">{m.previous_stock}</td>
                  <td className="py-4 text-center font-bold text-gray-900">{m.current_stock}</td>
                  <td className="py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {m.user_name?.charAt(0)}
                      </div>
                      <span className="truncate max-w-[100px]">{m.user_name}</span>
                    </div>
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
