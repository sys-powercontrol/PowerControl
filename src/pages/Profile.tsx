import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { auth } from "../lib/firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { 
  Mail, 
  Phone, 
  Building2, 
  Copy, 
  Camera,
  LogOut,
  ShieldCheck,
  Shield,
  Crown,
  KeyRound,
  X,
  CheckCircle2,
  ArrowRight,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { InputMask } from "../components/ui/InputMask";

export default function Profile() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [activeTabCompanyId, setActiveTabCompanyId] = useState<string | null>(null);

  // Fetch all companies to resolve all linked company documents
  const { data: allCompaniesList = [] } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => api.get("companies", { _all: true }),
    enabled: !!user
  });

  const userCompanyIds: string[] = React.useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.company_ids) && user.company_ids.length > 0) {
      return user.company_ids;
    }
    return user.company_id ? [user.company_id] : [];
  }, [user]);

  const linkedCompanies = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'master') {
      return allCompaniesList;
    }
    return allCompaniesList.filter((c: any) => userCompanyIds.includes(c.id));
  }, [user, allCompaniesList, userCompanyIds]);

  const currentSystemCompanyId = api.getCompanyId() || user?.company_id || (userCompanyIds.length > 0 ? userCompanyIds[0] : null);
  const activeCompany = linkedCompanies.find((c: any) => c.id === (activeTabCompanyId || currentSystemCompanyId)) || linkedCompanies[0] || {};

  const handleSwitchActiveCompany = (companyId: string) => {
    api.setCompanyId(companyId);
    setActiveTabCompanyId(companyId);
    queryClient.invalidateQueries();
    toast.success("Empresa ativa alterada com sucesso!");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReauthModal, setShowReauthModal] = React.useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState("");
  const [pendingNewPassword, setPendingNewPassword] = React.useState("");
  const [isReauthenticating, setIsReauthenticating] = React.useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put("users", user?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Perfil atualizado com sucesso!");
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const newCompany = await api.post("companies", { ...data, is_active: true });
      const updatedCompanyIds = Array.from(new Set([...userCompanyIds, newCompany.id]));
      await api.put("users", user?.id, { 
        company_id: newCompany.id,
        company_ids: updatedCompanyIds,
        is_active: true,
        role: user?.role === 'user' ? 'admin' : (user?.role || 'admin')
      });
      api.setCompanyId(newCompany.id);
      return newCompany;
    },
    onSuccess: (newCompany) => {
      api.setCompanyId(newCompany.id);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa criada e vinculada com sucesso!");
    },
  });

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const pwd = data.password as string;
    if (pwd && pwd.trim().length > 0) {
      if (pwd.length < 6) {
        toast.error("A nova senha deve ter no mínimo 6 caracteres.");
        return;
      }
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, pwd);
          toast.success("Senha alterada com sucesso!");
        }
      } catch (err: any) {
        if (err.code === "auth/requires-recent-login") {
          setPendingNewPassword(pwd);
          setShowReauthModal(true);
          toast.info("Por segurança, confirme sua senha atual para prosseguir.");
        } else {
          toast.error("Erro ao alterar a senha: " + (err.message || ""));
        }
        return;
      }
    }

    delete data.password;
    updateProfileMutation.mutate(data);
  };

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput || !auth.currentUser || !user?.email) return;

    setIsReauthenticating(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPasswordInput);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pendingNewPassword);
      toast.success("Senha alterada com sucesso!");
      setShowReauthModal(false);
      setCurrentPasswordInput("");
      setPendingNewPassword("");
    } catch {
      toast.error("Senha atual incorreta. Tente novamente.");
    } finally {
      setIsReauthenticating(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateProfileMutation.mutate({ avatar: base64 });
    };
    reader.readAsDataURL(file);
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

  // MFA Logic
  const isPrivileged = user?.role === 'master' || user?.role === 'admin';
  const [showMfaModal, setShowMfaModal] = React.useState(false);
  const [mfaCodeInput, setMfaCodeInput] = React.useState('');

  const handleToggleMfa = () => {
    if (user?.mfa_enabled) {
      updateProfileMutation.mutate({ mfa_enabled: false });
      toast.success("Autenticação em duas etapas desativada.");
    } else {
      setShowMfaModal(true);
    }
  };

  const handleConfirmMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCodeInput.length !== 6) {
      toast.error("O código deve conter 6 dígitos numéricos.");
      return;
    }
    updateProfileMutation.mutate({ mfa_enabled: true });
    toast.success("Autenticação em duas etapas ativada com sucesso!");
    setShowMfaModal(false);
    setMfaCodeInput('');
  };

  if (!user) return null;

  const isPendingUser = !user.is_active && user.role !== 'master';
  const hasLinkedCompanies = linkedCompanies.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500">Gerencie suas informações pessoais e da empresa.</p>
      </div>

      {/* Account Approval Status Banner if pending */}
      {isPendingUser && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl font-bold text-lg">⏳</span>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Conta Aguardando Liberação</h2>
              <span className="inline-block px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-xs font-bold uppercase mt-0.5">
                Pendente de Aprovação
              </span>
            </div>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed pt-1">
            Seu cadastro foi realizado com sucesso! Para garantir a segurança dos dados da organização, sua conta está aguardando a liberação por um usuário administrador. Enquanto aguarda, você pode visualizar e atualizar seus dados nesta página ou entrar em contato com a equipe através da aba de <strong>Suporte</strong>.
          </p>
        </div>
      )}

      {/* Company Section */}
      {hasLinkedCompanies ? (
        <div className="space-y-6">
          {/* Hero Banner for Active Company & Multi-Company Overview */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 pointer-events-none">
              <Building2 size={260} />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Building2 size={22} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">Empresa Ativa no Sistema</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Sessão Conectada
                  </span>
                  {user.role === 'master' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-400/20 text-amber-200 border border-amber-400/30 flex items-center gap-1">
                      <Crown size={12} />
                      Admin Master (Global)
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-3xl font-extrabold tracking-tight">{activeCompany.name || "Nenhuma empresa vinculada"}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-blue-100">
                    <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                      CNPJ: {activeCompany.cnpj || "Não informado"}
                    </span>
                    {activeCompany.city && (
                      <span>• {activeCompany.city}{activeCompany.state ? `/${activeCompany.state}` : ""}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-blue-100/90 pt-1">
                  <span className="flex items-center gap-1.5"><Mail size={13} /> {activeCompany.email || "contato@empresa.com"}</span>
                  <span className="flex items-center gap-1.5"><Phone size={13} /> {activeCompany.phone || "(00) 0000-0000"}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 w-full sm:w-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1.5 flex items-center justify-between gap-4">
                    <span>ID da Empresa Ativa</span>
                    <span className="text-[9px] font-normal text-blue-200">Clique p/ copiar</span>
                  </p>
                  <div className="flex items-center gap-3 justify-between">
                    <code className="font-mono text-xs text-white select-all">{activeCompany.id || "---"}</code>
                    <button 
                      onClick={() => copyToClipboard(activeCompany.id)} 
                      className="p-1.5 bg-white/10 hover:bg-white/25 rounded-lg transition-colors cursor-pointer"
                      title="Copiar ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {linkedCompanies.length > 1 && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-2 border border-white/20">
                    <Layers size={14} />
                    <span>{linkedCompanies.length} empresas disponíveis para sua conta</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALL LINKED COMPANIES DISPLAY & QUICK SWITCHER */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Todas as Empresas Vinculadas ao Usuário
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full">
                    {linkedCompanies.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-10">
                  Lista completa de organizações às quais você possui permissão e credenciais de acesso.
                </p>
              </div>

              {user.role === 'master' && (
                <span className="self-start sm:self-auto px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Crown size={14} /> Modo Master: Acesso Ilimitado a Todas as Empresas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {linkedCompanies.map((c: any, index: number) => {
                const isCurrentActive = c.id === (activeCompany.id || currentSystemCompanyId);
                const isPrimary = index === 0 || c.id === user.company_id;
                
                return (
                  <div 
                    key={c.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      isCurrentActive 
                        ? "bg-blue-50/50 border-blue-300 shadow-md ring-2 ring-blue-500/20" 
                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                            isCurrentActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}>
                            {c.logo_url ? (
                              <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Building2 size={22} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-sm truncate" title={c.name}>
                                {c.name}
                              </h4>
                              {isPrimary && (
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                              {c.cnpj ? `CNPJ: ${c.cnpj}` : "CNPJ não informado"}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          c.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {c.is_active !== false ? "Ativa" : "Inativa"}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400">Cidade / UF:</span>
                          <span className="font-semibold text-gray-800 truncate">{c.city || "---"}{c.state ? `/${c.state}` : ""}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-400">Contato:</span>
                          <span className="font-medium text-gray-700 truncate">{c.phone || c.email || "---"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60 text-[11px]">
                          <span className="text-gray-400">Nível de Acesso:</span>
                          <span className="font-bold text-blue-700">
                            {user.role === 'master' ? 'Admin Master' : user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {isCurrentActive ? (
                        <div className="w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-200">
                          <CheckCircle2 size={15} />
                          <span>Empresa em Uso</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchActiveCompany(c.id)}
                          className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <ArrowRight size={14} />
                          <span>Alternar para Esta</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Company Info of Current Active Company */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-xl text-gray-900">Ficha Detalhada da Empresa Ativa</h4>
                <p className="text-xs text-gray-500">Dados cadastrais, fiscais e endereço de {activeCompany.name}</p>
              </div>
              <Building2 className="text-blue-600" size={24} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificação</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Nome Fantasia / Razão</p>
                    <p className="font-bold text-gray-900">{activeCompany.name || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CNPJ</p>
                    <p className="font-bold text-gray-900">{activeCompany.cnpj || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Inscrição Estadual (IE)</p>
                    <p className="font-bold text-gray-900">{activeCompany.ie || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Inscrição Municipal (IM)</p>
                    <p className="font-bold text-gray-900">{activeCompany.im || "---"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fiscal & Contato</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Regime Tributário</p>
                    <p className="font-bold text-gray-900">
                      {activeCompany.regime_tributario === "1" ? "Simples Nacional" : 
                       activeCompany.regime_tributario === "2" ? "Simples Nacional - excesso de sublimite" : 
                       activeCompany.regime_tributario === "3" ? "Regime Normal" : "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CNAE / CRT</p>
                    <p className="font-bold text-gray-900">{activeCompany.cnae || "---"} / {activeCompany.crt || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">E-mail de Contato</p>
                    <p className="font-bold text-gray-900">{activeCompany.email || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="font-bold text-gray-900">{activeCompany.phone || "---"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localização</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Endereço</p>
                    <p className="font-bold text-gray-900">
                      {activeCompany.address ? `${activeCompany.address}${activeCompany.address_number ? `, ${activeCompany.address_number}` : ""}` : "---"}
                    </p>
                    {activeCompany.complement && <p className="text-xs text-gray-500">{activeCompany.complement}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Bairro / CEP</p>
                    <p className="font-bold text-gray-900">{activeCompany.neighborhood || "---"} / {activeCompany.zip_code || "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cidade / UF</p>
                    <p className="font-bold text-gray-900">{activeCompany.city || "---"} / {activeCompany.state || "---"}</p>
                  </div>
                  {activeCompany.pix_key && (
                    <div>
                      <p className="text-xs text-gray-400">Chave PIX</p>
                      <p className="font-bold text-blue-600">{activeCompany.pix_key}</p>
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
                <h2 className="text-xl font-bold text-gray-900">Você ainda não tem uma empresa vinculada</h2>
                <p className="text-gray-500 mt-2">Para começar a usar o sistema, você pode cadastrar sua empresa abaixo ou ser vinculado pelo Administrador Master.</p>
              </div>
              
              <form onSubmit={handleCreateCompany} className="max-w-md mx-auto grid grid-cols-1 gap-4 text-left">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
                  <input name="name" required placeholder="Ex: Minha Empresa LTDA" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
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
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50 cursor-pointer"
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
                  Apenas o Administrador Master pode criar e vincular novas empresas. 
                  Por favor, solicite a vinculação ao seu administrador.
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
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
              />
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-4xl font-bold border-4 border-white shadow-lg overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  user.full_name?.charAt(0) || "U"
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110"
              >
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
          
          {isPrivileged && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-gray-900">Configurações de Segurança</h4>
                  <p className="text-gray-500 text-sm">Autenticação de dois fatores (MFA)</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <h5 className="font-bold text-gray-900 text-sm">Autenticação em Duas Etapas (2FA)</h5>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">Proteja sua conta exigindo um código adicional gerado no seu celular ao fazer login.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={user.mfa_enabled || false}
                    onChange={handleToggleMfa}
                    disabled={updateProfileMutation.isPending}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMfaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Ativar 2FA</h3>
                  <p className="text-xs text-gray-500">Configure o Google Authenticator</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowMfaModal(false); setMfaCodeInput(''); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 mb-6">
              <p className="text-sm text-center text-gray-600">
                1. Escaneie o QR Code abaixo com seu aplicativo de autenticação (ex: Google Authenticator).
              </p>
              <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=otpauth://totp/PowerControl:${user.email}?secret=JBSWY3DPEHPK3PXP&issuer=PowerControl`} 
                  alt="QR Code MFA" 
                  className="w-40 h-40 object-contain"
                />
              </div>
              <p className="text-xs text-gray-400 font-mono text-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                Chave secreta: JBSWY3DPEHPK3PXP
              </p>
            </div>

            <form onSubmit={handleConfirmMfa} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">2. Digite o código de 6 dígitos gerado</label>
                <input 
                  type="text"
                  value={mfaCodeInput}
                  onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-xl tracking-[0.5em]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowMfaModal(false); setMfaCodeInput(''); }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mfaCodeInput.length !== 6 || updateProfileMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  Confirmar e Ativar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReauthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Confirmação de Segurança</h3>
                  <p className="text-xs text-gray-500">Digite sua senha atual para alterar a senha</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReauthModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReauthenticate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha Atual</label>
                <input 
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReauthModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isReauthenticating || !currentPasswordInput}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isReauthenticating ? "Confirmando..." : "Confirmar e Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
