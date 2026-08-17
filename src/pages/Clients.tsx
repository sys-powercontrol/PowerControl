import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Phone, 
  Mail, 
  MapPin,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { InputMask } from "../components/ui/InputMask";
import { externalApi } from "../services/externalApi";
import ExportButton from "../components/ExportButton";

export default function Clients() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [addressData, setAddressData] = useState<any>({});

  const [searchTerm, setSearchTerm] = useState("");

  const canView = hasPermission('sales.view');

  

  const currentCompanyId = api.getCompanyId();

  const { data: clientsData = [], isLoading } = useQuery({ 
    queryKey: ["clients", currentCompanyId], 
    queryFn: () => api.get("clients"),
    enabled: !!user
  });

  const clients = React.useMemo(() => {
    if (!currentCompanyId) return clientsData;
    return clientsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [clientsData, currentCompanyId]);

  const filteredClients = clients.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientExportHeaders = {
    name: "Nome",
    document: "Documento",
    email: "E-mail",
    phone: "Telefone",
    city: "Cidade",
    state: "UF",
    address: "Endereço"
  };

  const handleCEPChange = (value: string) => {
    setZipCode(value);
  };

  const searchCEP = async () => {
    const cleanCEP = zipCode.replace(/\D/g, "");
    if (cleanCEP.length !== 8) {
      toast.error("CEP inválido. Digite 8 números.");
      return;
    }

    setIsSearchingCEP(true);
    try {
      const data = await externalApi.fetchCEP(cleanCEP);
      setAddressData({
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
      });
      toast.success("Endereço encontrado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar CEP");
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const clientData = {
      ...data,
      company_id: currentCompanyId || user?.company_id,
      is_active: true
    };

    if (editingClient) {
      api.put("clients", editingClient.id, clientData).then(() => {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Cliente atualizado!");
        setIsModalOpen(false);
      }).catch((error) => {
        toast.error("Erro ao atualizar cliente: " + error.message);
      }).finally(() => {
        setIsSaving(false);
      });
    } else {
      api.post("clients", clientData).then(() => {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Cliente cadastrado!");
        setIsModalOpen(false);
      }).catch(async (error) => {
        console.warn("Falha ao salvar cliente online, caindo para modo offline...", error);
        if (!navigator.onLine || error.message?.includes('offline') || error.message?.includes('Failed to fetch')) {
           const { offlineStore } = await import('../lib/offlineStore');
           await offlineStore.saveClient(clientData);
           setIsModalOpen(false);
        } else {
           toast.error("Erro ao cadastrar cliente: " + error.message);
        }
      }).finally(() => {
        setIsSaving(false);
      });
    }
  };

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Users size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar os clientes. 
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
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie sua base de clientes.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto min-w-0 items-stretch">
          <ExportButton 
            data={filteredClients} 
            filename="clientes" 
            format="xlsx" 
            headers={clientExportHeaders} 
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
            data={filteredClients} 
            filename="clientes" 
            format="pdf" 
            title="Relatório de Clientes"
            headers={clientExportHeaders} 
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
              setEditingClient(null); 
              setAddressData({});
              setIsModalOpen(true); 
            }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-500/20 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] w-full h-full"
          >
            <Plus size={18} className="text-white shrink-0" />
            <span className="truncate">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome, CPF ou email..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando clientes...</div>
        ) : filteredClients.map((c: any) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              <button 
                onClick={() => { 
                  setEditingClient(c); 
                  setAddressData({});
                  setIsModalOpen(true); 
                }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                <p className="text-xs text-gray-500">Cód: {c.id.substr(0, 6).toUpperCase()}</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span>{c.phone || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{c.email || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="truncate">{c.city || "Cidade não inf."}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {c.is_active ? "Ativo" : "Inativo"}
              </span>
              <button className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                Ver histórico <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
              <h2 className="text-xl font-bold">{editingClient ? "Editar Cliente" : "Novo Cliente"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={editingClient?.name}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={editingClient?.email}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <InputMask 
                    name="phone" 
                    mask="(00) 00000-0000"
                    defaultValue={editingClient?.phone}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Data de Nascimento</label>
                  <input 
                    name="birth_date" 
                    type="date"
                    defaultValue={editingClient?.birth_date}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CPF / CNPJ</label>
                  <InputMask 
                    name="cpf" 
                    mask={[
                      { mask: '000.000.000-00' },
                      { mask: '00.000.000/0000-00' }
                    ]}
                    defaultValue={editingClient?.cpf}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CEP</label>
                  <div className="flex gap-2">
                    <InputMask 
                      name="zip_code" 
                      mask="00000-000"
                      defaultValue={editingClient?.zip_code}
                      onChange={handleCEPChange}
                    />
                    <button
                      type="button"
                      onClick={searchCEP}
                      disabled={isSearchingCEP}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Buscar CEP"
                    >
                      {isSearchingCEP ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Endereço</label>
                  <input 
                    name="address" 
                    defaultValue={addressData.address || editingClient?.address}
                    key={addressData.address}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Número</label>
                  <input 
                    name="address_number" 
                    defaultValue={editingClient?.address_number}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Bairro</label>
                  <input 
                    name="neighborhood" 
                    defaultValue={addressData.neighborhood || editingClient?.neighborhood}
                    key={addressData.neighborhood}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Complemento</label>
                  <input 
                    name="complement" 
                    defaultValue={editingClient?.complement}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cidade</label>
                  <input 
                    name="city" 
                    defaultValue={addressData.city || editingClient?.city}
                    key={addressData.city}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Estado</label>
                  <input 
                    name="state" 
                    defaultValue={addressData.state || editingClient?.state}
                    key={addressData.state}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>{editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
