import React, { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { 
  Printer, 
  Search, 
  X, 
  Settings, 
  CheckSquare, 
  Square,
  Plus,
  Minus,
  Download
} from "lucide-react";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";

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
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    } catch (e) {
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

    const itemsToPrint: any[] = [];
    selectedProductIds.forEach(id => {
      const product = products.find(p => p.id === id);
      const qty = selectedItems[id];
      for (let i = 0; i < qty; i++) {
        itemsToPrint.push(product);
      }
    });

    toast.info(`Gerando ${itemsToPrint.length} etiquetas...`);

    for (let i = 0; i < itemsToPrint.length; i++) {
      const product = itemsToPrint[i];
      
      // Draw label content
      const centerX = currentX + layout.labelWidth / 2;
      
      // Product Name
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(product.name, layout.labelWidth - 4);
      doc.text(nameLines[0], centerX, currentY + 5, { align: "center" });

      // Price
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const priceText = `R$ ${product.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      doc.text(priceText, centerX, currentY + 12, { align: "center" });

      // Barcode
      const barcodeValue = product.sku || product.id.substring(0, 12).padStart(12, '0');
      const barcodeImg = generateBarcodeBase64(barcodeValue);
      if (barcodeImg) {
        // Calculate barcode size to fit
        const imgW = layout.labelWidth - 10;
        const imgH = 15;
        doc.addImage(barcodeImg, "PNG", centerX - imgW / 2, currentY + 15, imgW, imgH);
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Impressão de Etiquetas</h2>
              <p className="text-xs text-gray-500">Selecione os produtos e configure o layout.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-colors ${showSettings ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"}`}
            >
              <Settings size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Product Selection */}
          <div className="flex-1 flex flex-col border-r border-gray-100">
            <div className="p-4 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar produtos..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredProducts.map(p => {
                const isSelected = !!selectedItems[p.id];
                return (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isSelected ? "border-blue-200 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleItem(p.id)}>
                      {isSelected ? (
                        <CheckSquare className="text-blue-600" size={20} />
                      ) : (
                        <Square className="text-gray-300" size={20} />
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">SKU: {p.sku || p.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-blue-100">
                        <button 
                          onClick={() => updateQuantity(p.id, -1)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{selectedItems[p.id]}</span>
                        <button 
                          onClick={() => updateQuantity(p.id, 1)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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

              <div className="pt-4 border-t border-gray-200">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-800 font-medium">
                    Resumo: {layout.cols * layout.rows} etiquetas por página A4.
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
              className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
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
