import React, { useState } from "react";
import { 
  X, 
  Package, 
  Warehouse, 
  MapPin, 
  Tag, 
  Award, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Barcode, 
  Copy, 
  Check, 
  Edit2, 
  Image as ImageIcon,
  AlertTriangle,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "../lib/currencyUtils";
import { toast } from "sonner";

interface ProductDetailsModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: any) => void;
  canEdit?: boolean;
}

export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onEdit,
  canEdit = false
}: ProductDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeImageZoom, setActiveImageZoom] = useState(false);

  if (!isOpen || !product) return null;

  // Calculos financeiros
  const price = Number(product.price) || 0;
  const cost = Number(product.cost_price || product.cost) || 0;
  const profit = price - cost;
  const marginPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : "100.0";

  // Estoque
  const stock = Number(product.stock_quantity) || 0;
  const minStock = Number(product.min_stock) || 0;
  const isLowStock = stock <= minStock;
  const isOutOfStock = stock <= 0;

  // Localizacao
  const rawLoc = product.storage_location || product.storage_code;
  const hasStorageParts = Boolean(product.storage_room || product.storage_rack || product.storage_shelf);
  const synthesizedLoc = [product.storage_room, product.storage_rack, product.storage_shelf].filter(Boolean).join("-");
  const displayLocation = rawLoc || synthesizedLoc || "";

  // Copiar resumo
  const handleCopySummary = () => {
    const text = `PRODUTO: ${product.name}
SKU: ${product.sku || "N/A"}
CÓDIGO DE BARRAS: ${product.barcode || product.sku || "N/A"}
PREÇO: ${formatCurrency(price)}
ESTOQUE: ${stock} ${product.unit || "UN"}
LOCALIZAÇÃO: ${displayLocation || "Não informada"}
CATEGORIA: ${product.category_name || "Geral"}
MARCA: ${product.brand_name || "Geral"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados do produto copiados para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div 
        id="product-details-overlay"
        className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      >
        {/* Backdrop com blur escuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Janela Flutuante */}
        <motion.div
          id="product-details-modal-window"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <Package size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate leading-snug">
                    {product.name}
                  </h2>
                  {isOutOfStock ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                      Sem Estoque
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      Estoque Baixo
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Em Estoque
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  {product.sku && (
                    <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      SKU: {product.sku}
                    </span>
                  )}
                  {product.category_name && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Tag size={12} className="text-slate-400" />
                      {product.category_name}
                    </span>
                  )}
                  {product.brand_name && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Award size={12} className="text-slate-400" />
                      {product.brand_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-copy-product-details"
                onClick={handleCopySummary}
                title="Copiar Ficha do Produto"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span className="hidden sm:inline">{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              {canEdit && onEdit && (
                <button
                  id="btn-edit-from-details-modal"
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  title="Editar Produto"
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-200 transition-all cursor-pointer"
                >
                  <Edit2 size={16} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              <button
                id="btn-close-product-details-modal"
                onClick={onClose}
                title="Fechar (ESC)"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 overscroll-contain bg-white">
            {/* Linha Principal: Imagem e Dados Financeiros */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Imagem do Produto */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div 
                  onClick={() => product.image_url && setActiveImageZoom(!activeImageZoom)}
                  className={`w-full aspect-square bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner group ${product.image_url ? 'cursor-pointer' : ''}`}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 p-4 text-center">
                      <ImageIcon size={56} className="stroke-[1.5] mb-2 text-slate-300" />
                      <span className="text-xs font-medium text-slate-400">Sem imagem cadastrada</span>
                    </div>
                  )}
                  {product.image_url && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] font-semibold rounded-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para ampliar
                    </span>
                  )}
                </div>
                <div className="w-full mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unidade de Medida</span>
                  <span className="text-sm font-black text-slate-800">{product.unit || "UNIDADE (UN)"}</span>
                </div>
              </div>

              {/* Informações Comerciais e Financeiras */}
              <div className="md:col-span-8 space-y-4">
                {/* Cards de Preço / Lucro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200/70">
                    <div className="flex items-center justify-between text-blue-600 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Preço de Venda</span>
                      <DollarSign size={16} />
                    </div>
                    <p className="text-2xl font-black text-blue-950 font-mono">
                      {formatCurrency(price)}
                    </p>
                    <p className="text-[10px] text-blue-600/80 mt-0.5">Valor final ao consumidor</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Preço de Custo</span>
                      <DollarSign size={16} />
                    </div>
                    <p className="text-2xl font-black text-slate-800 font-mono">
                      {formatCurrency(cost)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Custo base cadastrado</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                    <div className="flex items-center justify-between text-emerald-600 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Margem Bruta</span>
                      <TrendingUp size={16} />
                    </div>
                    <p className="text-2xl font-black text-emerald-950 font-mono">
                      {formatCurrency(profit)}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                      +{marginPercent}% de markup
                    </p>
                  </div>
                </div>

                {/* Código de Barras / Identificadores */}
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Barcode size={16} className="text-slate-500" />
                      Identificadores e Códigos
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Código SKU / Referência</p>
                      <p className="font-mono text-sm font-black text-slate-900 mt-0.5">{product.sku || "Não informado"}</p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Código de Barras (EAN / GTIN)</p>
                      <p className="font-mono text-sm font-black text-slate-900 mt-0.5">{product.barcode || product.sku || "Não informado"}</p>
                    </div>
                  </div>
                </div>

                {/* Descrição se houver */}
                {product.description && (
                  <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Observações / Descrição Detalhada
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Estoque e Localização Física no Armazém */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-emerald-50/40 border border-emerald-200/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                    <Warehouse size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Estoque & Armazenagem Física
                    </h3>
                    <p className="text-xs text-slate-500">Localização exata para picking e separação rápida</p>
                  </div>
                </div>
                {displayLocation && (
                  <div className="inline-flex items-center gap-2 bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-sm text-xs font-mono font-black self-start sm:self-auto">
                    <MapPin size={14} />
                    <span>Endereço: {displayLocation}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Estoque Atual</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900">{stock}</span>
                    <span className="text-xs font-bold text-slate-500">{product.unit || "un"}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Estoque Mínimo</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-700">{minStock}</span>
                    <span className="text-xs font-bold text-slate-500">{product.unit || "un"}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Estoque Máximo</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-700">{product.max_stock || "—"}</span>
                    <span className="text-xs font-bold text-slate-500">{product.max_stock ? product.unit || "un" : ""}</span>
                  </div>
                </div>
              </div>

              {/* Detalhes de Endereçamento Físico */}
              {hasStorageParts || displayLocation ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">1. Sala / Setor</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{product.storage_room || "Não especificado"}</p>
                  </div>
                  <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">2. Armário / Estante</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{product.storage_rack || "Não especificado"}</p>
                  </div>
                  <div className="p-3 bg-white/90 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">3. Gaveta / Prateleira</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{product.storage_shelf || "Não especificado"}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Este produto ainda não possui endereço físico cadastrado no estoque. Edite-o para mapear Sala, Armário e Gaveta.</span>
                </div>
              )}
            </div>

            {/* Seção 3: Informações Tributárias e Fiscais */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Dados Fiscais & Tributação</h3>
                  <p className="text-xs text-slate-500">Parâmetros para emissão de NF-e, NFC-e e cálculo de impostos</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">NCM</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.ncm || "—"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CEST</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.cest || "—"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CFOP Padrão</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.cfop || "5102"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CST / CSOSN</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.cst || product.csosn || "102"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ICMS (%)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.icms_rate ? `${product.icms_rate}%` : "0%"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">IPI (%)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.ipi_rate ? `${product.ipi_rate}%` : "0%"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">PIS (%)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.pis_rate ? `${product.pis_rate}%` : "0%"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">COFINS (%)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.cofins_rate ? `${product.cofins_rate}%` : "0%"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">MVA (%)</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{product.mva_rate ? `${product.mva_rate}%` : "0%"}</p>
                </div>
              </div>
            </div>

            {/* Seção 4: Ficha Técnica (BOM) se houver */}
            {Array.isArray(product.bom_items) && product.bom_items.length > 0 && (
              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/70 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Composição / Ficha Técnica (BOM)</h3>
                    <p className="text-xs text-slate-500">Insumos e materiais necessários para a produção deste item</p>
                  </div>
                </div>

                <div className="divide-y divide-indigo-100 bg-white rounded-xl border border-indigo-100 overflow-hidden">
                  {product.bom_items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800">{item.name || item.product_name || `Item ${idx + 1}`}</span>
                      </div>
                      <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.quantity} {item.unit || "un"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadados / Auditoria */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span className="font-mono">ID: {product.id}</span>
              {product.created_at && (
                <span>Cadastrado em: {new Date(product.created_at?.seconds ? product.created_at.seconds * 1000 : product.created_at).toLocaleDateString("pt-BR")}</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info size={14} className="text-slate-400" />
              <span>Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold">ESC</kbd> para fechar</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Fechar
              </button>
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={14} />
                  <span>Editar Produto</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
