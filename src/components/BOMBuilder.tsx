import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { 
  Plus, 
  Trash2, 
  Search, 
  Package,
  AlertCircle,
  AlertTriangle,
  Warehouse
} from "lucide-react";

interface BOMItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface BOMBuilderProps {
  items: BOMItem[];
  onChange: (items: BOMItem[]) => void;
  excludeProductId?: string;
}

const getProductLocation = (p: any): string => {
  if (!p) return "";
  if (p.storage_location) return p.storage_location;
  if (p.storage_code) return p.storage_code;
  const parts = [p.storage_room, p.storage_rack, p.storage_shelf].filter(Boolean);
  if (parts.length > 0) {
    if (p.storage_room && p.storage_rack && p.storage_shelf) return `${p.storage_room}-${p.storage_rack}/${p.storage_shelf}`;
    return parts.join("-");
  }
  return "";
};

export default function BOMBuilder({ items, onChange, excludeProductId }: BOMBuilderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const currentCompanyId = api.getCompanyId();

  const { data: products = [] } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products"),
  });

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p: any) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => 
      p.id !== excludeProductId &&
      !items.some(item => item.product_id === p.id) &&
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       getProductLocation(p).toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 5);
  }, [products, searchTerm, items, excludeProductId]);

  const addItem = (product: { id: string, name?: string }) => {
    onChange([...items, { 
      product_id: product.id, 
      product_name: product.name || 'Componente Sem Nome', 
      quantity: 1 
    }]);
    setSearchTerm("");
  };

  const removeItem = (productId: string) => {
    onChange(items.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 0.001) return;
    onChange(items.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Composição do Kit (BOM)</h3>
        <p className="text-[10px] text-gray-400 font-medium">Estoque será baixado dos componentes</p>
      </div>

      {/* Search and Add */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar componentes por nome, SKU ou endereço..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {searchTerm.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">Nenhum produto encontrado</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredProducts.map((p: any) => {
                  const loc = getProductLocation(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="w-full flex items-center justify-between p-3 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg shrink-0">
                          <Package size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">Estoque: {p.stock_quantity ?? 0} {p.unit || 'UN'}</span>
                            {loc && (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded flex items-center gap-0.5">
                                <Warehouse size={9} />
                                {loc}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Plus size={16} className="text-blue-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center">
            <Package size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-xs text-gray-400">Este produto não é um kit. Adicione componentes para torná-lo um.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                <tr>
                  <th className="px-4 py-2">Componente</th>
                  <th className="px-4 py-2">Endereço</th>
                  <th className="px-4 py-2">Estoque</th>
                  <th className="px-4 py-2 w-24">Qtd</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const prod = productMap.get(item.product_id);
                  const loc = getProductLocation(prod);
                  const stockQty = Number(prod?.stock_quantity) || 0;
                  const isInsufficient = stockQty < item.quantity;

                  return (
                    <tr key={item.product_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-gray-900">{item.product_name}</p>
                          {isInsufficient && (
                            <span 
                              title={`Estoque insuficiente (${stockQty} disponível)`}
                              className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold flex items-center gap-0.5"
                            >
                              <AlertTriangle size={10} className="text-amber-600" />
                              Baixo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {loc ? (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded font-mono text-[10px] font-bold">
                            {loc}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${isInsufficient ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                          {stockQty} {prod?.unit || 'UN'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-gray-50 border border-gray-100 rounded focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-blue-600 shrink-0" size={16} />
          <p className="text-[10px] text-blue-700 leading-relaxed">
            Ao vender este produto, o sistema baixará automaticamente as quantidades especificadas acima do estoque de cada componente.
          </p>
        </div>
      )}
    </div>
  );
}
