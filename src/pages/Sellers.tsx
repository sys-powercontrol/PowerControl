import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { calculateDiff } from "../lib/utils/diff";
import { useAuth } from "../lib/auth";
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  Percent,
  BadgeCheck,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import ExportButton from "../components/ExportButton";

export default function Sellers() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = hasPermission('sellers.manage');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: sellers = [], isLoading } = useQuery({ 
    queryKey: ["sellers", user?.company_id], 
    queryFn: () => api.get("sellers") 
  });

  const filteredSellers = sellers.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sellerExportHeaders = {
    name: "Vendedor",
    email: "E-mail",
    phone: "Telefone",
    commission_rate: "Comissão (%)",
    monthly_goal: "Meta Mensal",
    active: "Ativo"
  };

  const sellerMutation = useMutation({
    mutationFn: (data: any) => editingSeller 
      ? api.put("sellers", editingSeller.id, data)
      : api.post("sellers", data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      
      api.log({
        action: editingSeller ? 'UPDATE' : 'CREATE',
        entity: 'sellers',
        entity_id: result.id,
        description: `${editingSeller ? 'Atualizou' : 'Cadastrou'} vendedor ${result.name}`,
        metadata: result,
        changes: editingSeller ? calculateDiff(editingSeller, result) : null
      });

      toast.success(editingSeller ? "Vendedor atualizado!" : "Vendedor cadastrado!");
      setIsModalOpen(false);
      setEditingSeller(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const commission = parseFloat(data.commission_rate as string);
    const monthlyGoal = parseFloat(data.monthly_goal as string) || 0;
    const isActive = data.active === "on";

    sellerMutation.mutate({ 
      ...data, 
      company_id: user?.company_id, 
      commission_rate: commission, 
      monthly_goal: monthlyGoal,
      active: isActive 
    });
  };

  const handleDelete = async () => {
    if (!sellerToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete("sellers", sellerToDelete);
      await api.log({
        action: 'DELETE',
        entity: 'sellers',
        entity_id: sellerToDelete,
        description: `Excluiu vendedor ID: ${sellerToDelete}`
      });
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Vendedor excluído!");
      setIsConfirmModalOpen(false);
      setSellerToDelete(null);
    } catch {
      toast.error("Erro ao excluir vendedor.");
    } finally {
      setIsDeleting(false);
    }
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
            Você não tem permissão para gerenciar vendedores. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-gray-500">Gerencie sua equipe de vendas e comissões.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2 mr-2">
            <ExportButton 
              data={filteredSellers} 
              filename="vendedores" 
              format="xlsx" 
              headers={sellerExportHeaders} 
            />
            <ExportButton 
              data={filteredSellers} 
              filename="vendedores" 
              format="pdf" 
              title="Relatório de Vendedores"
              headers={sellerExportHeaders} 
            />
          </div>
          <button 
            onClick={() => {
              setEditingSeller(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
          >
            <UserPlus size={20} />
            Novo Vendedor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando vendedores...</div>
        ) : filteredSellers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhum vendedor encontrado.
          </div>
        ) : filteredSellers.map((seller: any) => (
          <div key={seller.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                {seller.name.charAt(0)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingSeller(seller);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => {
                    setSellerToDelete(seller.id);
                    setIsConfirmModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
              {seller.name}
              {seller.active && <BadgeCheck size={18} className="text-blue-500" />}
            </h3>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail size={16} />
                <span>{seller.email || "Sem e-mail"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone size={16} />
                <span>{seller.phone || "Sem telefone"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600 font-bold bg-blue-50 w-fit px-2 py-1 rounded-lg">
                <Percent size={16} />
                <span>Comissão: {seller.commission_rate || 0}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar Vendedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingSeller ? "Editar Vendedor" : "Novo Vendedor"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={editingSeller?.name}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">E-mail</label>
                  <input 
                    name="email" 
                    type="email"
                    defaultValue={editingSeller?.email}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <input 
                    name="phone" 
                    defaultValue={editingSeller?.phone}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Taxa de Comissão (%) *</label>
                  <input 
                    name="commission_rate" 
                    type="number" 
                    step="0.1" 
                    required 
                    defaultValue={editingSeller?.commission_rate}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Meta Mensal (R$)</label>
                  <input 
                    name="monthly_goal" 
                    type="number" 
                    step="1" 
                    defaultValue={editingSeller?.monthly_goal}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  name="active" 
                  id="active" 
                  defaultChecked={editingSeller ? editingSeller.active : true}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm font-bold text-gray-700">Vendedor Ativo</label>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={sellerMutation.isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  {sellerMutation.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Vendedor"
        message="Tem certeza que deseja excluir este vendedor? Esta ação não pode ser desfeita."
        isLoading={isDeleting}
      />
    </div>
  );
}
