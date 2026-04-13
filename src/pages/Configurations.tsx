import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { calculateDiff } from "../lib/utils/diff";
import { useAuth } from "../lib/auth";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PermissionId } from "../lib/permissions";
import { 
  Settings, 
  Save, 
  Building2, 
  CreditCard, 
  Bell, 
  Shield, 
  Zap,
  Smartphone,
  Globe,
  Info,
  ShieldCheck,
  Check,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { InputMask } from "../components/ui/InputMask";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Configurations() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const companyId = api.getCompanyId() || user?.company_id;
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: 'warning'
  });

  const canManage = hasPermission('settings.manage');

  const { data: companyData, isLoading } = useQuery({ 
    queryKey: ["company", companyId], 
    enabled: !!companyId,
    queryFn: () => api.get("companies", companyId as string) 
  });
  const company = companyData || {};

  const [disableImages, setDisableImages] = useState(company.disable_product_images === "true" || company.disable_product_images === true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(company.allow_negative_stock === "true" || company.allow_negative_stock === true);

  useEffect(() => {
    setDisableImages(company.disable_product_images === "true" || company.disable_product_images === true);
  }, [company.disable_product_images]);

  useEffect(() => {
    setAllowNegativeStock(company.allow_negative_stock === "true" || company.allow_negative_stock === true);
  }, [company.allow_negative_stock]);

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

  const saveData = (data: any) => {
    if (!companyId) return;
    setIsSaving(true);
    api.put("companies", companyId, data).then(() => {
      api.log({
        action: 'UPDATE',
        entity: 'companies',
        entity_id: companyId,
        description: `Atualizou configurações da empresa`,
        metadata: data,
        changes: calculateDiff(company, data)
      });
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Configurações salvas com sucesso!");
    }).catch((error) => {
      console.error("Error saving company settings:", error);
      toast.error("Erro ao salvar configurações. Tente novamente.");
    }).finally(() => {
      setIsSaving(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleToggleNegativeStock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Alteração",
      message: `Deseja realmente ${newValue ? "habilitar" : "desabilitar"} o estoque negativo?`,
      variant: 'warning',
      onConfirm: () => {
        setAllowNegativeStock(newValue);
        saveData({ allow_negative_stock: newValue });
      }
    });
  };

  const handleToggleDisableImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setConfirmModal({
      isOpen: true,
      title: "Confirmar Alteração",
      message: `Deseja realmente ${newValue ? "desabilitar" : "habilitar"} as fotos de produtos?`,
      variant: 'warning',
      onConfirm: () => {
        setDisableImages(newValue);
        saveData({ disable_product_images: newValue });
      }
    });
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Handle role permissions specially
    if (activeTab === "permissions") {
      const rolePermissions = {
        user: [] as string[],
        admin: [] as string[]
      };

      ALL_PERMISSIONS.forEach(p => {
        if (formData.get(`perm_user_${p.id}`)) rolePermissions.user.push(p.id);
        if (formData.get(`perm_admin_${p.id}`)) rolePermissions.admin.push(p.id);
      });

      api.put("companies", companyId, { role_permissions: rolePermissions }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["company", companyId] });
        toast.success("Permissões atualizadas com sucesso!");
      });
      return;
    }
    
    if (activeTab === "general") {
      data.allow_negative_stock = allowNegativeStock;
      if (user?.role === 'master') {
        data.disable_product_images = disableImages;
      }
    }

    saveData(data);
  };

  const tabs = [
    { id: "general", name: "Geral", icon: Building2 },
    { id: "payments", name: "Pagamentos", icon: CreditCard },
    { id: "notifications", name: "Notificações", icon: Bell },
    { id: "fiscal", name: "Fiscal / API", icon: Zap },
    { id: "permissions", name: "Permissões", icon: ShieldCheck },
    { id: "security", name: "Segurança", icon: Shield },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Personalize o PowerControl para sua empresa.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "text-gray-600 hover:bg-white hover:text-blue-600"
              }`}
            >
              <tab.icon size={20} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Carregando configurações...</div>
          ) : (
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Informações da Empresa</h2>
                      <p className="text-sm text-gray-500">Dados cadastrais e identidade visual.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
                      <input name="name" defaultValue={company.name} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">CNPJ</label>
                      <InputMask 
                        name="document" 
                        mask="00.000.000/0000-00"
                        defaultValue={company.document}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">E-mail de Contato</label>
                      <input name="email" type="email" defaultValue={company.email} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Telefone</label>
                      <InputMask 
                        name="phone" 
                        mask="(00) 00000-0000"
                        defaultValue={company.phone}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Configurações de Produtos e Estoque</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-900">Permitir estoque negativo</p>
                          <p className="text-xs text-gray-500">Permitir a finalização de vendas mesmo sem estoque disponível.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="allow_negative_stock" 
                            checked={allowNegativeStock}
                            onChange={handleToggleNegativeStock}
                            className="sr-only peer" 
                            value="true"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {user?.role === 'master' && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-900">Desabilitar fotos de produtos</p>
                            <p className="text-xs text-gray-500">Ocultar a opção de upload de imagens no cadastro de produtos.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              name="disable_product_images" 
                              checked={disableImages}
                              onChange={handleToggleDisableImages}
                              className="sr-only peer" 
                              value="true"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Métodos de Pagamento</h2>
                      <p className="text-sm text-gray-500">Configure suas chaves PIX e taxas.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Zap size={20} className="text-blue-600" />
                          <span className="font-bold">PIX Dinâmico</span>
                        </div>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Chave PIX (CPF/CNPJ/E-mail/Telefone)</label>
                        <input name="pix_key" defaultValue={company.pix_key} placeholder="Sua chave PIX" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Notificações</h2>
                      <p className="text-sm text-gray-500">Alertas de estoque, vendas e financeiro.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: "notify_low_stock", name: "Alerta de Estoque Baixo", desc: "Notificar quando um produto atingir o estoque mínimo." },
                      { id: "notify_new_sale", name: "Nova Venda Realizada", desc: "Receber notificação a cada venda concluída." },
                      { id: "notify_overdue_account", name: "Contas Vencidas", desc: "Alertar sobre contas a pagar/receber vencidas." }
                    ].map(n => (
                      <div key={n.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                        <div>
                          <p className="font-bold text-gray-900">{n.name}</p>
                          <p className="text-xs text-gray-500">{n.desc}</p>
                        </div>
                        <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer">
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "fiscal" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Integração Fiscal</h2>
                      <p className="text-sm text-gray-500">Configure as chaves de API para emissão de notas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Provedor Fiscal</label>
                      <select name="fiscal_provider" defaultValue={company.fiscal_provider || "FocusNFe"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="FocusNFe">FocusNFe</option>
                        <option value="WebmaniaBR">WebmaniaBR (Em breve)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Ambiente</label>
                      <select name="fiscal_environment" defaultValue={company.fiscal_environment || "sandbox"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="sandbox">Homologação (Testes)</option>
                        <option value="production">Produção (Real)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-gray-700">Token de API (Secret Key)</label>
                      <input name="fiscal_token" type="password" defaultValue={company.fiscal_token} placeholder="Insira seu token de API" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-[10px] text-gray-400">Este token é usado para autenticar as requisições com o provedor fiscal.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={20} />
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-bold">Importante:</p>
                      <p>Para emitir notas reais, você também precisa configurar o Certificado Digital A1 na página de Gestão Fiscal.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Matriz de Permissões</h2>
                      <p className="text-sm text-gray-500">Defina o que cada nível de acesso pode realizar no sistema.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-4 px-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Permissão</th>
                          <th className="py-4 px-4 text-center text-sm font-bold text-gray-500 uppercase tracking-wider">Funcionário</th>
                          <th className="py-4 px-4 text-center text-sm font-bold text-gray-500 uppercase tracking-wider">Administrador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {Object.entries(
                          ALL_PERMISSIONS.reduce((acc, p) => {
                            if (!acc[p.category]) acc[p.category] = [];
                            acc[p.category].push(p);
                            return acc;
                          }, {} as Record<string, typeof ALL_PERMISSIONS[number][]>)
                        ).map(([category, permissions]) => (
                          <React.Fragment key={category}>
                            <tr className="bg-gray-50/50">
                              <td colSpan={3} className="py-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{category}</td>
                            </tr>
                            {permissions.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="py-4 px-4">
                                  <p className="font-bold text-gray-900">{p.name}</p>
                                  <p className="text-[10px] text-gray-500">{p.id}</p>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      name={`perm_user_${p.id}`}
                                      defaultChecked={company.role_permissions?.user?.includes(p.id) || DEFAULT_ROLE_PERMISSIONS.user.includes(p.id)}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                  </label>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      name={`perm_admin_${p.id}`}
                                      defaultChecked={company.role_permissions?.admin?.includes(p.id) || DEFAULT_ROLE_PERMISSIONS.admin.includes(p.id)}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                  </label>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex gap-3">
                    <ShieldCheck className="text-purple-600 shrink-0" size={20} />
                    <div className="text-xs text-purple-700 space-y-1">
                      <p className="font-bold">Dica de Segurança:</p>
                      <p>As permissões definidas aqui serão aplicadas a todos os usuários com o respectivo nível de acesso. Você pode sobrescrever permissões individuais na página de Funcionários.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-8 border-t border-gray-50">
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={isSaving}
        variant={confirmModal.variant || 'warning'}
      />
    </div>
  );
}
