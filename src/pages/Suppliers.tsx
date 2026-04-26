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
  Loader2
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
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      toast.error("CNPJ inválido. Digite 14 números.");
      return;
    }

    setIsSearchingCNPJ(true);
    try {
      const data = await externalApi.fetchCNPJ(cleanCNPJ);
      setFetchedData((prev: any) => ({
        ...prev,
        name: data.nome,
        email: data.email,
        phone: data.telefone,
        zip_code: data.cep.replace(/\D/g, ""),
        address: data.logradouro,
        address_number: data.numero,
        neighborhood: data.bairro,
        city: data.municipio,
        state: data.uf
      }));
      toast.success("Dados da empresa encontrados!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar CNPJ");
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (editingSupplier) {
      api.put("suppliers", editingSupplier.id, { ...data, company_id: user?.company_id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Fornecedor atualizado!");
        setIsModalOpen(false);
        setEditingSupplier(null);
      });
    } else {
      api.post("suppliers", { ...data, company_id: user?.company_id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        toast.success("Fornecedor cadastrado!");
        setIsModalOpen(false);
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
        <div className="flex gap-2">
          <div className="flex gap-2 mr-2">
            <ExportButton 
              data={filteredSuppliers} 
              filename="fornecedores" 
              format="xlsx" 
              headers={supplierExportHeaders} 
            />
            <ExportButton 
              data={filteredSuppliers} 
              filename="fornecedores" 
              format="pdf" 
              title="Relatório de Fornecedores"
              headers={supplierExportHeaders} 
            />
          </div>
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setFetchedData({});
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            Novo Fornecedor
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
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setFetchedData({});
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                      onChange={(val) => setCnpj(val)}
                    />
                    <button
                      type="button"
                      onClick={searchCNPJ}
                      disabled={isSearchingCNPJ}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Consultar CNPJ"
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
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
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
