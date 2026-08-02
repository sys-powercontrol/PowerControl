import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { calculateDiff } from "../lib/utils/diff";
import { useAuth } from "../lib/auth";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Wrench, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Clock,
  DollarSign,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import ExportButton from "../components/ExportButton";

export default function Services() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const { data: services = [], isLoading } = useQuery({ 
    queryKey: ["services", user?.company_id], 
    queryFn: () => api.get("services", { company_id: user?.company_id }) 
  });

  const filteredServices = services.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const serviceExportHeaders = {
    name: "Serviço",
    description: "Descrição",
    price: "Preço",
    cost: "Custo",
    duration: "Duração (min)",
    iss_rate: "ISS (%)"
  };

  const serviceMutation = useMutation({
    mutationFn: (data: any) => editingService 
      ? api.put("services", editingService.id, data)
      : api.post("services", data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      
      api.log({
        action: editingService ? 'UPDATE' : 'CREATE',
        entity: 'services',
        entity_id: result.id,
        description: `${editingService ? 'Atualizou' : 'Criou'} serviço ${result.name}`,
        metadata: result,
        changes: editingService ? calculateDiff(editingService, result) : null
      });

      toast.success(editingService ? "Serviço atualizado!" : "Serviço criado!");
      setIsModalOpen(false);
      setEditingService(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const price = parseFloat(data.price as string);
    const cost = parseFloat(data.cost as string);
    const iss_rate = parseFloat(data.iss_rate as string) || 0;
    const pis_rate = parseFloat(data.pis_rate as string) || 0;
    const cofins_rate = parseFloat(data.cofins_rate as string) || 0;

    serviceMutation.mutate({ ...data, company_id: user?.company_id, price, cost, iss_rate, pis_rate, cofins_rate });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
      api.delete("services", id).then(() => {
        api.log({
          action: 'DELETE',
          entity: 'services',
          entity_id: id,
          description: `Excluiu serviço ID: ${id}`
        });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
        toast.success("Serviço excluído!");
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-500">Gerencie o catálogo de serviços da sua empresa.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto min-w-0 items-stretch">
          <ExportButton 
            data={filteredServices} 
            filename="servicos" 
            format="xlsx" 
            headers={serviceExportHeaders} 
            className="bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-emerald-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileSpreadsheet className="text-emerald-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 leading-tight truncate">Excel</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <ExportButton 
            data={filteredServices} 
            filename="servicos" 
            format="pdf" 
            title="Relatório de Serviços"
            headers={serviceExportHeaders} 
            className="bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-rose-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="text-rose-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-rose-700 leading-tight truncate">PDF</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <button 
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-500/20 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] w-full h-full"
          >
            <Plus size={18} className="text-white shrink-0" />
            <span className="truncate">Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar serviços..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando serviços...</div>
        ) : filteredServices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhum serviço encontrado.
          </div>
        ) : filteredServices.map((service: any) => (
          <div key={service.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Wrench size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingService(service);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(service.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-lg text-gray-900 mb-1">{service.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description || "Sem descrição disponível."}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock size={16} />
                <span>{service.duration || "---"} min</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium uppercase">Preço</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(service.price || 0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingService ? "Editar Serviço" : "Novo Serviço"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome do Serviço *</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={editingService?.name}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição</label>
                <textarea 
                  name="description" 
                  rows={3}
                  defaultValue={editingService?.description}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Preço de Venda (R$) *</label>
                  <input 
                    name="price" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={editingService?.price}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Custo (R$)</label>
                  <input 
                    name="cost" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingService?.cost}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Duração Estimada (minutos)</label>
                <input 
                  name="duration" 
                  type="number" 
                  defaultValue={editingService?.duration}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  Informações Fiscais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Código de Serviço (LC 116)</label>
                    <input 
                      name="service_code" 
                      defaultValue={editingService?.service_code}
                      placeholder="01.01"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">ISS (%)</label>
                    <input 
                      name="iss_rate" 
                      type="number"
                      step="0.01"
                      defaultValue={editingService?.iss_rate || 0}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">PIS (%)</label>
                    <input 
                      name="pis_rate" 
                      type="number"
                      step="0.01"
                      defaultValue={editingService?.pis_rate || 0}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">COFINS (%)</label>
                    <input 
                      name="cofins_rate" 
                      type="number"
                      step="0.01"
                      defaultValue={editingService?.cofins_rate || 0}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
