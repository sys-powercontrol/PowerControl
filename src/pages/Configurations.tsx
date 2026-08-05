import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { calculateDiff } from "../lib/utils/diff";
import { fiscalApi } from "../services/fiscalApi";
import { useAuth } from "../lib/auth";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";
import { 
  Save, 
  Building2, 
  CreditCard, 
  Bell, 
  Shield, 
  Zap,
  Info,
  ShieldCheck,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Check,
  EyeOff,
  Send,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { InputMask } from "../components/ui/InputMask";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Configurations() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const companyId = api.getCompanyId() || user?.company_id;
  const [activeTab, setActiveTab] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return location.state?.tab || searchParams.get("tab") || "general";
  });
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
  const company = useMemo(() => companyData || {}, [companyData]);

  const [disableImages, setDisableImages] = useState(company.disable_product_images === "true" || company.disable_product_images === true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(company.allow_negative_stock === "true" || company.allow_negative_stock === true);

  const [notifyLowStock, setNotifyLowStock] = useState(company.notify_low_stock !== false && company.notify_low_stock !== "false");
  const [notifyNewSale, setNotifyNewSale] = useState(company.notify_new_sale !== false && company.notify_new_sale !== "false");
  const [notifyOverdue, setNotifyOverdue] = useState(company.notify_overdue_account !== false && company.notify_overdue_account !== "false");
  const [notifyCommission, setNotifyCommission] = useState(company.notify_commission !== false && company.notify_commission !== "false");

  useEffect(() => {
    setTimeout(() => setDisableImages(company.disable_product_images === "true" || company.disable_product_images === true), 0);
  }, [company.disable_product_images]);

  useEffect(() => {
    setTimeout(() => setAllowNegativeStock(company.allow_negative_stock === "true" || company.allow_negative_stock === true), 0);
  }, [company.allow_negative_stock]);

  useEffect(() => {
    setTimeout(() => {
      setNotifyLowStock(company.notify_low_stock !== false && company.notify_low_stock !== "false");
      setNotifyNewSale(company.notify_new_sale !== false && company.notify_new_sale !== "false");
      setNotifyOverdue(company.notify_overdue_account !== false && company.notify_overdue_account !== "false");
      setNotifyCommission(company.notify_commission !== false && company.notify_commission !== "false");
    }, 0);
  }, [company]);

  // State for Registering Notifications
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"info" | "warning" | "error" | "success">("info");
  const [notifLink, setNotifLink] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "read">("all");
  const [isRegisteringNotif, setIsRegisteringNotif] = useState(false);

  // Fetch all registered notifications for company
  const { data: registeredNotifications = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ["notifications", companyId],
    queryFn: async () => {
      const res = await api.get("notifications", { company_id: companyId });
      return Array.isArray(res) ? res : [];
    },
    enabled: !!companyId
  });

  const handleRegisterNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("Preencha o título e a mensagem da notificação.");
      return;
    }
    if (!companyId) return;

    try {
      setIsRegisteringNotif(true);
      await api.post("notifications", {
        company_id: companyId,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        link: notifLink.trim() || "/Configuracoes",
        status: "unread",
        read: false,
        created_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação registrada e enviada com sucesso!");
      setNotifTitle("");
      setNotifMessage("");
      setNotifType("info");
      setNotifLink("");
    } catch (err: any) {
      toast.error("Erro ao registrar notificação: " + err.message);
    } finally {
      setIsRegisteringNotif(false);
    }
  };

  const markNotifReadMutation = useMutation({
    mutationFn: (id: string) => api.put("notifications", id, { status: "read", read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação marcada como lida!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar notificação: " + err.message)
  });

  const markNotifUnreadMutation = useMutation({
    mutationFn: (id: string) => api.put("notifications", id, { status: "unread", read: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação marcada como não lida!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar notificação: " + err.message)
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => api.delete("notifications", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação apagada com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao apagar notificação: " + err.message)
  });

  const filteredNotificationsList = useMemo(() => {
    let list = registeredNotifications;
    if (notifFilter === "unread") {
      list = list.filter((n: any) => n.status === "unread" || n.read === false);
    } else if (notifFilter === "read") {
      list = list.filter((n: any) => n.status === "read" || n.read === true);
    }
    return list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [registeredNotifications, notifFilter]);

  const handleSendTestNotification = async () => {
    try {
      await api.post("notifications", {
        company_id: companyId,
        title: "Notificação de Teste",
        message: "O sistema de notificações do ERP está ativo e operacional!",
        type: "info",
        link: "/Configuracoes",
        read: false,
        status: "unread",
        created_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação de teste enviada com sucesso! Verifique o sininho no topo.");
    } catch {
      toast.error("Erro ao enviar notificação de teste.");
    }
  };

  

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = Object.fromEntries(formData.entries());

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
        api.log({
          action: 'UPDATE',
          entity: 'companies',
          entity_id: companyId,
          description: `Atualizou matriz de permissões`,
          metadata: { role_permissions: rolePermissions },
          changes: calculateDiff({ role_permissions: company.role_permissions }, { role_permissions: rolePermissions })
        });
        queryClient.invalidateQueries({ queryKey: ["company", companyId] });
        queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
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

    if (activeTab === "notifications") {
      data.notify_low_stock = notifyLowStock;
      data.notify_new_sale = notifyNewSale;
      data.notify_overdue_account = notifyOverdue;
      data.notify_commission = notifyCommission;
    }

    if (activeTab === "fiscal") {
      try {
        setIsSaving(true);
        await fiscalApi.ping({
          provider: data.fiscal_provider as "FocusNFe" | "WebmaniaBR",
          environment: data.fiscal_environment as "sandbox" | "production",
          token: data.fiscal_token as string
        });
      } catch (err: any) {
        toast.error(`Falha na validação do provedor fiscal: ${err.message}`);
        setIsSaving(false);
        return;
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Personalize o PowerControl para sua empresa.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="grid grid-cols-2 lg:flex lg:flex-col lg:w-64 lg:shrink-0 gap-2 sm:gap-2.5 lg:gap-1 w-full max-w-full overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full min-w-0 flex items-center justify-start gap-2 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-left whitespace-normal break-words overflow-hidden ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "text-gray-600 hover:bg-white hover:text-blue-600 bg-gray-50/90 lg:bg-transparent border border-gray-100 lg:border-transparent"
              }`}
            >
              <tab.icon size={18} className="shrink-0" />
              <span className="leading-tight whitespace-normal break-words min-w-0 text-left">{tab.name}</span>
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
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 bg-gradient-to-br from-orange-50 to-amber-100 text-orange-600 rounded-2xl shadow-sm border border-orange-100">
                        <Bell size={26} className="text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900">Central de Notificações</h2>
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full uppercase tracking-wider">Ativo</span>
                        </div>
                        <p className="text-sm text-gray-500">Cadastre avisos manuais, gerencie alertas e configure as preferências do sistema.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
                      title="Enviar uma notificação de teste para verificar a Central de Alertas"
                    >
                      <Bell size={16} className="animate-pulse" />
                      Enviar Notificação de Teste
                    </button>
                  </div>

                  {/* 1. Área de Registro de Notificações */}
                  <div className="bg-gradient-to-br from-orange-50/40 via-white to-amber-50/20 rounded-3xl p-6 border border-orange-100/80 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-orange-100/60">
                      <div className="p-2 bg-orange-500 text-white rounded-xl shadow-sm shadow-orange-200">
                        <Plus size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Registrar Nova Notificação</h3>
                        <p className="text-xs text-gray-500">Cadastre um comunicado ou aviso manual para os usuários da empresa.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-bold text-gray-700">Título da Notificação *</label>
                        <input
                          type="text"
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          placeholder="Ex: Balanço Anual de Estoque"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Tipo de Alerta</label>
                        <select
                          value={notifType}
                          onChange={(e: any) => setNotifType(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="info">Informação (Azul)</option>
                          <option value="warning">Alerta / Atenção (Amarelo)</option>
                          <option value="error">Urgente / Erro (Vermelho)</option>
                          <option value="success">Sucesso (Verde)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Link de Destino (Opcional)</label>
                        <input
                          type="text"
                          value={notifLink}
                          onChange={(e) => setNotifLink(e.target.value)}
                          placeholder="Ex: /Produtos ou /Vendas"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-bold text-gray-700">Mensagem da Notificação *</label>
                        <textarea
                          rows={2}
                          value={notifMessage}
                          onChange={(e) => setNotifMessage(e.target.value)}
                          placeholder="Digite o conteúdo detalhado que será exibido aos usuários..."
                          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleRegisterNotificationSubmit}
                        disabled={isRegisteringNotif}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isRegisteringNotif ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {isRegisteringNotif ? "Registrando..." : "Cadastrar e Enviar Notificação"}
                      </button>
                    </div>
                  </div>

                  {/* 2. Área de Gestão de Notificações Registradas */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <Tag size={18} className="text-orange-500" />
                          Notificações Registradas no Sistema
                        </h3>
                        <p className="text-xs text-gray-500">Histórico de mensagens cadastradas com opções de leitura e exclusão.</p>
                      </div>

                      {/* Filtros */}
                      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setNotifFilter("all")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            notifFilter === "all" ? "bg-white text-gray-900 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Todas ({registeredNotifications.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifFilter("unread")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            notifFilter === "unread" ? "bg-white text-orange-600 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Não Lidas ({registeredNotifications.filter((n: any) => n.status === "unread" || n.read === false).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifFilter("read")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            notifFilter === "read" ? "bg-white text-gray-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          Lidas ({registeredNotifications.filter((n: any) => n.status === "read" || n.read === true).length})
                        </button>
                      </div>
                    </div>

                    {isLoadingNotifications ? (
                      <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin text-orange-500" />
                        Carregando notificações registradas...
                      </div>
                    ) : filteredNotificationsList.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-2">
                        <Bell size={28} className="mx-auto text-gray-300" />
                        <p className="text-xs text-gray-500">Nenhuma notificação encontrada com o filtro selecionado.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        {filteredNotificationsList.map((notif: any) => {
                          const isRead = notif.status === "read" || notif.read === true;
                          const badgeColor = 
                            notif.type === "warning" ? "bg-amber-100 text-amber-800 border-amber-200" :
                            notif.type === "error" ? "bg-red-100 text-red-800 border-red-200" :
                            notif.type === "success" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            "bg-blue-100 text-blue-800 border-blue-200";

                          return (
                            <div
                              key={notif.id}
                              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                isRead ? "bg-gray-50/40" : "bg-orange-50/20"
                              }`}
                            >
                              <div className="flex gap-3.5 items-start">
                                <div className="mt-0.5 shrink-0">
                                  {notif.type === "warning" && <AlertTriangle size={20} className="text-amber-500" />}
                                  {notif.type === "error" && <XCircle size={20} className="text-red-500" />}
                                  {notif.type === "success" && <CheckCircle2 size={20} className="text-emerald-500" />}
                                  {(!notif.type || notif.type === "info") && <Info size={20} className="text-blue-500" />}
                                </div>
                                <div className="space-y-1 max-w-xl">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-gray-900 text-sm">{notif.title}</h4>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeColor}`}>
                                      {notif.type?.toUpperCase() || "INFO"}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                      isRead ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"
                                    }`}>
                                      {isRead ? "Lida" : "Não Lida"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                                  {notif.created_at && (
                                    <p className="text-[10px] text-gray-400">
                                      {new Date(notif.created_at).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* AÇÕES INDIVIDUAIS OBRIGATÓRIAS */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto justify-end">
                                {isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => markNotifUnreadMutation.mutate(notif.id)}
                                    disabled={markNotifUnreadMutation.isPending}
                                    className="px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all flex items-center gap-1.5 border border-orange-200 cursor-pointer"
                                    title="Marcar esta notificação como não lida"
                                  >
                                    <EyeOff size={14} />
                                    Marcar Não Lida
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => markNotifReadMutation.mutate(notif.id)}
                                    disabled={markNotifReadMutation.isPending}
                                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                                    title="Marcar esta notificação como lida"
                                  >
                                    <Check size={14} />
                                    Marcar como Lida
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => deleteNotifMutation.mutate(notif.id)}
                                  disabled={deleteNotifMutation.isPending}
                                  className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex items-center gap-1.5 border border-red-200 cursor-pointer"
                                  title="Apagar esta notificação permanentemente"
                                >
                                  <Trash2 size={14} />
                                  Apagar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Preferências de Alertas Automáticos */}
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <h3 className="font-bold text-gray-900 text-sm">Alertas Automáticos do ERP</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { 
                          id: "notify_low_stock", 
                          name: "Alerta de Estoque Baixo", 
                          desc: "Notificar automaticamente no menu superior quando produtos atingirem ou ficarem abaixo do estoque mínimo.",
                          checked: notifyLowStock,
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNotifyLowStock(e.target.checked)
                        },
                        { 
                          id: "notify_new_sale", 
                          name: "Nova Venda Concluída", 
                          desc: "Registrar notificação a cada venda realizada com sucesso no caixa/PDV.",
                          checked: notifyNewSale,
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNotifyNewSale(e.target.checked)
                        },
                        { 
                          id: "notify_overdue_account", 
                          name: "Contas Vencidas e Vencendo Hoje", 
                          desc: "Alertar sobre contas a pagar e a receber com vencimento no dia ou em atraso.",
                          checked: notifyOverdue,
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNotifyOverdue(e.target.checked)
                        },
                        { 
                          id: "notify_commission", 
                          name: "Pagamento de Comissões", 
                          desc: "Notificar quando houver fechamento ou pagamento de comissões de vendedores.",
                          checked: notifyCommission,
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNotifyCommission(e.target.checked)
                        }
                      ].map(n => (
                        <label key={n.id} className="flex items-center justify-between p-4.5 bg-gray-50/70 hover:bg-orange-50/30 hover:border-orange-200/80 rounded-2xl transition-all cursor-pointer border border-gray-100 group shadow-sm">
                          <div className="pr-4 space-y-0.5">
                            <p className="font-bold text-gray-900 group-hover:text-orange-950 transition-colors">{n.name}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{n.desc}</p>
                          </div>
                          <div className="relative shrink-0">
                            <input
                              type="checkbox"
                              checked={n.checked}
                              onChange={n.onChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                          </div>
                        </label>
                      ))}
                    </div>
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
                        <option value="WebmaniaBR">WebmaniaBR</option>
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
