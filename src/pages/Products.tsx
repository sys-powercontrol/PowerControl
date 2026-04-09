import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { inventory } from "../lib/inventory";
import { calculateDiff } from "../lib/utils/diff";
import { useAuth } from "../lib/auth";
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Tag, 
  Award,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import BOMBuilder from "../components/BOMBuilder";
import LabelPrinter from "../components/LabelPrinter";

export default function Products() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Produtos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [bomItems, setBomItems] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const currentCompanyId = api.getCompanyId();
  const canManage = hasPermission('products.manage');

  const { data: productsData = [], isLoading: isLoadingProducts } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products"),
    enabled: !!user
  });

  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery({ 
    queryKey: ["categories", currentCompanyId], 
    queryFn: () => api.get("categories"),
    enabled: !!user
  });

  const { data: brandsData = [], isLoading: isLoadingBrands } = useQuery({ 
    queryKey: ["brands", currentCompanyId], 
    queryFn: () => api.get("brands"),
    enabled: !!user
  });

  const products = useMemo(() => {
    if (!currentCompanyId) return productsData;
    return productsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [productsData, currentCompanyId]);

  const categories = useMemo(() => {
    if (!currentCompanyId) return categoriesData;
    return categoriesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [categoriesData, currentCompanyId]);

  const brands = useMemo(() => {
    if (!currentCompanyId) return brandsData;
    return brandsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [brandsData, currentCompanyId]);

  const filteredProducts = products.filter((p: any) => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBrands = brands.filter((b: any) => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { stock_quantity, ...productData } = data;
      const result = await api.post("products", { ...productData, stock_quantity: 0 });
      
      if (stock_quantity > 0) {
        await inventory.recordMovement({
          product_id: result.id,
          product_name: data.name,
          company_id: user?.company_id || "",
          type: 'IN',
          reason: 'MANUAL',
          quantity: parseFloat(stock_quantity) || 0,
          reference_id: result.id
        });
      }

      await api.log({
        action: 'CREATE',
        entity: 'products',
        entity_id: result.id,
        description: `Criou produto ${data.name}`,
        metadata: data
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Produto criado com sucesso!");
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const oldProduct = products.find((p: any) => p.id === id);
      const { stock_quantity, ...otherData } = data;
      
      const result = await api.put("products", id, otherData);
      
      if (stock_quantity !== undefined && parseFloat(stock_quantity) !== oldProduct?.stock_quantity) {
        const diff = parseFloat(stock_quantity) - (oldProduct?.stock_quantity || 0);
        await inventory.recordMovement({
          product_id: id,
          product_name: data.name || oldProduct?.name,
          company_id: user?.company_id || "",
          type: diff > 0 ? 'IN' : 'OUT',
          reason: 'MANUAL',
          quantity: Math.abs(diff),
          reference_id: id
        });
      }

      await api.log({
        action: 'UPDATE',
        entity: 'products',
        entity_id: id,
        description: `Atualizou produto ${data.name}`,
        metadata: data,
        changes: calculateDiff(oldProduct, data)
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Produto atualizado!");
      setIsModalOpen(false);
      setEditingProduct(null);
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = editingCategory 
        ? await api.put("categories", editingCategory.id, data)
        : await api.post("categories", data);
      
      await api.log({
        action: editingCategory ? 'UPDATE' : 'CREATE',
        entity: 'categories',
        entity_id: result.id,
        description: `${editingCategory ? 'Atualizou' : 'Criou'} categoria ${data.name}`,
        changes: editingCategory ? calculateDiff(editingCategory, data) : null
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success(editingCategory ? "Categoria atualizada!" : "Categoria criada!");
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    }
  });

  const brandMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = editingBrand 
        ? await api.put("brands", editingBrand.id, data)
        : await api.post("brands", data);
      
      await api.log({
        action: editingBrand ? 'UPDATE' : 'CREATE',
        entity: 'brands',
        entity_id: result.id,
        description: `${editingBrand ? 'Atualizou' : 'Criou'} marca ${data.name}`,
        changes: editingBrand ? calculateDiff(editingBrand, data) : null
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success(editingBrand ? "Marca atualizada!" : "Marca criada!");
      setIsBrandModalOpen(false);
      setEditingBrand(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ entity, id }: { entity: string, id: string }) => {
      const result = await api.delete(entity, id);
      await api.log({
        action: 'DELETE',
        entity: entity,
        entity_id: id,
        description: `Excluiu ${entity} ID: ${id}`
      });
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.entity] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Excluído com sucesso!");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const productData = {
      ...data,
      company_id: user?.company_id,
      price: parseFloat(data.price as string) || 0,
      cost_price: parseFloat(data.cost_price as string) || 0,
      stock_quantity: parseInt(data.stock_quantity as string) || 0,
      min_stock: parseInt(data.min_stock as string) || 0,
      icms_rate: parseFloat(data.icms_rate as string) || 0,
      ipi_rate: parseFloat(data.ipi_rate as string) || 0,
      pis_rate: parseFloat(data.pis_rate as string) || 0,
      cofins_rate: parseFloat(data.cofins_rate as string) || 0,
      mva_rate: parseFloat(data.mva_rate as string) || 0,
      aliquota_interna_destino: parseFloat(data.aliquota_interna_destino as string) || 0,
      image_url: imageBase64 || editingProduct?.image_url || null,
      bom_items: bomItems
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        toast.error("A imagem deve ter menos de 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    categoryMutation.mutate({ ...data, company_id: user?.company_id, is_active: true });
  };

  const handleBrandSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    brandMutation.mutate({ ...data, company_id: user?.company_id, is_active: true });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activeTab}</h1>
          <p className="text-gray-500">
            {activeTab === "Produtos" && "Gerencie seu estoque e catálogo."}
            {activeTab === "Categorias" && "Organize seus produtos por categorias."}
            {activeTab === "Marcas" && "Gerencie as marcas dos seus produtos."}
          </p>
        </div>
        {canManage && (
          <button 
            onClick={() => { 
              if (activeTab === "Produtos") { 
                setEditingProduct(null); 
                setImageBase64(null); 
                setBomItems([]);
                setIsModalOpen(true); 
              }
              if (activeTab === "Categorias") { setEditingCategory(null); setIsCategoryModalOpen(true); }
              if (activeTab === "Marcas") { setEditingBrand(null); setIsBrandModalOpen(true); }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            {activeTab === "Produtos" && "Novo Produto"}
            {activeTab === "Categorias" && "Nova Categoria"}
            {activeTab === "Marcas" && "Nova Marca"}
          </button>
        )}
        {activeTab === "Produtos" && (
          <button 
            onClick={() => setIsLabelModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-shadow shadow-sm"
          >
            <Tag size={20} className="text-blue-600" />
            Etiquetas
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {["Produtos", "Categorias", "Marcas"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Produtos" && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou código..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoadingProducts ? (
              <div className="col-span-full py-12 text-center text-gray-500">Carregando produtos...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                Nenhum produto encontrado.
              </div>
            ) : filteredProducts.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={48} className="text-gray-200" />
                  )}
                  {canManage && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { 
                          setEditingProduct(p); 
                          setImageBase64(p.image_url || null); 
                          setBomItems(p.bom_items || []);
                          setIsModalOpen(true); 
                        }}
                        className="p-2 bg-white rounded-lg shadow-md text-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: "Excluir Produto",
                            message: "Deseja realmente excluir este produto? Esta ação não pode ser desfeita.",
                            onConfirm: () => {
                              deleteMutation.mutate({ entity: "products", id: p.id });
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="p-2 bg-white rounded-lg shadow-md text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 truncate flex-1">{p.name}</h3>
                    <span className="text-blue-600 font-bold">R$ {p.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                      {p.category_name || "Geral"}
                    </span>
                    {p.brand_name && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">
                        {p.brand_name}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                      <Package size={14} className="text-gray-400" />
                      <span className={`text-xs font-bold ${p.stock_quantity <= p.min_stock ? "text-red-500" : "text-gray-500"}`}>
                        {p.stock_quantity} un
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{p.sku || "S/ COD"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Categorias" && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar categorias..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingCategories ? (
              <div className="col-span-full py-12 text-center text-gray-500">Carregando categorias...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                Nenhuma categoria encontrada.
              </div>
            ) : filteredCategories.map((c: any) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Tag size={20} />
                  </div>
                  <span className="font-bold text-gray-900">{c.name}</span>
                </div>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Excluir Categoria",
                          message: "Deseja realmente excluir esta categoria? Esta ação não pode ser desfeita.",
                          onConfirm: () => {
                            deleteMutation.mutate({ entity: "categories", id: c.id });
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Marcas" && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar marcas..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingBrands ? (
              <div className="col-span-full py-12 text-center text-gray-500">Carregando marcas...</div>
            ) : filteredBrands.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                Nenhuma marca encontrada.
              </div>
            ) : filteredBrands.map((b: any) => (
              <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <span className="font-bold text-gray-900">{b.name}</span>
                </div>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingBrand(b); setIsBrandModalOpen(true); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Excluir Marca",
                          message: "Deseja realmente excluir esta marca? Esta ação não pode ser desfeita.",
                          onConfirm: () => {
                            deleteMutation.mutate({ entity: "brands", id: b.id });
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Novo/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-50 flex items-center justify-center">
                    {imageBase64 || editingProduct?.image_url ? (
                      <img src={imageBase64 || editingProduct?.image_url} alt="Produto" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={48} className="text-gray-300" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">Tamanho máximo: 500KB</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Nome do Produto *</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={editingProduct?.name}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Preço de Venda *</label>
                  <input 
                    name="price" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={editingProduct?.price}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Custo</label>
                  <input 
                    name="cost_price" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingProduct?.cost_price}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Estoque Atual</label>
                  <input 
                    name="stock_quantity" 
                    type="number" 
                    defaultValue={editingProduct?.stock_quantity || 0}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Estoque Mínimo</label>
                  <input 
                    name="min_stock" 
                    type="number" 
                    defaultValue={editingProduct?.min_stock || 0}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">SKU / Código de Barras</label>
                  <input 
                    name="sku" 
                    defaultValue={editingProduct?.sku}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">NCM</label>
                  <input 
                    name="ncm" 
                    defaultValue={editingProduct?.ncm}
                    placeholder="Ex: 8471.30.12"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Unidade</label>
                  <select 
                    name="unit" 
                    defaultValue={editingProduct?.unit || "UN"}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="LT">Litro (LT)</option>
                    <option value="MT">Metro (MT)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="FD">Fardo (FD)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Categoria</label>
                  <select 
                    name="category_name" 
                    defaultValue={editingProduct?.category_name}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Marca</label>
                  <select 
                    name="brand_name" 
                    defaultValue={editingProduct?.brand_name}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {brands.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award size={18} className="text-blue-600" />
                    Informações Fiscais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">NCM</label>
                      <input 
                        name="ncm" 
                        defaultValue={editingProduct?.ncm}
                        placeholder="0000.00.00"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">CEST</label>
                      <input 
                        name="cest" 
                        defaultValue={editingProduct?.cest}
                        placeholder="00.000.00"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">CFOP Padrão</label>
                      <input 
                        name="cfop" 
                        defaultValue={editingProduct?.cfop}
                        placeholder="5102"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">ICMS (%)</label>
                      <input 
                        name="icms_rate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.icms_rate || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">IPI (%)</label>
                      <input 
                        name="ipi_rate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.ipi_rate || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">PIS (%)</label>
                      <input 
                        name="pis_rate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.pis_rate || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">COFINS (%)</label>
                      <input 
                        name="cofins_rate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.cofins_rate || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">MVA (%)</label>
                      <input 
                        name="mva_rate" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.mva_rate || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Alíquota Interna Destino (%)</label>
                      <input 
                        name="aliquota_interna_destino" 
                        type="number"
                        step="0.01"
                        defaultValue={editingProduct?.aliquota_interna_destino || 0}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">CST / CSOSN</label>
                      <input 
                        name="cst" 
                        defaultValue={editingProduct?.cst || editingProduct?.csosn}
                        placeholder="102"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-100">
                  <BOMBuilder 
                    items={bomItems} 
                    onChange={setBomItems} 
                    excludeProductId={editingProduct?.id} 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-50 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome da Categoria *</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={editingCategory?.name}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBrandModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingBrand ? "Editar Marca" : "Nova Marca"}</h2>
              <button onClick={() => setIsBrandModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleBrandSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome da Marca *</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={editingBrand?.name}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsBrandModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={deleteMutation.isPending}
      />

      <LabelPrinter 
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        products={products}
      />
    </div>
  );
}
