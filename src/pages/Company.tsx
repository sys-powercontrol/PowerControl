import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Building2, Save, Upload, Phone, Mail, MapPin, Globe, QrCode, Shield, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { InputMask } from "../components/ui/InputMask";
import { externalApi } from "../services/externalApi";

export default function Company() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const companyId = user?.company_id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [fetchedData, setFetchedData] = useState<any>({});

  const canManage = hasPermission('settings.manage');

  

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => api.get(`companies/${companyId}`),
    enabled: !!companyId,
  });

  useEffect(() => {
    if (company?.logo_url) {
      setTimeout(() => setLogoPreview(company.logo_url), 0);
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put("companies", companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      toast.success("Dados da empresa atualizados com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar empresa:", error);
      toast.error(error.message || "Falha ao salvar as configurações da empresa.");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit for storage is reasonable
        toast.error("O logo deve ter menos de 2MB.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
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
        state: data.uf,
        cnae: data.atividade_principal?.[0]?.code
      }));
      toast.success("Dados da empresa encontrados!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar CNPJ");
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    let finalLogoUrl = company.logo_url;

    if (logoFile) {
      try {
        toast.loading("Fazendo upload da logomarca...", { id: "upload-logo" });
        const storageRef = ref(storage, `companies/${companyId}/logo`);
        await uploadBytes(storageRef, logoFile);
        finalLogoUrl = await getDownloadURL(storageRef);
        toast.dismiss("upload-logo");
      } catch (error) {
        console.error("Error uploading logo:", error);
        toast.error("Erro ao fazer upload da logomarca.");
        toast.dismiss("upload-logo");
        return;
      }
    }

    updateMutation.mutate({ ...data, logo_url: finalLogoUrl });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando dados da empresa...</div>;
  if (!company) return <div className="p-8 text-center text-red-500">Empresa não encontrada.</div>;

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
        <p className="text-gray-500 max-w-md">
          Esta página é restrita a usuários autorizados. Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dados da Empresa</h1>
        <p className="text-gray-500">Gerencie as informações públicas e de contato da sua empresa.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo and Basic Info */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <div className="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-50 flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={48} className="text-gray-300" />
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
                <Upload size={16} />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
                <input 
                  name="name"
                  defaultValue={fetchedData.name || company.name}
                  key={fetchedData.name}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">CNPJ</label>
                <div className="flex gap-2">
                  <InputMask 
                    name="cnpj"
                    mask="00.000.000/0000-00"
                    defaultValue={company.cnpj}
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
                <label className="text-sm font-bold text-gray-700">Inscrição Estadual (IE)</label>
                <input 
                  name="ie"
                  defaultValue={company.ie}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Inscrição Municipal (IM)</label>
                <input 
                  name="im"
                  defaultValue={company.im}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Regime Tributário</label>
                <select 
                  name="regime_tributario"
                  defaultValue={company.regime_tributario || "1"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional - excesso de sublimite de receita bruta</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">CNAE</label>
                <input 
                  name="cnae"
                  defaultValue={fetchedData.cnae || company.cnae}
                  key={fetchedData.cnae}
                  placeholder="Ex: 4751-2/01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">CRT</label>
                <select 
                  name="crt"
                  defaultValue={company.crt || "1"}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional, excesso sublimite de receita bruta</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="email"
                    type="email"
                    defaultValue={fetchedData.email || company.email}
                    key={fetchedData.email}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                  <InputMask 
                    name="phone"
                    mask="(00) 00000-0000"
                    defaultValue={fetchedData.phone || company.phone}
                    key={fetchedData.phone}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Chave PIX</label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="pix_key"
                    defaultValue={company.pix_key}
                    placeholder="E-mail, CPF, CNPJ ou Celular"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <MapPin size={20} className="text-blue-600" />
            <h2>Endereço</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Logradouro</label>
              <input 
                name="address"
                defaultValue={fetchedData.address || company.address}
                key={fetchedData.address}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Número</label>
              <input 
                name="address_number"
                defaultValue={fetchedData.address_number || company.address_number}
                key={fetchedData.address_number}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Complemento</label>
              <input 
                name="complement"
                defaultValue={fetchedData.complemento || company.complement}
                key={fetchedData.complemento}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Bairro</label>
              <input 
                name="neighborhood"
                defaultValue={fetchedData.neighborhood || company.neighborhood}
                key={fetchedData.neighborhood}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">CEP</label>
              <div className="flex gap-2">
                <InputMask 
                  name="zip_code"
                  mask="00000-000"
                  defaultValue={fetchedData.zip_code || company.zip_code}
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cidade</label>
              <input 
                name="city"
                defaultValue={fetchedData.city || company.city}
                key={fetchedData.city}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Estado (UF)</label>
              <input 
                name="state"
                defaultValue={fetchedData.state || company.state}
                key={fetchedData.state}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            <Save size={20} />
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
