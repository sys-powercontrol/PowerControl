import React, { useState, useRef } from "react";
import { 
  Printer, 
  Search, 
  X, 
  Settings, 
  CheckSquare, 
  Square,
  Plus,
  Minus,
  Download,
  Warehouse
} from "lucide-react";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";
import { formatCurrency } from "../lib/currencyUtils";

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

interface LabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

interface LabelLayout {
  name: string;
  rows: number;
  cols: number;
  labelWidth: number; // mm
  labelHeight: number; // mm
  marginTop: number; // mm
  marginLeft: number; // mm
  colGap: number; // mm
  rowGap: number; // mm
}

const LAYOUT_PRESETS: LabelLayout[] = [
  {
    name: "Pimenta 6180 (3x7)",
    rows: 7,
    cols: 3,
    labelWidth: 63.5,
    labelHeight: 38.1,
    marginTop: 15.1,
    marginLeft: 7.2,
    colGap: 2.5,
    rowGap: 0
  },
  {
    name: "Avery 5160 (3x10)",
    rows: 10,
    cols: 3,
    labelWidth: 66.6,
    labelHeight: 25.4,
    marginTop: 12.7,
    marginLeft: 4.7,
    colGap: 3.1,
    rowGap: 0
  },
  {
    name: "Etiqueta Única (80x40)",
    rows: 1,
    cols: 1,
    labelWidth: 80,
    labelHeight: 40,
    marginTop: 0,
    marginLeft: 0,
    colGap: 0,
    rowGap: 0
  }
];

export default function LabelPrinter({ isOpen, onClose, products }: LabelPrinterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [layout, setLayout] = useState<LabelLayout>(LAYOUT_PRESETS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showStorageLocation, setShowStorageLocation] = useState(true);
  const [sortByLocation, setSortByLocation] = useState(false);
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  const filteredProducts = products.filter(p => {
    const loc = getProductLocation(p).toLowerCase();
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (p.name || '').toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      loc.includes(term)
    );
  });

  const toggleItem = (productId: string) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[productId]) {
        delete newItems[productId];
      } else {
        newItems[productId] = 1;
      }
      return newItems;
    });
  };

  const selectAllVisible = () => {
    setSelectedItems(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        if (!next[p.id]) {
          next[p.id] = 1;
        }
      });
      return next;
    });
  };

  const clearAllSelected = () => {
    setSelectedItems({});
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const generateBarcodeBase64 = (value: string): string | null => {
    if (!barcodeRef.current) return null;
    try {
      JsBarcode(barcodeRef.current, value, {
        format: "EAN13",
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 14,
        margin: 0
      });
      return barcodeRef.current.toDataURL("image/png");
    } catch {
      // Fallback to CODE128 if EAN13 fails (e.g. invalid checksum or length)
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 14,
          margin: 0
        });
        return barcodeRef.current.toDataURL("image/png");
      } catch (err) {
        console.error("Error generating barcode:", err);
        return null;
      }
    }
  };

  const handleGeneratePDF = async () => {
    const selectedProductIds = Object.keys(selectedItems);
    if (selectedProductIds.length === 0) {
      toast.error("Selecione pelo menos um produto.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    let currentX = layout.marginLeft;
    let currentY = layout.marginTop;
    let currentCol = 0;
    let currentRow = 0;

    let selectedProducts = selectedProductIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    
    if (sortByLocation) {
      selectedProducts = selectedProducts.sort((a, b) => {
        const locA = getProductLocation(a);
        const locB = getProductLocation(b);
        if (!locA && locB) return 1;
        if (locA && !locB) return -1;
        return locA.localeCompare(locB, "pt-BR");
      });
    }

    const itemsToPrint: any[] = [];
    selectedProducts.forEach(product => {
      const qty = selectedItems[product.id] || 1;
      for (let i = 0; i < qty; i++) {
        itemsToPrint.push(product);
      }
    });

    toast.info(`Gerando ${itemsToPrint.length} etiquetas...`);

    for (let i = 0; i < itemsToPrint.length; i++) {
      const product = itemsToPrint[i];
      const loc = getProductLocation(product);
      
      // Draw label content
      const centerX = currentX + layout.labelWidth / 2;
      
      // Product Name
      doc.setFontSize(layout.labelHeight < 30 ? 7 : 8);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(product.name, layout.labelWidth - 4);
      doc.text(nameLines[0], centerX, currentY + (layout.labelHeight < 30 ? 4 : 5), { align: "center" });

      // Price & Location
      doc.setFontSize(layout.labelHeight < 30 ? 8 : 9);
      doc.setTextColor(0, 0, 0);
      const priceText = formatCurrency(product.price || 0);

      if (showStorageLocation && loc) {
        if (layout.labelHeight >= 35) {
          // 3x7 or 80x40
          doc.setFont("helvetica", "bold");
          doc.text(priceText, centerX - (layout.labelWidth * 0.2), currentY + 10, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text(`Loc: ${loc}`, centerX + (layout.labelWidth * 0.2), currentY + 10, { align: "center" });
        } else {
          // Avery 5160 compact (25.4mm)
          doc.setFont("helvetica", "bold");
          doc.text(`${priceText}  |  Loc: ${loc}`, centerX, currentY + 8.5, { align: "center" });
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.text(priceText, centerX, currentY + (layout.labelHeight < 30 ? 8.5 : 10), { align: "center" });
      }

      // Barcode
      const barcodeValue = product.sku || product.id.substring(0, 12).padStart(12, '0');
      const barcodeImg = generateBarcodeBase64(barcodeValue);
      if (barcodeImg) {
        // Calculate barcode size to fit
        const imgW = layout.labelWidth - 10;
        const imgH = layout.labelHeight < 30 ? 11 : 14;
        const barcodeY = layout.labelHeight < 30 ? currentY + 10.5 : currentY + 13;
        doc.addImage(barcodeImg, "PNG", centerX - imgW / 2, barcodeY, imgW, imgH);
      }

      // Update positions
      currentCol++;
      if (currentCol >= layout.cols) {
        currentCol = 0;
        currentRow++;
        currentX = layout.marginLeft;
        currentY += layout.labelHeight + layout.rowGap;
      } else {
        currentX += layout.labelWidth + layout.colGap;
      }

      // Check for new page
      if (currentRow >= layout.rows && i < itemsToPrint.length - 1) {
        doc.addPage();
        currentRow = 0;
        currentCol = 0;
        currentX = layout.marginLeft;
        currentY = layout.marginTop;
      }
    }

    doc.save("etiquetas-produtos.pdf");
    toast.success("PDF gerado com sucesso!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Impressão de Etiquetas</h2>
              <p className="text-xs text-gray-500">Selecione os produtos e configure o layout com endereço de estoque.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${showSettings ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"}`}
              title="Configurações de Layout"
            >
              <Settings size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Product Selection */}
          <div className="flex-1 flex flex-col border-r border-gray-100">
            <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome, SKU ou localização..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={clearAllSelected}
                  className="text-xs font-semibold text-gray-500 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Nenhum produto encontrado na busca.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = !!selectedItems[p.id];
                  const loc = getProductLocation(p);
                  return (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isSelected ? "border-blue-200 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 mr-2" onClick={() => toggleItem(p.id)}>
                        {isSelected ? (
                          <CheckSquare className="text-blue-600 shrink-0" size={20} />
                        ) : (
                          <Square className="text-gray-300 shrink-0" size={20} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-mono">SKU: {p.sku || p.id.substring(0, 8)}</span>
                            {loc ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded text-[10px] font-bold flex items-center gap-1">
                                <Warehouse size={10} className="text-emerald-600" />
                                {loc}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Sem local</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-blue-100 shrink-0">
                          <button 
                            onClick={() => updateQuantity(p.id, -1)}
                            className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                            title="Diminuir quantidade"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-6 text-center">{selectedItems[p.id]}</span>
                          <button 
                            onClick={() => updateQuantity(p.id, 1)}
                            className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                            title="Aumentar quantidade"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Settings / Preview */}
          <div className={`w-full md:w-80 bg-gray-50 p-6 overflow-y-auto transition-all ${showSettings ? "block" : "hidden md:block"}`}>
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              Configurações do Layout
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Preset de Layout</label>
                <select 
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={layout.name}
                  onChange={(e) => {
                    const preset = LAYOUT_PRESETS.find(p => p.name === e.target.value);
                    if (preset) setLayout(preset);
                  }}
                >
                  {LAYOUT_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Location options */}
              <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={showStorageLocation}
                    onChange={(e) => setShowStorageLocation(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span>Imprimir Endereço de Estoque</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={sortByLocation}
                    onChange={(e) => setSortByLocation(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span>Ordenar por Endereço Físico</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Colunas</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                    value={layout.cols}
                    onChange={(e) => setLayout({...layout, cols: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Linhas</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                    value={layout.rows}
                    onChange={(e) => setLayout({...layout, rows: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Largura (mm)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                    value={layout.labelWidth}
                    onChange={(e) => setLayout({...layout, labelWidth: parseFloat(e.target.value) || 1})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Altura (mm)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                    value={layout.labelHeight}
                    onChange={(e) => setLayout({...layout, labelHeight: parseFloat(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                    Resumo: <strong>{layout.cols * layout.rows}</strong> etiquetas por página A4.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{Object.keys(selectedItems).length}</span> produtos selecionados
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Download size={20} />
              Gerar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for barcode generation */}
      <canvas ref={barcodeRef} className="hidden" />
    </div>
  );
}

