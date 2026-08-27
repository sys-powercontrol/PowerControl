import React, { useState, useEffect } from "react";
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
  Info,
  Clock,
  Sparkles,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "../lib/currencyUtils";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import UpgradePlanModal from "./UpgradePlanModal";
import { toast } from "sonner";

interface ProductDetailsModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: any) => void;
  canEdit?: boolean;
  disableProductImages?: boolean;
}

export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
  disableProductImages
}: ProductDetailsModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeImageZoom, setActiveImageZoom] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const effectiveCompanyId = product?.company_id || user?.company_id;

  // Buscar informações da empresa caso a prop disableProductImages não tenha sido passada diretamente
  const { data: companyData } = useQuery({
    queryKey: ["company", effectiveCompanyId],
    queryFn: () => (effectiveCompanyId ? api.get("companies", effectiveCompanyId) : null),
    enabled: !!effectiveCompanyId && disableProductImages === undefined
  });

  const isImagesDisabled = disableProductImages !== undefined 
    ? disableProductImages 
    : (companyData?.disable_product_images === "true" || companyData?.disable_product_images === true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const isService = product?.type === 'service';

  // Cálculos financeiros
  const price = Number(product?.price) || 0;
  const cost = Number(product?.cost_price || product?.cost) || 0;
  const profit = price - cost;
  const marginPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : "100.0";

  // Estoque (para produtos)
  const stock = Number(product?.stock_quantity) || 0;
  const minStock = Number(product?.min_stock) || 0;
  const isLowStock = !isService && stock <= minStock;
  const isOutOfStock = !isService && stock <= 0;

  // Localização (para produtos)
  const rawLoc = product?.storage_location || product?.storage_code || product?.resolvedLocation;
  const hasStorageParts = Boolean(product?.storage_room || product?.storage_rack || product?.storage_shelf);
  const synthesizedLoc = [product?.storage_room, product?.storage_rack, product?.storage_shelf].filter(Boolean).join("-");
  const displayLocation = rawLoc || synthesizedLoc || "";

  // Copiar resumo
  const handleCopySummary = () => {
    if (!product) return;
    const text = isService
      ? `SERVIÇO: ${product.name}
PREÇO: ${formatCurrency(price)}
CATEGORIA: ${product.category_name || product.category || "Geral"}
DURAÇÃO ESTIMADA: ${product.duration || product.estimated_time || "N/A"}
DESCRIÇÃO: ${product.description || "N/A"}`
      : `PRODUTO: ${product.name}
SKU: ${product.sku || "N/A"}
CÓDIGO DE BARRAS: ${product.barcode || product.sku || "N/A"}
PREÇO: ${formatCurrency(price)}
ESTOQUE: ${stock} ${product.unit || "UN"}
LOCALIZAÇÃO: ${displayLocation || "Não informada"}
CATEGORIA: ${product.category_name || product.category || "Geral"}
MARCA: ${product.brand_name || product.brand || "Geral"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados copiados para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && product && (
          <motion.div 
            key="product-details-overlay"
            id="product-details-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-slate-950/75 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            {/* Janela Flutuante */}
            <motion.div
              key="product-details-modal-window"
              id="product-details-modal-window"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-2xl ${isService ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-indigo-600 text-white shadow-indigo-200'} flex items-center justify-center shadow-md shrink-0`}>
                {isService ? <Tag size={22} /> : <Package size={22} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate leading-snug">
                    {product.name}
                  </h2>
                  {isService ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                      Serviço
                    </span>
                  ) : isOutOfStock ? (
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
                  {!isService && product.sku && (
                    <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      SKU: {product.sku}
                    </span>
                  )}
                  {(product.category_name || product.category) && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Tag size={12} className="text-slate-400" />
                      {product.category_name || product.category}
                    </span>
                  )}
                  {(product.brand_name || product.brand) && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Award size={12} className="text-slate-400" />
                      {product.brand_name || product.brand}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-copy-product-details"
                onClick={handleCopySummary}
                title="Copiar Ficha"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span className="hidden sm:inline">{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              {canEdit && onEdit && (
                <button
                  type="button"
                  id="btn-edit-from-details-modal"
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  title={isService ? "Editar Serviço" : "Editar Produto"}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-200 transition-all cursor-pointer"
                >
                  <Edit2 size={16} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              )}

              <button
                type="button"
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
              {/* Imagem do Produto / Ícone de Serviço */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div 
                  id="product-details-image-container"
                  onClick={() => {
                    if (product.image_url) {
                      setActiveImageZoom(!activeImageZoom);
                    } else if (isImagesDisabled) {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className={`w-full aspect-square bg-slate-50 border rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner group transition-all duration-200 ${
                    product.image_url 
                      ? 'cursor-pointer border-slate-200/80 hover:border-slate-300' 
                      : isImagesDisabled 
                        ? 'cursor-pointer border-amber-200/90 hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-md' 
                        : 'border-slate-200/80'
                  }`}
                  title={
                    product.image_url 
                      ? "Clique para ampliar imagem" 
                      : isImagesDisabled 
                        ? "Clique para solicitar upgrade de plano e habilitar fotos" 
                        : undefined
                  }
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isService ? (
                    <div className="flex flex-col items-center justify-center text-purple-400 p-4 text-center w-full h-full">
                      <Tag size={56} className="stroke-[1.5] mb-2 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-700">Prestação de Serviço</span>
                      {isImagesDisabled && (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs group-hover:bg-amber-200 transition-colors">
                          <Sparkles size={11} className="text-amber-600" /> Upgrade para Fotos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div 
                      id="product-details-no-image-box"
                      className="flex flex-col items-center justify-center text-slate-300 p-4 text-center w-full h-full select-none"
                    >
                      <ImageIcon size={56} className={`stroke-[1.5] mb-2 transition-colors ${isImagesDisabled ? 'text-amber-400/90 group-hover:text-amber-500 group-hover:scale-105 transform duration-200' : 'text-slate-300'}`} />
                      <span className={`text-xs font-medium ${isImagesDisabled ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>Sem imagem cadastrada</span>
                      {isImagesDisabled && (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs group-hover:bg-amber-200 group-hover:shadow-xs transition-all">
                          <Sparkles size={11} className="text-amber-600" /> Upgrade de Plano
                        </span>
                      )}
                    </div>
                  )}
                  {product.image_url && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] font-semibold rounded-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para ampliar
                    </span>
                  )}
                  {!product.image_url && isImagesDisabled && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-amber-900/80 text-white text-[10px] font-semibold rounded-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Lock size={10} /> Solicitar upgrade
                    </span>
                  )}
                </div>
                <div className="w-full mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isService ? "Tipo de Cobrança" : "Unidade de Medida"}
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {isService ? (product.unit || "POR SERVIÇO / HORA") : (product.unit || "UNIDADE (UN)")}
                  </span>
                </div>
              </div>

              {/* Informações Comerciais e Financeiras */}
              <div className="md:col-span-8 space-y-4">
                {/* Cards de Preço / Lucro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200/70">
                    <div className="flex items-center justify-between text-blue-600 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">
                        {isService ? "Valor do Serviço" : "Preço de Venda"}
                      </span>
                      <DollarSign size={16} />
                    </div>
                    <p className="text-2xl font-black text-blue-950 font-mono">
                      {formatCurrency(price)}
                    </p>
                    <p className="text-[10px] text-blue-600/80 mt-0.5">Valor unitário praticado</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">
                        {isService ? "Custo Operacional" : "Preço de Custo"}
                      </span>
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

                {/* Código de Barras / Identificadores ou Detalhes de Serviço */}
                {!isService ? (
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
                ) : (
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
                    <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={16} className="text-purple-600" />
                      Execução e Comissões
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Duração / Tempo Médio</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{product.duration || product.estimated_time || "Conforme agendamento"}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-purple-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Comissão Padrão</p>
                        <p className="text-sm font-bold text-purple-700 mt-0.5">
                          {product.commission_rate !== undefined && product.commission_rate !== null && product.commission_rate !== "" 
                            ? `${product.commission_rate}%` 
                            : "Regra geral do vendedor"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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

            {/* Seção 2: Estoque e Localização Física no Armazém (somente para produtos) */}
            {!isService && (
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
            )}

            {/* Seção 3: Informações Tributárias e Fiscais */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Dados Fiscais & Tributação</h3>
                  <p className="text-xs text-slate-500">Parâmetros para emissão fiscal e cálculo de impostos</p>
                </div>
              </div>

              {!isService ? (
                <>
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
                </>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Alíquota ISS (%)</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{product.iss_rate ? `${product.iss_rate}%` : "0%"}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Código do Serviço / LC 116</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{product.service_code || "Padrão"}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Retenção de ISS</p>
                    <p className="font-bold text-slate-800 mt-0.5">{product.retencao_iss ? "Sim" : "Não"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Seção 4: Ficha Técnica (BOM) se houver */}
            {!isService && Array.isArray(product.bom_items) && product.bom_items.length > 0 && (
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
                id="btn-close-product-details-modal-footer"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Fechar
              </button>
              {canEdit && onEdit && (
                <button
                  type="button"
                  id="btn-edit-from-details-modal-footer"
                  onClick={() => {
                    onClose();
                    onEdit(product);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={14} />
                  <span>{isService ? "Editar Serviço" : "Editar Produto"}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>

    {/* Janela Flutuante de Solicitação de Upgrade de Plano */}
    <UpgradePlanModal 
      isOpen={showUpgradeModal} 
      onClose={() => setShowUpgradeModal(false)} 
      title="Upgrade de Plano Necessário"
      subtitle="Habilitar Inclusão de Fotos em Produtos e Serviços"
    />
  </>
  );
}
