import React, {} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { 
  Mail, 
  Phone, 
  Building2, 
  Copy, 
  Camera,
  LogOut,
  ShieldCheck,
  Shield,
  Crown
} from "lucide-react";
import { toast } from "sonner";
import { InputMask } from "../components/ui/InputMask";

export default function Profile() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { data: company = {} } = useQuery({ 
    queryKey: ["company", user?.company_id], 
    queryFn: () => user?.company_id ? api.get("companies", user.company_id) : Promise.resolve({}),
    enabled: !!user?.company_id
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put("users", user?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Perfil atualizado com sucesso!");
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const newCompany = await api.post("companies", data);
      await api.put("users", user?.id, { company_id: newCompany.id });
      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa criada e vinculada com sucesso!");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    updateProfileMutation.mutate(data);
  };

  const handleCreateCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    createCompanyMutation.mutate({ ...data, is_active: true });
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500">Gerencie suas informações pessoais e da empresa.</p>
      </div>

      {/* Company Section */}
      {user.company_id ? (
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4">
              <Building2 size={240} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-xl font-bold">Empresa Vinculada</h2>
                </div>
                <div>
                  <p className="text-3xl font-bold">{company.name || "Nenhuma empresa vinculada"}</p>
                  <p className="opacity-80">{company.cnpj || "CNPJ não informado"}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1"><Mail size={14} /> {company.email || "contato@empresa.com"}</span>
                  <span className="flex items-center gap-1"><Phone size={14} /> {company.phone || "(00) 0000-0000"}</span>
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                <p className="text-xs font-bold uppercase opacity-60 mb-2">ID da Empresa</p>
                <div className="flex items-center gap-3">
                  <code className="font-mono text-sm">{company.id || "---"}</code>
                  <button onClick={() => copyToClipboard(company.id)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Company Info */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-xl text-gray-900">Dados da Empresa</h4>
              <Building2 className="text-blue-600" size={24} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificação</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Nome Fantasia</p>
                    <p className="font-bold text-gray-900">{company.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CNPJ</p>
                    <p className="font-bold text-gray-900">{company.cnpj || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Inscrição Estadual (IE)</p>
                    <p className="font-bold text-gray-900">{company.ie || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Inscrição Municipal (IM)</p>
                    <p className="font-bold text-gray-900">{company.im || "---"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fiscal & Contato</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Regime Tributário</p>
                    <p className="font-bold text-gray-900">
                      {company.regime_tributario === "1" ? "Simples Nacional" : 
                       company.regime_tributario === "2" ? "Simples Nacional - excesso de sublimite" : 
                       company.regime_tributario === "3" ? "Regime Normal" : "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CNAE / CRT</p>
                    <p className="font-bold text-gray-900">{company.cnae || "---"} / {company.crt || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">E-mail de Contato</p>
                    <p className="font-bold text-gray-900">{company.email || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="font-bold text-gray-900">{company.phone || "---"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localização</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Endereço</p>
                    <p className="font-bold text-gray-900">
                      {company.address}{company.address_number ? `, ${company.address_number}` : ""}
                    </p>
                    {company.complement && <p className="text-xs text-gray-500">{company.complement}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Bairro / CEP</p>
                    <p className="font-bold text-gray-900">{company.neighborhood || "---"} / {company.zip_code || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cidade / UF</p>
                    <p className="font-bold text-gray-900">{company.city || "---"} / {company.state || "---"}</p>
                  </div>
                  {company.pix_key && (
                    <div>
                      <p className="text-xs text-gray-400">Chave PIX</p>
                      <p className="font-bold text-blue-600">{company.pix_key}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-6">
          {user?.role === 'master' || user?.role === 'admin' ? (
            <>
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 size={40} />
              </div>
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900">Você ainda não tem uma empresa</h2>
                <p className="text-gray-500 mt-2">Para começar a usar o sistema, você precisa criar uma empresa ou ser convidado por uma existente.</p>
              </div>
              
              <form onSubmit={handleCreateCompany} className="max-w-md mx-auto grid grid-cols-1 gap-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
                  <input name="name" required placeholder="Ex: Minha Loja LTDA" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CNPJ (Opcional)</label>
                  <InputMask 
                    name="cnpj" 
                    mask="00.000.000/0000-00"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={createCompanyMutation.isPending}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {createCompanyMutation.isPending ? "Criando..." : "Criar Minha Empresa"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Shield size={40} />
              </div>
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
                <p className="text-gray-500 mt-2">
                  Você ainda não está vinculado a nenhuma empresa. 
                  Apenas o Administrador Master pode criar novas empresas. 
                  Por favor, solicite um convite ao seu administrador.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-4xl font-bold border-4 border-white shadow-lg">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110">
                <Camera size={18} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{user.full_name}</h3>
            <p className="text-gray-500 text-sm mb-4">{user.email}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {user.role === 'master' ? 'Master' : user.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
              {user.role === 'master' && (
                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Crown size={10} /> Admin Master
                </span>
              )}
              {user.role === 'admin' && (
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={10} /> Admin Empresa
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-4">Informações do Sistema</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">ID do Usuário</p>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <code className="text-xs font-mono truncate mr-2">{user.id}</code>
                  <button onClick={() => copyToClipboard(user.id)} className="text-gray-400 hover:text-blue-600">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={logout}
            className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} /> Sair da Conta
          </button>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-xl text-gray-900 mb-6">Informações Pessoais</h4>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                  <input name="full_name" defaultValue={user.full_name} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <input value={user.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-gray-500 cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400 italic">O email não pode ser alterado.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <InputMask 
                    name="phone" 
                    mask="(00) 00000-0000"
                    defaultValue={user.phone}
                    className="bg-gray-50 border-gray-100 py-3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CPF</label>
                  <InputMask 
                    name="cpf" 
                    mask="000.000.000-00"
                    defaultValue={user.cpf}
                    className="bg-gray-50 border-gray-100 py-3"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Endereço</label>
                  <input name="address" defaultValue={user.address} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Nova Senha (deixe em branco para não alterar)</label>
                  <input type="password" name="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button type="submit" disabled={updateProfileMutation.isPending} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50">
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
