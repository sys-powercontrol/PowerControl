import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield,
  Search,
  FileText,
  Calculator
} from "lucide-react";
import { toast } from "sonner";
import { TaxRuleForm } from "../components/Fiscal/TaxRuleForm";

export default function TaxSettings() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const currentCompanyId = api.getCompanyId();
  const canManage = hasPermission('fiscal.manage');

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar as configurações fiscais.
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  const { data: taxRules = [], isLoading } = useQuery({
    queryKey: ["tax_rules", currentCompanyId],
    queryFn: () => api.get("tax_rules"),
    enabled: !!user
  });

  const filteredRules = taxRules.filter((rule: any) => 
    rule.ncm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ruleMutation = useMutation({
    mutationFn: (data: any) => editingRule 
      ? api.put("tax_rules", editingRule.id, data)
      : api.post("tax_rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_rules"] });
      toast.success(editingRule ? "Regra fiscal atualizada!" : "Regra fiscal cadastrada!");
      setIsModalOpen(false);
      setEditingRule(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete("tax_rules", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_rules"] });
      toast.success("Regra fiscal removida!");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const ruleData = {
      ...data,
      company_id: user?.company_id,
      icms_rate: parseFloat(data.icms_rate as string) || 0,
      ipi_rate: parseFloat(data.ipi_rate as string) || 0,
      pis_rate: parseFloat(data.pis_rate as string) || 0,
      cofins_rate: parseFloat(data.cofins_rate as string) || 0,
      created_at: editingRule ? editingRule.created_at : new Date().toISOString()
    };

    ruleMutation.mutate(ruleData);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover esta regra fiscal?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações Fiscais</h1>
          <p className="text-gray-500">Gerencie regras de tributação por NCM.</p>
        </div>
        <button 
          onClick={() => {
            setEditingRule(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          Nova Regra
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por NCM ou descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando regras...</div>
        ) : filteredRules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            Nenhuma regra fiscal encontrada.
          </div>
        ) : filteredRules.map((rule: any) => (
          <div key={rule.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <FileText size={24} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(rule)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">NCM: {rule.ncm}</h3>
                <p className="text-sm text-gray-500 truncate">{rule.description || "Sem descrição"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">ICMS</p>
                  <p className="text-sm font-bold text-gray-700">{rule.icms_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">IPI</p>
                  <p className="text-sm font-bold text-gray-700">{rule.ipi_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">PIS</p>
                  <p className="text-sm font-bold text-gray-700">{rule.pis_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">COFINS</p>
                  <p className="text-sm font-bold text-gray-700">{rule.cofins_rate}%</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">CFOP Interno:</span>
                  <span className="text-gray-700 font-bold">{rule.cfop_internal || "---"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">CFOP Inter:</span>
                  <span className="text-gray-700 font-bold">{rule.cfop_interstate || "---"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova/Editar Regra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Calculator size={20} />
                </div>
                <h2 className="text-xl font-bold">{editingRule ? "Editar Regra Fiscal" : "Nova Regra Fiscal"}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <TaxRuleForm 
              onSubmit={handleSubmit}
              onCancel={() => setIsModalOpen(false)}
              initialData={editingRule}
              isPending={ruleMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
