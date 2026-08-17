import React, { useState, useMemo } from "react";
import { 
  Warehouse, 
  Search, 
  MapPin, 
  Boxes, 
  Layers, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileText, 
  SlidersHorizontal, 
  Building2, 
  RotateCcw,
  Sparkles,
  DollarSign,
  ArrowRight,
  BarChart3,
  LayoutGrid,
  ListFilter
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
import ExportButton from "../ExportButton";
import { formatCurrency } from "../../lib/currencyUtils";

interface StockMapPowerBIProps {
  products: any[];
  onSelectProductForAdjustment?: (productId: string) => void;
}

export default function StockMapPowerBI({ products, onSelectProductForAdjustment }: StockMapPowerBIProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [selectedRack, setSelectedRack] = useState<string>("ALL");
  const [selectedShelf, setSelectedShelf] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "MATRIX" | "CHARTS">("GRID");

  // Normalização e processamento dos produtos com dados de armazenagem
  const processedProducts = useMemo(() => {
    return products.map((p: any) => {
      const room = (p.storage_room || "").trim();
      const rack = (p.storage_rack || "").trim();
      const shelf = (p.storage_shelf || "").trim();
      const code = (p.storage_location || p.storage_code || "").trim();
      const hasLocation = Boolean(room || rack || shelf || code);
      
      const stock = Number(p.stock_quantity) || 0;
      const minStock = Number(p.min_stock) || 0;
      const costPrice = Number(p.cost_price) || 0;
      const salePrice = Number(p.price) || 0;
      const totalCostValue = stock * costPrice;
      const totalSaleValue = stock * salePrice;

      let status = "NORMAL";
      if (stock <= 0) status = "OUT_OF_STOCK";
      else if (minStock > 0 && stock <= minStock) status = "CRITICAL";
      else if (stock > 50) status = "HIGH";

      return {
        ...p,
        cleanRoom: room || "Sem Sala",
        cleanRack: rack || "Sem Armário",
        cleanShelf: shelf || "Sem Gaveta",
        cleanCode: code || (hasLocation ? `${room || '?'}-${rack || '?'}/${shelf || '?'}` : "SEM ENDEREÇO"),
        hasLocation,
        stock,
        minStock,
        costPrice,
        salePrice,
        totalCostValue,
        totalSaleValue,
        status
      };
    });
  }, [products]);

  // Lista única de salas, armários e gavetas para os Slicers
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    processedProducts.forEach(p => {
      if (p.storage_room) set.add(p.storage_room);
    });
    return Array.from(set).sort();
  }, [processedProducts]);

  const availableRacks = useMemo(() => {
    const set = new Set<string>();
    processedProducts.forEach(p => {
      if (selectedRoom === "ALL" || p.storage_room === selectedRoom) {
        if (p.storage_rack) set.add(p.storage_rack);
      }
    });
    return Array.from(set).sort();
  }, [processedProducts, selectedRoom]);

  const availableShelves = useMemo(() => {
    const set = new Set<string>();
    processedProducts.forEach(p => {
      const matchRoom = selectedRoom === "ALL" || p.storage_room === selectedRoom;
      const matchRack = selectedRack === "ALL" || p.storage_rack === selectedRack;
      if (matchRoom && matchRack && p.storage_shelf) {
        set.add(p.storage_shelf);
      }
    });
    return Array.from(set).sort();
  }, [processedProducts, selectedRoom, selectedRack]);

  // Filtragem dinâmica baseada nos slicers
  const filteredProducts = useMemo(() => {
    return processedProducts.filter(p => {
      const matchSearch = !searchTerm.trim() || 
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cleanCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.storage_room || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.storage_rack || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.storage_shelf || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchRoom = selectedRoom === "ALL" 
        ? true 
        : selectedRoom === "UNASSIGNED" 
          ? !p.hasLocation 
          : p.storage_room === selectedRoom;

      const matchRack = selectedRack === "ALL" 
        ? true 
        : p.storage_rack === selectedRack;

      const matchShelf = selectedShelf === "ALL" 
        ? true 
        : p.storage_shelf === selectedShelf;

      const matchStatus = stockStatusFilter === "ALL"
        ? true
        : stockStatusFilter === "CRITICAL"
          ? (p.status === "CRITICAL" || p.status === "OUT_OF_STOCK")
          : stockStatusFilter === "ASSIGNED"
            ? p.hasLocation
            : stockStatusFilter === "UNASSIGNED"
              ? !p.hasLocation
              : p.status === stockStatusFilter;

      return matchSearch && matchRoom && matchRack && matchShelf && matchStatus;
    });
  }, [processedProducts, searchTerm, selectedRoom, selectedRack, selectedShelf, stockStatusFilter]);

  // KPIs Estilo Power BI
  const kpis = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalUnits = filteredProducts.reduce((acc, p) => acc + p.stock, 0);
    const totalCost = filteredProducts.reduce((acc, p) => acc + p.totalCostValue, 0);
    const totalSale = filteredProducts.reduce((acc, p) => acc + p.totalSaleValue, 0);
    const assignedCount = filteredProducts.filter(p => p.hasLocation).length;
    const unassignedCount = totalItems - assignedCount;
    const coveragePercent = totalItems > 0 ? Math.round((assignedCount / totalItems) * 100) : 0;
    const criticalCount = filteredProducts.filter(p => p.status === "CRITICAL" || p.status === "OUT_OF_STOCK").length;

    return {
      totalItems,
      totalUnits,
      totalCost,
      totalSale,
      assignedCount,
      unassignedCount,
      coveragePercent,
      criticalCount
    };
  }, [filteredProducts]);

  // Agrupamento hierárquico por Sala -> Armário -> Gaveta para a Visão Mapa Físico (Warehouse Grid)
  const hierarchyData = useMemo(() => {
    const map: Record<string, Record<string, Record<string, any[]>>> = {};

    filteredProducts.forEach(p => {
      const roomKey = p.storage_room ? p.storage_room : "Sem Sala / Geral";
      const rackKey = p.storage_rack ? p.storage_rack : "Sem Armário";
      const shelfKey = p.storage_shelf ? p.storage_shelf : (p.cleanCode !== "SEM ENDEREÇO" ? p.cleanCode : "Geral");

      if (!map[roomKey]) map[roomKey] = {};
      if (!map[roomKey][rackKey]) map[roomKey][rackKey] = {};
      if (!map[roomKey][rackKey][shelfKey]) map[roomKey][rackKey][shelfKey] = [];

      map[roomKey][rackKey][shelfKey].push(p);
    });

    return map;
  }, [filteredProducts]);

  // Dados para gráficos Power BI
  const chartRoomData = useMemo(() => {
    const roomMap: Record<string, { name: string; units: number; value: number }> = {};
    filteredProducts.forEach(p => {
      const r = p.storage_room || "Não Alocado";
      if (!roomMap[r]) {
        roomMap[r] = { name: r, units: 0, value: 0 };
      }
      roomMap[r].units += p.stock;
      roomMap[r].value += p.totalCostValue;
    });

    return Object.values(roomMap).sort((a, b) => b.units - a.units).slice(0, 8);
  }, [filteredProducts]);

  const chartRackData = useMemo(() => {
    const rackMap: Record<string, { name: string; units: number; value: number }> = {};
    filteredProducts.forEach(p => {
      const r = p.storage_rack ? `${p.storage_room ? p.storage_room + ' - ' : ''}${p.storage_rack}` : "Sem Armário";
      if (!rackMap[r]) {
        rackMap[r] = { name: r, units: 0, value: 0 };
      }
      rackMap[r].units += p.stock;
      rackMap[r].value += p.totalCostValue;
    });

    return Object.values(rackMap).sort((a, b) => b.units - a.units).slice(0, 8);
  }, [filteredProducts]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedRoom("ALL");
    setSelectedRack("ALL");
    setSelectedShelf("ALL");
    setStockStatusFilter("ALL");
  };

  const exportHeaders = {
    cleanCode: "Endereço Abreviado",
    storage_room: "Sala / Setor",
    storage_rack: "Armário / Estante",
    storage_shelf: "Gaveta / Prateleira",
    name: "Produto",
    sku: "SKU",
    category_name: "Categoria",
    stock: "Qtd em Estoque",
    costPrice: "Preço Custo (R$)",
    totalCostValue: "Valor Total Custo (R$)",
    status: "Status Estoque"
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Power BI Top Navigation & Branding Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold tracking-wider uppercase border border-cyan-500/30 flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                Power BI Stock Analytics
              </span>
              <span className="text-xs text-slate-400 font-medium">Layout Físico & Endereçamento</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Warehouse className="text-cyan-400" size={28} />
              Mapa de Estoque & Armazenagem
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Localização física inteligente por Sala, Armário e Gaveta com códigos abreviados para contagem rápida e separação de pedidos.
            </p>
          </div>

          {/* Visual View Switcher (Power BI View Selector) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "GRID"
                    ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <LayoutGrid size={14} />
                Mapa Físico
              </button>
              <button
                type="button"
                onClick={() => setViewMode("MATRIX")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "MATRIX"
                    ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <ListFilter size={14} />
                Matriz Analítica
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CHARTS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "CHARTS"
                    ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <BarChart3 size={14} />
                Gráficos BI
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <ExportButton
                data={filteredProducts}
                filename="mapa-armazenagem-estoque"
                format="xlsx"
                headers={exportHeaders}
                title="Relatório de Mapa de Estoque e Armazenagem"
                className="px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-emerald-500/50"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </ExportButton>

              <ExportButton
                data={filteredProducts}
                filename="mapa-armazenagem-estoque"
                format="pdf"
                headers={exportHeaders}
                title="Relatório de Mapa de Estoque e Armazenagem"
                className="px-3 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-red-500/50"
              >
                <FileText size={15} />
                <span>PDF</span>
              </ExportButton>
            </div>
          </div>
        </div>

        {/* Power BI KPI Scorecards Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/80 border border-slate-700/70 p-3.5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Itens em Estoque</p>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {kpis.totalUnits.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un</span>
                </h4>
                <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">{kpis.totalItems} produtos filtrados</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Boxes size={18} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-3.5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor em Estoque</p>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                  {formatCurrency(kpis.totalCost)}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Venda: {formatCurrency(kpis.totalSale)}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <DollarSign size={18} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-3.5 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="flex justify-between items-center pr-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Endereçamento</p>
                  <span className="text-xs font-mono font-black text-blue-400">{kpis.coveragePercent}%</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {kpis.assignedCount} <span className="text-xs font-normal text-slate-400">/ {kpis.totalItems}</span>
                </h4>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-blue-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${kpis.coveragePercent}%` }}
                  />
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 ml-2">
                <MapPin size={18} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-3.5 rounded-2xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estoque Crítico</p>
                <h4 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                  {kpis.criticalCount} <span className="text-xs font-normal text-slate-400">itens</span>
                </h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {kpis.unassignedCount > 0 ? `${kpis.unassignedCount} sem endereço` : "100% endereçado"}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Power BI Interactive Slicers Panel (Filtros de Dashboard) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Segmentadores de Dados (Slicers)
            </h3>
          </div>
          {(searchTerm || selectedRoom !== "ALL" || selectedRack !== "ALL" || selectedShelf !== "ALL" || stockStatusFilter !== "ALL") && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw size={13} />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Busca Rápida */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-bold text-slate-700">Busca Rápida</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Produto, SKU, Código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Slicer Sala */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Sala / Setor</label>
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setSelectedRack("ALL");
                setSelectedShelf("ALL");
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="ALL">Todas as Salas ({availableRooms.length})</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="UNASSIGNED">Sem Endereço</option>
            </select>
          </div>

          {/* Slicer Armário */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Armário / Estante</label>
            <select
              value={selectedRack}
              onChange={(e) => {
                setSelectedRack(e.target.value);
                setSelectedShelf("ALL");
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="ALL">Todos os Armários ({availableRacks.length})</option>
              {availableRacks.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Slicer Gaveta */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Gaveta / Prateleira</label>
            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="ALL">Todas as Gavetas ({availableShelves.length})</option>
              {availableShelves.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Slicer Status de Estoque */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Status Estoque</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ASSIGNED">Apenas Endereçados</option>
              <option value="UNASSIGNED">Apenas Sem Endereço</option>
              <option value="CRITICAL">Estoque Crítico / Zerado</option>
              <option value="NORMAL">Estoque Regular</option>
              <option value="HIGH">Estoque Alto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area depending on ViewMode */}

      {/* VIEW 1: MAPA FÍSICO HIERÁRQUICO (Warehouse Grid View) */}
      {viewMode === "GRID" && (
        <div className="space-y-6">
          {Object.keys(hierarchyData).length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Warehouse className="mx-auto text-slate-300" size={48} />
              <h3 className="text-base font-bold text-slate-700">Nenhum produto encontrado com os filtros aplicados.</h3>
              <p className="text-xs text-slate-400">Tente ajustar ou limpar os segmentadores para ver os itens de estoque.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            Object.entries(hierarchyData).map(([roomName, racks]) => {
              const totalRoomUnits = Object.values(racks).flatMap(r => Object.values(r).flatMap(pList => pList)).reduce((acc, p) => acc + p.stock, 0);
              const totalRoomProducts = Object.values(racks).flatMap(r => Object.values(r).flatMap(pList => pList)).length;

              return (
                <div key={roomName} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  {/* Room Header Banner */}
                  <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{roomName}</h3>
                          <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                            Setor
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {Object.keys(racks).length} armário(s) • {totalRoomProducts} produto(s) mapeado(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                        Total no Setor: <strong className="text-cyan-400 font-mono">{totalRoomUnits.toLocaleString('pt-BR')} un</strong>
                      </span>
                    </div>
                  </div>

                  {/* Racks & Shelves Layout */}
                  <div className="p-6 space-y-6 bg-slate-50/50">
                    {Object.entries(racks).map(([rackName, shelves]) => {
                      const totalRackUnits = Object.values(shelves).flatMap(pList => pList).reduce((acc, p) => acc + p.stock, 0);

                      return (
                        <div key={rackName} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                          {/* Rack Title */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                                <Layers size={16} />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{rackName}</h4>
                                <p className="text-[11px] text-slate-500">{Object.keys(shelves).length} gaveta(s) / prateleira(s)</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              Subtotal: <strong className="text-blue-700">{totalRackUnits} un</strong>
                            </span>
                          </div>

                          {/* Drawers / Shelves Box Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                            {Object.entries(shelves).map(([shelfName, productList]) => {
                              const drawerTotalStock = productList.reduce((acc, p) => acc + p.stock, 0);
                              const hasCritical = productList.some(p => p.status === "CRITICAL" || p.status === "OUT_OF_STOCK");
                              const sampleCode = productList[0]?.cleanCode || shelfName;

                              return (
                                <div 
                                  key={shelfName}
                                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                                    hasCritical 
                                      ? "bg-amber-50/40 border-amber-200 hover:border-amber-400" 
                                      : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
                                  }`}
                                >
                                  {/* Drawer Header & Code Badge */}
                                  <div>
                                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-blue-600 shrink-0" />
                                        <span className="text-xs font-bold text-slate-800 truncate" title={shelfName}>
                                          {shelfName}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 shrink-0 shadow-2xs">
                                        {sampleCode}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                      {productList.length} item(ns) armazenado(s)
                                    </p>
                                  </div>

                                  {/* Stored Products Mini List */}
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 divide-y divide-slate-100">
                                    {productList.map(p => (
                                      <div key={p.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-900 truncate" title={p.name}>
                                            {p.name}
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-mono">
                                            SKU: {p.sku || "N/A"}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={`font-mono font-bold text-xs ${
                                            p.stock <= 0 ? "text-red-600" : p.status === "CRITICAL" ? "text-amber-600" : "text-emerald-700"
                                          }`}>
                                            {p.stock} un
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Drawer Total & Quick Action */}
                                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">Total gaveta:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-black text-slate-900">{drawerTotalStock} un</span>
                                      {onSelectProductForAdjustment && productList.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectProductForAdjustment(productList[0].id)}
                                          className="text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200/60 transition-colors cursor-pointer"
                                          title="Ajustar estoque deste item"
                                        >
                                          Ajustar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: MATRIZ TABULAR ANALÍTICA (Power BI Matrix View) */}
      {viewMode === "MATRIX" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Matriz Analítica de Endereçamento ({filteredProducts.length} registros)
              </h3>
              <p className="text-xs text-slate-500">Detalhamento unitário com código abreviado, posição física e valores de estoque.</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              Valor Total: <strong className="text-emerald-700 font-mono">{formatCurrency(kpis.totalCost)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Código Abreviado</th>
                  <th className="py-3.5 px-4">Sala / Setor</th>
                  <th className="py-3.5 px-4">Armário</th>
                  <th className="py-3.5 px-4">Gaveta</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4 text-right">Qtd Estoque</th>
                  <th className="py-3.5 px-4 text-right">Custo Unit.</th>
                  <th className="py-3.5 px-4 text-right">Total Custo</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      Nenhum produto cadastrado com os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                          p.hasLocation 
                            ? "bg-blue-50 text-blue-800 border-blue-200" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {p.cleanCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{p.cleanRoom}</td>
                      <td className="py-3 px-4 text-slate-700">{p.cleanRack}</td>
                      <td className="py-3 px-4 text-slate-700">{p.cleanShelf}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px] truncate" title={p.name}>
                        {p.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.sku || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {p.stock} un
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {formatCurrency(p.totalCostValue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stock <= 0
                            ? "bg-red-100 text-red-700"
                            : p.status === "CRITICAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {p.stock <= 0 ? "Zerado" : p.status === "CRITICAL" ? "Crítico" : "Normal"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onSelectProductForAdjustment && (
                          <button
                            type="button"
                            onClick={() => onSelectProductForAdjustment(p.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <span>Ajustar</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: GRÁFICOS & DISTRIBUIÇÃO (Power BI Chart Analytics) */}
      {viewMode === "CHARTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Estoque por Sala */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="text-cyan-600" size={18} />
                  Estoque por Sala / Setor (Unidades)
                </h3>
                <p className="text-xs text-slate-400">Distribuição volumétrica das principais salas de estoque.</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartRoomData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Sem dados para exibir
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRoomData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      interval={0} 
                      angle={-25} 
                      textAnchor="end" 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} un`, 'Quantidade']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="units" fill="#0284c7" radius={[6, 6, 0, 0]}>
                      {chartRoomData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0284c7' : '#38bdf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico 2: Ocupação dos Armários */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="text-blue-600" size={18} />
                  Top Armários por Volume (Unidades)
                </h3>
                <p className="text-xs text-slate-400">Concentração de estoque nos principais armários e estantes.</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartRackData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Sem dados para exibir
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRackData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} un`, 'Quantidade']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="units" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                      {chartRackData.map((entry, index) => (
                        <Cell key={`cell-rack-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
