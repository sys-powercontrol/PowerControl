import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  MapPin,
  Shield,
  Loader2,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import { InputMask } from "../components/ui/InputMask";
import { externalApi } from "../services/externalApi";
import ExportButton from "../components/ExportButton";

export default function Suppliers() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canView = hasPermission('finance.view');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [fetchedData, setFetchedData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId();

  const { data: suppliersData = [], isLoading } = useQuery({ 
    queryKey: ["suppliers", currentCompanyId], 
    queryFn: () => api.get("suppliers"),
    enabled: !!user
  });

  const suppliers = useMemo(() => {
    if (!currentCompanyId) return suppliersData;
    return suppliersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [suppliersData, currentCompanyId]);

  const filteredSuppliers = suppliers.filter((s: any) => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const supplierExportHeaders = {
    name: "Razão Social",
    document: "CNPJ",
    email: "E-mail",
    phone: "Telefone",
    city: "Cidade",
    state: "UF",
    contact_name: "Contato"
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
      setFetchedData((prev: any) => ({
        ...prev,
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
      }));
      toast.success("Endereço encontrado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar CEP");
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const searchCNPJ = async () => {
    const rawCnpj = cnpj || editingSupplier?.document || "";
    const cleanCNPJ = rawCnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      toast.error("CNPJ inválido. Digite os 14 números.");
      return;
    }

    setIsSearchingCNPJ(true);
    try {
      const data = await externalApi.fetchCNPJ(cleanCNPJ);
      const cleanCep = data.cep ? data.cep.replace(/\D/g, "") : "";
      
      setFetchedData((prev: any) => ({
        ...prev,
        name: data.nome || data.fantasia || prev.name,
        email: data.email || prev.email,
        phone: data.telefone || prev.phone,
        zip_code: cleanCep || prev.zip_code,
        address: data.logradouro || prev.address,
        address_number: data.numero || prev.address_number,
        complemento: data.complemento || prev.complemento,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.municipio || prev.city,
        state: data.uf || prev.state
      }));

      if (cleanCep) {
        setZipCode(cleanCep);
      }
      toast.success("Dados da empresa consultados e preenchidos!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar CNPJ");
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (editingSupplier) {
      api.put("suppliers", editingSupplier.id, { ...data, company_id: currentCompanyId || user?.company_id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Fornecedor atualizado!");
        setIsModalOpen(false);
        setEditingSupplier(null);
      }).catch((err) => {
        toast.error("Erro ao atualizar fornecedor: " + err.message);
      }).finally(() => {
        setIsSaving(false);
      });
    } else {
      api.post("suppliers", { ...data, company_id: currentCompanyId || user?.company_id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Fornecedor cadastrado!");
        setIsModalOpen(false);
      }).catch((err) => {
        toast.error("Erro ao cadastrar fornecedor: " + err.message);
      }).finally(() => {
        setIsSaving(false);
      });
    }
  };

  const handleDelete = (id: string) => {
    setSupplierToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!supplierToDelete) return;
    api.delete("suppliers", supplierToDelete).then(() => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor excluído!");
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    });
  };

if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para gerenciar fornecedores. 
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
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-500">Gerencie seus parceiros de suprimentos.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto min-w-0 items-stretch">
          <ExportButton 
            data={filteredSuppliers} 
            filename="fornecedores" 
            format="xlsx" 
            headers={supplierExportHeaders} 
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
            data={filteredSuppliers} 
            filename="fornecedores" 
            format="pdf" 
            title="Relatório de Fornecedores"
            headers={supplierExportHeaders} 
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
              setEditingSupplier(null);
              setFetchedData({});
              setCnpj("");
              setZipCode("");
              setIsModalOpen(true);
            }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-500/20 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] w-full h-full"
          >
            <Plus size={18} className="text-white shrink-0" />
            <span className="truncate">Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CNPJ..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Localização</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Carregando fornecedores...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum fornecedor encontrado.</td></tr>
              ) : filteredSuppliers.map((supplier: any) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Truck size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{supplier.name}</p>
                        <p className="text-xs text-gray-500">{supplier.document || "Sem documento"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700 flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {supplier.email || "---"}</p>
                      <p className="text-sm text-gray-700 flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {supplier.phone || "---"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700 flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {supplier.city || "---"}, {supplier.state || "---"}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 items-center">
                      <button 
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setFetchedData(supplier);
                          setCnpj(supplier.document || "");
                          setZipCode(supplier.zip_code || "");
                          setIsModalOpen(true);
                        }}
                        title="Editar Fornecedor"
                        className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        title="Excluir Fornecedor"
                        className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Fornecedor"
        message="Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* Modal Novo/Editar Fornecedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
              <h2 className="text-xl font-bold">{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome/Razão Social *</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={fetchedData.name || editingSupplier?.name} 
                    key={fetchedData.name}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CNPJ/CPF</label>
                  <div className="flex gap-2">
                    <InputMask 
                      name="document" 
                      mask={[
                        { mask: '000.000.000-00' },
                        { mask: '00.000.000/0000-00' }
                      ]}
                      defaultValue={editingSupplier?.document}
                      value={cnpj || undefined}
                      onChange={(val) => setCnpj(val)}
                      key={`cnpj-${cnpj}`}
                    />
                    <button
                      type="button"
                      onClick={searchCNPJ}
                      disabled={isSearchingCNPJ || (cnpj || editingSupplier?.document || "").replace(/\D/g, "").length !== 14}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Consultar dados na Receita Federal via CNPJ"
                    >
                      {isSearchingCNPJ ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">E-mail</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={fetchedData.email || editingSupplier?.email} 
                    key={fetchedData.email}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <InputMask 
                    name="phone" 
                    mask="(00) 00000-0000"
                    defaultValue={fetchedData.phone || editingSupplier?.phone}
                    key={fetchedData.phone}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Inscrição Estadual</label>
                  <input name="ie" defaultValue={editingSupplier?.ie} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CEP</label>
                  <div className="flex gap-2">
                    <InputMask 
                      name="zip_code" 
                      mask="00000-000"
                      defaultValue={fetchedData.zip_code || editingSupplier?.zip_code}
                      key={fetchedData.zip_code}
                      onChange={(val) => setZipCode(val)}
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
                    defaultValue={fetchedData.address || editingSupplier?.address} 
                    key={fetchedData.address}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Número</label>
                  <input 
                    name="address_number" 
                    defaultValue={fetchedData.address_number || editingSupplier?.address_number} 
                    key={fetchedData.address_number}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Bairro</label>
                  <input 
                    name="neighborhood" 
                    defaultValue={fetchedData.neighborhood || editingSupplier?.neighborhood} 
                    key={fetchedData.neighborhood}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Complemento</label>
                  <input 
                    name="complement" 
                    defaultValue={fetchedData.complemento || editingSupplier?.complement} 
                    key={fetchedData.complemento}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cidade</label>
                  <input 
                    name="city" 
                    defaultValue={fetchedData.city || editingSupplier?.city} 
                    key={fetchedData.city}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Estado (UF)</label>
                  <input 
                    name="state" 
                    maxLength={2} 
                    defaultValue={fetchedData.state || editingSupplier?.state} 
                    key={fetchedData.state}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm">Cancelar</button>
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
                    <span>{editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}</span>
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
