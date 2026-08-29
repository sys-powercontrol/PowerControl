import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Plus, 
  Eye,
  Edit2, 
  Trash2, 
  Shield,
  Search,
  FileText,
  Calculator,
  Percent,
  Calendar,
  Layers,
  X
} from "lucide-react";
import { toast } from "sonner";
import { TaxRuleForm } from "../components/Fiscal/TaxRuleForm";

export default function TaxSettings() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [viewingRule, setViewingRule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const currentCompanyId = api.getCompanyId();
  const canManage = hasPermission('fiscal.manage');

  

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
    mutationFn: async (data: any) => {
      if (editingRule) {
        const res = await api.put("tax_rules", editingRule.id, data);
        await api.log({
          action: 'UPDATE',
          entity: 'tax_rules',
          entity_id: editingRule.id,
          description: `Atualizou regra tributária NCM: ${data.ncm || editingRule.ncm}`,
          metadata: { ncm: data.ncm, description: data.description, icms_rate: data.icms_rate }
        });
        return res;
      } else {
        const res = await api.post("tax_rules", data);
        await api.log({
          action: 'CREATE',
          entity: 'tax_rules',
          entity_id: (res as any)?.id || "new",
          description: `Cadastrou nova regra tributária NCM: ${data.ncm}`,
          metadata: { ncm: data.ncm, description: data.description, icms_rate: data.icms_rate }
        });
        return res;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_rules"] });
      toast.success(editingRule ? "Regra fiscal atualizada!" : "Regra fiscal cadastrada!");
      setIsModalOpen(false);
      setEditingRule(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const targetRule = taxRules.find((r: any) => r.id === id);
      const res = await api.delete("tax_rules", id);
      await api.log({
        action: 'DELETE',
        entity: 'tax_rules',
        entity_id: id,
        description: `Excluiu regra tributária NCM: ${targetRule?.ncm || id}`,
        metadata: { ncm: targetRule?.ncm, description: targetRule?.description }
      });
      return res;
    },
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
      company_id: currentCompanyId || user?.company_id,
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
                  onClick={() => setViewingRule(rule)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Visualizar detalhes da regra"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => openEditModal(rule)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Editar regra"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Excluir regra"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Calculator size={20} />
                </div>
                <h2 className="text-xl font-bold">{editingRule ? "Editar Regra Fiscal" : "Nova Regra Fiscal"}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
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

      {/* Modal Flutuante de Detalhes do Registro (Visualização) */}
      {viewingRule && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setViewingRule(null)} 
          />
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl">
                  <Eye size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Detalhes da Regra Fiscal</h2>
                  <p className="text-xs text-blue-100 font-mono">NCM: {viewingRule.ncm || "Não informado"}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingRule(null)} 
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Informações Básicas */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                  <Layers size={14} className="text-blue-600" />
                  Identificação & Classificação
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">Código NCM:</span>
                    <span className="text-base font-extrabold text-gray-900 font-mono">{viewingRule.ncm}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Descrição:</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingRule.description || "Sem descrição cadastrada"}</span>
                  </div>
                </div>
              </div>

              {/* Alíquotas Tributárias */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                  <Percent size={14} className="text-blue-600" />
                  Alíquotas de Impostos Aplicáveis
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50/60 border border-blue-100/80 p-3.5 rounded-2xl text-center">
                    <p className="text-[11px] font-extrabold text-blue-600 uppercase">ICMS</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{viewingRule.icms_rate ?? 0}%</p>
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-100/80 p-3.5 rounded-2xl text-center">
                    <p className="text-[11px] font-extrabold text-indigo-600 uppercase">IPI</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{viewingRule.ipi_rate ?? 0}%</p>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-100/80 p-3.5 rounded-2xl text-center">
                    <p className="text-[11px] font-extrabold text-emerald-600 uppercase">PIS</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{viewingRule.pis_rate ?? 0}%</p>
                  </div>
                  <div className="bg-amber-50/60 border border-amber-100/80 p-3.5 rounded-2xl text-center">
                    <p className="text-[11px] font-extrabold text-amber-600 uppercase">COFINS</p>
                    <p className="text-lg font-black text-gray-900 mt-1">{viewingRule.cofins_rate ?? 0}%</p>
                  </div>
                </div>
              </div>

              {/* CFOPs */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase">
                  <FileText size={14} className="text-blue-600" />
                  Códigos Fiscais de Operações (CFOP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                    <span className="text-xs text-gray-500 block">Operação Interna (Mesmo Estado):</span>
                    <span className="text-sm font-bold text-blue-700 font-mono mt-0.5 block">{viewingRule.cfop_internal || "Não especificado"}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100/80">
                    <span className="text-xs text-gray-500 block">Operação Interestadual:</span>
                    <span className="text-sm font-bold text-indigo-700 font-mono mt-0.5 block">{viewingRule.cfop_interstate || "Não especificado"}</span>
                  </div>
                </div>
              </div>

              {/* Metadados */}
              {viewingRule.created_at && (
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>Cadastrado em: {new Date(viewingRule.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">ID: {viewingRule.id?.slice(0, 8)}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingRule(null)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = viewingRule;
                  setViewingRule(null);
                  openEditModal(r);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
              >
                <Edit2 size={16} />
                Editar Esta Regra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
