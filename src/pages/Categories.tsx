import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Shield,
  Tag,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Categories() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission('finance.manage') || hasPermission('settings.manage');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId();

  const { data: categoriesData = [], isLoading } = useQuery({ 
    queryKey: ["categories", currentCompanyId], 
    queryFn: () => api.get("categories"),
    enabled: !!user
  });

  const categories = useMemo(() => {
    if (!currentCompanyId) return categoriesData;
    return categoriesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [categoriesData, currentCompanyId]);

  const filteredCategories = categories.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const mutationPromise = editingCategory 
      ? api.put("categories", editingCategory.id, { ...data, company_id: currentCompanyId })
      : api.post("categories", { ...data, company_id: currentCompanyId });

    mutationPromise.then(() => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editingCategory ? "Categoria atualizada!" : "Categoria cadastrada!");
      setIsModalOpen(false);
      setEditingCategory(null);
    }).catch(err => {
      toast.error("Erro ao salvar categoria: " + err.message);
    });
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    api.delete("categories", categoryToDelete).then(() => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria excluída!");
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }).catch(err => {
      toast.error("Erro ao excluir: " + err.message);
    });
  };

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para gerenciar os centros de custos/categorias.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Custos</h1>
          <p className="text-gray-500">Gerencie as categorias de receitas e despesas.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          Nova Categoria
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando categorias...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            Nenhuma categoria encontrada.
          </div>
        ) : filteredCategories.map((category: any) => (
          <div key={category.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Tag size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{category.code || "S/ CÓDIGO"}</p>
                  <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingCategory(category);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {category.description && (
              <p className="mt-4 text-sm text-gray-500 line-clamp-2">{category.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Categoria"
        message="Tem certeza que deseja excluir esta categoria? Isso pode afetar relatórios que a utilizam."
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Modal Novo/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome da Categoria *</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingCategory?.name} 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Ex: Aluguel, Salários, Vendas"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Código</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      name="code" 
                      defaultValue={editingCategory?.code} 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Ex: 1.01.001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Descrição</label>
                  <textarea 
                    name="description" 
                    defaultValue={editingCategory?.description} 
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                    placeholder="Opcional: detalhes sobre o que esta categoria abrange"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                  {editingCategory ? "Salvar Alterações" : "Cadastrar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
