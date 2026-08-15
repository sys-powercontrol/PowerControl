import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Crown, 
  Users, 
  Building2, 
  ShieldCheck, 
  Zap,
  Search,
  Edit2,
  Plus,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Upload,
  QrCode,
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  BarChart3,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Power,
  Trash2,
  UserCheck,
  UserX,
  LayoutTemplate,
  Globe,
  Link2,
  Eye,
  Sparkles
} from "lucide-react";
import { DEFAULT_FOOTER_CONFIG, FooterConfig, FooterLink } from "../types/footer";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { AuditLog } from "../types";
import { subDays } from "date-fns";
import { InputMask } from "../components/ui/InputMask";
import { externalApi } from "../services/externalApi";
import ConfirmationModal from "../components/ConfirmationModal";

export default function AdminMaster() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Visão Geral");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [fetchedData, setFetchedData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  

  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: () => api.get("users", { _all: true }) });
  const { data: companies = [] } = useQuery({ queryKey: ["companies", "all"], queryFn: () => api.get("companies", { _all: true }) });
  const { data: sales = [] } = useQuery({ queryKey: ["sales", "all"], queryFn: () => api.get("sales", { _all: true }) });
  const { data: auditLogs = [] } = useQuery({ 
    queryKey: ["audit_logs", "all"], 
    queryFn: () => api.get("audit_logs", { _all: true }),
    enabled: activeTab === "Auditoria"
  });
  const { data: supportTickets = [] } = useQuery({ 
    queryKey: ["support_tickets", "all"], 
    queryFn: () => api.get("support_tickets", { _all: true }),
    enabled: activeTab === "Suporte"
  });

  const ticketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return api.put("support_tickets", id, { ...data, updated_at: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Ticket atualizado!");
    }
  });

  const { data: apiConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["api_configurations", "global"],
    queryFn: async () => {
      try {
        const docRef = doc(db, "api_configurations", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data();
        }
      } catch (err) {
        console.error("Error loading global api configs:", err);
      }
      return {
        sefaz_production: "",
        sefaz_homologation: "",
        payment_token: "",
        google_maps_key: ""
      };
    },
    enabled: activeTab === "APIs"
  });

  const saveApiConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const docRef = doc(db, "api_configurations", "global");
      await setDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString()
      }, { merge: true });

      await api.log({
        action: 'UPDATE',
        entity: 'api_configurations',
        entity_id: 'global',
        description: `Atualizou as configurações globais de API`,
        metadata: { ...data, payment_token: '***', google_maps_key: '***' }
      });
    },
    onSuccess: () => {
      refetchConfig();
      toast.success("Configurações de APIs salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar configurações: ${err.message}`);
    }
  });

  const handleApiConfigSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const configData = {
      sefaz_production: data.sefaz_production || "",
      sefaz_homologation: data.sefaz_homologation || "",
      payment_token: data.payment_token || "",
      google_maps_key: data.google_maps_key || ""
    };

    saveApiConfigMutation.mutate(configData);
  };

  const { data: footerConfigData, refetch: refetchFooterConfig } = useQuery({
    queryKey: ["system_settings", "footer"],
    queryFn: async () => {
      try {
        const docRef = doc(db, "system_settings", "footer");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...DEFAULT_FOOTER_CONFIG, ...docSnap.data() } as FooterConfig;
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de rodapé:", err);
      }
      return DEFAULT_FOOTER_CONFIG;
    },
    enabled: activeTab === "Rodapé"
  });

  const [footerFormState, setFooterFormState] = useState<FooterConfig | null>(null);

  const footerForm = footerFormState ?? footerConfigData ?? DEFAULT_FOOTER_CONFIG;

  const setFooterForm = (updater: FooterConfig | ((prev: FooterConfig) => FooterConfig)) => {
    setFooterFormState(prev => {
      const current = prev ?? footerConfigData ?? DEFAULT_FOOTER_CONFIG;
      return typeof updater === 'function' ? updater(current) : updater;
    });
  };

  const saveFooterConfigMutation = useMutation({
    mutationFn: async (data: FooterConfig) => {
      const docRef = doc(db, "system_settings", "footer");
      await setDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString()
      }, { merge: true });

      await api.log({
        action: 'UPDATE',
        entity: 'system_settings',
        entity_id: 'footer',
        description: `Atualizou as configurações do rodapé do sistema`,
        metadata: data as any
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings", "footer"] });
      refetchFooterConfig();
      toast.success("Configurações do rodapé salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar configurações do rodapé: ${err.message}`);
    }
  });

  const handleFooterConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveFooterConfigMutation.mutate(footerForm);
  };

  const handleAddFooterLink = () => {
    const newLink: FooterLink = {
      id: Date.now().toString(),
      label: "Novo Link",
      url: "/",
      isExternal: false
    };
    setFooterForm(prev => ({
      ...prev,
      links: [...(prev.links || []), newLink]
    }));
  };

  const handleUpdateFooterLink = (id: string, key: keyof FooterLink, value: any) => {
    setFooterForm(prev => ({
      ...prev,
      links: (prev.links || []).map(link => link.id === id ? { ...link, [key]: value } : link)
    }));
  };

  const handleRemoveFooterLink = (id: string) => {
    setFooterForm(prev => ({
      ...prev,
      links: (prev.links || []).filter(link => link.id !== id)
    }));
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

  const filteredUsers = users.filter((u: any) => {
    const search = searchTerm.toLowerCase();
    const name = (u.full_name || u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const filteredCompanies = companies.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAuditLogs = auditLogs
    .filter((log: AuditLog) => {
      const matchesSearch = 
        log.user_name?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        log.entity?.toLowerCase().includes(auditSearchTerm.toLowerCase());
      
      const matchesAction = !auditFilterAction || log.action === auditFilterAction;
      
      return matchesSearch && matchesAction;
    })
    .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

  const totalRevenue = sales.reduce((acc: number, s: any) => acc + (s.total || 0), 0);

  const revenueByDay = React.useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(getNowBR(), i);
      return formatBR(d, 'yyyy-MM-dd');
    }).reverse();

    const data = last30Days.map(date => ({
      date: formatBR(date, 'dd/MM'),
      total: 0
    }));

    sales.forEach((s: any) => {
      const saleDate = s.sale_date ? formatBR(s.sale_date, 'yyyy-MM-dd') : null;
      const index = last30Days.indexOf(saleDate);
      if (index !== -1) {
        data[index].total += s.total || 0;
      }
    });

    return data;
  }, [sales]);

  const revenueByCompany = React.useMemo(() => {
    const companyRevenue: Record<string, number> = {};
    sales.forEach((s: any) => {
      if (s.company_id) {
        companyRevenue[s.company_id] = (companyRevenue[s.company_id] || 0) + (s.total || 0);
      }
    });

    return Object.entries(companyRevenue)
      .map(([id, total]) => ({
        name: companies.find((c: any) => c.id === id)?.name || "Desconhecida",
        value: total
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales, companies]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  const topCompanies = revenueByCompany.slice(0, 5);

  const userMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = editingUser 
        ? await api.put("users", editingUser.id, data) 
        : await api.post("users", data);
      
      await api.log({
        action: editingUser ? 'UPDATE' : 'CREATE',
        entity: 'users',
        entity_id: String(result.id),
        description: `${editingUser ? 'Atualizou' : 'Criou'} usuário ${data.full_name}`,
        metadata: { ...data, password: '***' }
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
      setIsUserModalOpen(false);
      setEditingUser(null);
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, is_active, full_name }: { userId: string; is_active: boolean; full_name: string }) => {
      const result = await api.put("users", userId, { is_active });
      await api.log({
        action: 'UPDATE',
        entity: 'users',
        entity_id: String(userId),
        description: `${is_active ? 'Ativou/Aprovou' : 'Desativou'} usuário ${full_name}`,
        metadata: { userId, is_active }
      });
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success(variables.is_active ? "Usuário aprovado e liberado com sucesso!" : "Usuário desativado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao alterar o status do usuário.");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUser: any) => {
      await api.delete("users", targetUser.id);
      await api.log({
        action: 'DELETE',
        entity: 'users',
        entity_id: String(targetUser.id),
        description: `Excluiu permanentemente o usuário ${targetUser.full_name || targetUser.email}`,
        metadata: { userId: targetUser.id, email: targetUser.email }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Usuário excluído permanentemente com sucesso!");
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir usuário.");
    }
  });

  const companyMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = editingCompany 
        ? await api.put("companies", editingCompany.id, data) 
        : await api.post("companies", data);
      
      await api.log({
        action: editingCompany ? 'UPDATE' : 'CREATE',
        entity: 'companies',
        entity_id: String(result.id),
        description: `${editingCompany ? 'Atualizou' : 'Criou'} empresa ${data.name}`,
        metadata: data
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success(editingCompany ? "Empresa atualizada!" : "Empresa criada!");
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
    },
  });

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const userData: any = {
      ...data,
      company_id: data.company_id || null,
      is_active: data.is_active === "on"
    };

    if (!userData.password) {
      delete userData.password;
    }

    userMutation.mutate(userData);
  };

  const handleCompanySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const companyData = {
      ...data,
      is_active: data.is_active === "on",
      logo_url: logoBase64
    };

    companyMutation.mutate(companyData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error("O logo deve ter menos de 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

if (currentUser?.role !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Crown size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é exclusiva para o Administrador Master do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
          <Crown size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Admin Master</h1>
          <p className="text-gray-500">Controle total do ecossistema PowerControl.</p>
        </div>
        <div className="ml-auto">
          <Link 
            to="/DashboardGlobal"
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors"
          >
            <BarChart3 size={20} />
            Ver Dashboard Global
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {["Visão Geral", "Usuários", "Empresas", "Suporte", "Auditoria", "APIs", "Rodapé"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Visão Geral" && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Users size={24} />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight size={14} />
                  <span>+12%</span>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Usuários</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Building2 size={24} />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight size={14} />
                  <span>+5%</span>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Empresas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{companies.length}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <ArrowUpRight size={14} />
                  <span>+24%</span>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Vendas Globais</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                  <span>Estável</span>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Admins Master</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{users.filter((u: any) => u.role === 'master').length}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Faturamento Global</h3>
                  <p className="text-sm text-gray-500">Evolução das vendas nos últimos 30 dias</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-xl">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(value) => `${formatCurrency(value)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Distribuição por Empresa</h3>
                  <p className="text-sm text-gray-500">Participação no faturamento total</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-xl">
                  <Building2 size={20} className="text-purple-600" />
                </div>
              </div>
              <div className="h-[300px] w-full min-w-0 flex items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByCompany}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueByCompany.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 space-y-3">
                  {revenueByCompany.slice(0, 4).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium text-gray-600 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {((item.value / totalRevenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Top 5 Empresas</h3>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Ver Todas</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="px-8 py-4 font-bold">Empresa</th>
                      <th className="px-8 py-4 font-bold">Faturamento</th>
                      <th className="px-8 py-4 font-bold">Crescimento</th>
                      <th className="px-8 py-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topCompanies.map((c) => (
                      <tr key={c.name} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600">
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 font-bold text-gray-900">{formatCurrency(c.value)}</td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                            <ArrowUpRight size={14} />
                            <span>{5 + (c.name.charCodeAt(0) % 20 || 0)}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <ArrowUpRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-600 rounded-3xl p-8 text-white space-y-6 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Suporte Master</h3>
                <p className="text-blue-100 text-sm mb-8">Precisa de ajuda com a gestão global do ecossistema?</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 uppercase font-bold">E-mail Direto</p>
                      <p className="font-bold">suporte@powercontrol.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 uppercase font-bold">WhatsApp VIP</p>
                      <p className="font-bold">+55 (11) 99999-9999</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-8 py-4 bg-white text-blue-600 rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-50 transition-colors">
                  Abrir Chamado Prioritário
                </button>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Usuários" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar usuários..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Novo Usuário
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {u.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.full_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {companies.find((c: any) => c.id === u.company_id)?.name || "Nenhuma"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === "master" ? "bg-red-100 text-red-700" : 
                          u.role === "admin" ? "bg-purple-100 text-purple-700" : 
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {u.role === 'master' ? 'Master' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 inline-flex items-center gap-1">
                          <UserCheck size={12} /> Ativo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                          <UserX size={12} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!u.is_active && (
                          <button 
                            onClick={() => toggleUserStatusMutation.mutate({ userId: u.id, is_active: true, full_name: u.full_name })}
                            disabled={toggleUserStatusMutation.isPending}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                            title="Aprovar e Liberar Acesso"
                          >
                            <CheckCircle2 size={14} />
                            Aprovar
                          </button>
                        )}
                        <button 
                          onClick={() => toggleUserStatusMutation.mutate({ userId: u.id, is_active: !u.is_active, full_name: u.full_name })}
                          disabled={toggleUserStatusMutation.isPending || u.id === currentUser?.id}
                          className={`p-2 rounded-xl transition-colors ${
                            u.is_active 
                              ? "text-amber-600 hover:bg-amber-50" 
                              : "text-green-600 hover:bg-green-50"
                          }`}
                          title={u.is_active ? "Desativar Usuário" : "Ativar Usuário"}
                        >
                          <Power size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Editar Usuário"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => { setUserToDelete(u); setIsDeleteUserModalOpen(true); }}
                          disabled={u.id === currentUser?.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={u.id === currentUser?.id ? "Você não pode excluir sua própria conta aqui" : "Excluir Usuário"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Empresas" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar empresas..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => { 
                setEditingCompany(null); 
                setLogoBase64(null); 
                setFetchedData({});
                setIsCompanyModalOpen(true); 
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nova Empresa
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">CNPJ</th>
                  <th className="px-6 py-4 font-medium">Cidade/UF</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCompanies.map((c: any) => (
                  <tr key={c.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Building2 size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {c.cnpj}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {c.city}/{c.state}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { 
                          setEditingCompany(c); 
                          setLogoBase64(c.logo_url || null); 
                          setFetchedData({});
                          setIsCompanyModalOpen(true); 
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Suporte" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4 font-medium">Ticket</th>
                  <th className="px-6 py-4 font-medium">Usuário / Empresa</th>
                  <th className="px-6 py-4 font-medium">Assunto</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {supportTickets.map((ticket: any) => (
                  <tr key={ticket.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      #{ticket.id.substr(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{ticket.user_name}</p>
                      <p className="text-xs text-gray-500">{companies.find((c: any) => c.id === ticket.company_id)?.name || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-700">{ticket.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={ticket.status}
                        onChange={(e) => ticketMutation.mutate({ id: ticket.id, data: { status: e.target.value } })}
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase outline-none ${
                          ticket.status === "OPEN" ? "bg-blue-100 text-blue-700" :
                          ticket.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                          "bg-green-100 text-green-700"
                        }`}
                      >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em Atendimento</option>
                        <option value="CLOSED">Concluído</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          const note = prompt("Notas internas / Resposta:", ticket.internal_notes || "");
                          if (note !== null) {
                            ticketMutation.mutate({ id: ticket.id, data: { internal_notes: note } });
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Adicionar nota/resposta"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {supportTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhum ticket encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Auditoria" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative max-w-md flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar nos logs..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
              >
                <option value="">Todas as Ações</option>
                <option value="CREATE">Criação</option>
                <option value="UPDATE">Edição</option>
                <option value="DELETE">Exclusão</option>
                <option value="LOGIN">Login</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="px-6 py-4 font-medium">Data/Hora</th>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">Ação</th>
                  <th className="px-6 py-4 font-medium">Entidade</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAuditLogs.map((log: any) => (
                  <tr key={log.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600">
                          {log.user_name?.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {companies.find((c: any) => c.id === log.company_id)?.name || "Global"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.action === "CREATE" ? "bg-green-100 text-green-700" : 
                        log.action === "UPDATE" ? "bg-blue-100 text-blue-700" : 
                        log.action === "DELETE" ? "bg-red-100 text-red-700" : 
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {log.entity}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {log.description}
                    </td>
                  </tr>
                ))}
                {filteredAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "APIs" && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Configurações Globais de API</h2>
                <p className="text-sm text-gray-500">Configure as chaves e endpoints para todo o sistema.</p>
              </div>
            </div>

            <form onSubmit={handleApiConfigSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">SEFAZ Endpoint (Produção)</label>
                  <input 
                    type="text" 
                    name="sefaz_production"
                    defaultValue={apiConfig?.sefaz_production || ""} 
                    placeholder="https://nfe.sefaz.gov.br/..." 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">SEFAZ Endpoint (Homologação)</label>
                  <input 
                    type="text" 
                    name="sefaz_homologation"
                    defaultValue={apiConfig?.sefaz_homologation || ""} 
                    placeholder="https://hom.nfe.sefaz.gov.br/..." 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Token Gateway Pagamento</label>
                  <input 
                    type="password" 
                    name="payment_token"
                    defaultValue={apiConfig?.payment_token || ""} 
                    placeholder="••••••••••••••••" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">API Key Google Maps</label>
                  <input 
                    type="password" 
                    name="google_maps_key"
                    defaultValue={apiConfig?.google_maps_key || ""} 
                    placeholder="••••••••••••••••" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-6 border-t border-gray-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saveApiConfigMutation.isPending}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                  {saveApiConfigMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Todas as Configurações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "Rodapé" && (
        <div className="space-y-8">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <LayoutTemplate size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Configurações do Rodapé do Sistema</h2>
                  <p className="text-sm text-gray-500">
                    Gerencie informações, contatos, redes sociais, avisos e links exibidos no rodapé de todas as páginas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFooterConfigSubmit}
                disabled={saveFooterConfigMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 text-sm"
              >
                {saveFooterConfigMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Rodapé
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleFooterConfigSubmit} className="space-y-8">
              {/* Informações Gerais */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" />
                  Informações da Marca & Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nome do Sistema / Marca</label>
                    <input
                      type="text"
                      value={footerForm.system_name || ""}
                      onChange={e => setFooterForm({ ...footerForm, system_name: e.target.value })}
                      placeholder="Ex: PowerControl ERP"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Versão do Sistema</label>
                    <input
                      type="text"
                      value={footerForm.system_version || ""}
                      onChange={e => setFooterForm({ ...footerForm, system_version: e.target.value })}
                      placeholder="Ex: v2.5.0"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Subtítulo / Descrição Curta (Tagline)</label>
                    <input
                      type="text"
                      value={footerForm.tagline || ""}
                      onChange={e => setFooterForm({ ...footerForm, tagline: e.target.value })}
                      placeholder="Ex: Plataforma integrada de gestão empresarial e controle financeiro."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Texto de Copyright</label>
                    <input
                      type="text"
                      value={footerForm.copyright_text || ""}
                      onChange={e => setFooterForm({ ...footerForm, copyright_text: e.target.value })}
                      placeholder="Ex: © 2026 PowerControl - Todos os direitos reservados."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Status do Sistema & Banner */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Status Operacional & Banner de Aviso
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 md:col-span-3">
                    <input
                      type="checkbox"
                      id="status_badge_enabled"
                      checked={footerForm.status_badge_enabled}
                      onChange={e => setFooterForm({ ...footerForm, status_badge_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="status_badge_enabled" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
                      Exibir Indicador de Status do Sistema no Rodapé
                    </label>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Texto do Status</label>
                    <input
                      type="text"
                      value={footerForm.status_text || ""}
                      onChange={e => setFooterForm({ ...footerForm, status_text: e.target.value })}
                      placeholder="Ex: Sistemas 100% Operacionais"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Cor / Nível</label>
                    <select
                      value={footerForm.status_color || "green"}
                      onChange={e => setFooterForm({ ...footerForm, status_color: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-bold"
                    >
                      <option value="green">🟢 Verde (Operacional)</option>
                      <option value="yellow">🟡 Amarelo (Atenção / Manutenção)</option>
                      <option value="red">🔴 Vermelho (Instabilidade)</option>
                      <option value="blue">🔵 Azul (Informativo)</option>
                    </select>
                  </div>
                </div>

                {/* Banner de Aviso */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="announcement_enabled"
                      checked={footerForm.announcement_enabled}
                      onChange={e => setFooterForm({ ...footerForm, announcement_enabled: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="announcement_enabled" className="text-sm font-bold text-amber-900 cursor-pointer select-none flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-600" />
                      Exibir Banner de Aviso Especial no Rodapé
                    </label>
                  </div>

                  {footerForm.announcement_enabled && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">Mensagem do Aviso</label>
                      <input
                        type="text"
                        value={footerForm.announcement_text || ""}
                        onChange={e => setFooterForm({ ...footerForm, announcement_text: e.target.value })}
                        placeholder="Ex: Manutenção programada para o próximo domingo das 02h às 04h."
                        className="w-full px-4 py-2 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Contatos & Atendimento */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Mail size={18} className="text-blue-600" />
                  Contatos de Suporte & Atendimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">E-mail de Suporte</label>
                    <input
                      type="email"
                      value={footerForm.support_email || ""}
                      onChange={e => setFooterForm({ ...footerForm, support_email: e.target.value })}
                      placeholder="suporte@sistema.com.br"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Telefone / Whats</label>
                    <input
                      type="text"
                      value={footerForm.support_phone || ""}
                      onChange={e => setFooterForm({ ...footerForm, support_phone: e.target.value })}
                      placeholder="(11) 99999-8888"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Horário de Atendimento</label>
                    <input
                      type="text"
                      value={footerForm.support_hours || ""}
                      onChange={e => setFooterForm({ ...footerForm, support_hours: e.target.value })}
                      placeholder="Seg a Sex: 08h às 18h"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Redes Sociais / Canais */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Globe size={18} className="text-blue-600" />
                  Canais Oficiais & Redes Sociais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">WhatsApp (número com DDD)</label>
                    <input
                      type="text"
                      value={footerForm.whatsapp_number || ""}
                      onChange={e => setFooterForm({ ...footerForm, whatsapp_number: e.target.value })}
                      placeholder="5511999998888"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Website Oficial</label>
                    <input
                      type="url"
                      value={footerForm.website_url || ""}
                      onChange={e => setFooterForm({ ...footerForm, website_url: e.target.value })}
                      placeholder="https://empresa.com.br"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Instagram (@usuario)</label>
                    <input
                      type="text"
                      value={footerForm.instagram_handle || ""}
                      onChange={e => setFooterForm({ ...footerForm, instagram_handle: e.target.value })}
                      placeholder="@empresa.oficial"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">LinkedIn URL</label>
                    <input
                      type="url"
                      value={footerForm.linkedin_url || ""}
                      onChange={e => setFooterForm({ ...footerForm, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Gerenciador de Links do Rodapé */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Link2 size={18} className="text-blue-600" />
                    Links Rápidos Personalizáveis
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddFooterLink}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                    Adicionar Link
                  </button>
                </div>

                <div className="space-y-3">
                  {(footerForm.links || []).map((link, idx) => (
                    <div key={link.id || idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Rótulo / Título</label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={e => handleUpdateFooterLink(link.id, "label", e.target.value)}
                          placeholder="Ex: Termos de Uso"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">URL ou Rota Interna</label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={e => handleUpdateFooterLink(link.id, "url", e.target.value)}
                          placeholder="Ex: /BaseConhecimento ou https://..."
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:self-end sm:pb-1">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!link.isExternal}
                            onChange={e => handleUpdateFooterLink(link.id, "isExternal", e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span>Nova Aba</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveFooterLink(link.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-2"
                          title="Remover Link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!footerForm.links || footerForm.links.length === 0) && (
                    <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      Nenhum link adicionado ao rodapé. Clique em "Adicionar Link" acima.
                    </p>
                  )}
                </div>
              </div>

              {/* Toggles de Exibição */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Eye size={18} className="text-blue-600" />
                  Visibilidade das Seções do Rodapé
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <label className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={footerForm.show_version}
                      onChange={e => setFooterForm({ ...footerForm, show_version: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-700">Versão</span>
                  </label>

                  <label className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={footerForm.show_contacts}
                      onChange={e => setFooterForm({ ...footerForm, show_contacts: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-700">Contatos</span>
                  </label>

                  <label className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={footerForm.show_links}
                      onChange={e => setFooterForm({ ...footerForm, show_links: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-700">Links Úteis</span>
                  </label>

                  <label className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={footerForm.show_social}
                      onChange={e => setFooterForm({ ...footerForm, show_social: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-700">Redes Sociais</span>
                  </label>

                  <label className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={footerForm.show_status}
                      onChange={e => setFooterForm({ ...footerForm, show_status: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-700">Badge Status</span>
                  </label>
                </div>
              </div>

              {/* Botão de envio inferior */}
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saveFooterConfigMutation.isPending}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {saveFooterConfigMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Todas as Configurações do Rodapé
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingUser ? "Editar Usuário" : "Novo Usuário"}</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                  <input name="full_name" defaultValue={editingUser?.full_name} required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">E-mail</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Senha {editingUser && "(deixe em branco para não alterar)"}</label>
                  <input name="password" type="password" required={!editingUser} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Telefone</label>
                    <InputMask 
                      name="phone" 
                      mask="(00) 00000-0000"
                      defaultValue={editingUser?.phone}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">CPF</label>
                    <InputMask 
                      name="cpf" 
                      mask="000.000.000-00"
                      defaultValue={editingUser?.cpf}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Empresa</label>
                  <select name="company_id" defaultValue={editingUser?.company_id} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Nenhuma</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Role</label>
                  <select name="role" defaultValue={editingUser?.role || "user"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador de Empresa</option>
                    <option value="master">Administrador Master</option>
                  </select>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_active" defaultChecked={editingUser?.is_active ?? true} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-bold text-gray-700">Ativo</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm">Cancelar</button>
                <button type="submit" disabled={userMutation.isPending} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 text-sm">
                  {userMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salvar Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCompanyModalOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold">{editingCompany ? "Editar Empresa" : "Nova Empresa"}</h2>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCompanySubmit} className="p-6 space-y-8 overflow-y-auto">
              {/* Logo and Basic Info */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-50 flex items-center justify-center">
                      {logoBase64 || editingCompany?.logo_url ? (
                        <img src={logoBase64 || editingCompany?.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={32} className="text-gray-300" />
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
                      <Upload size={14} />
                    </button>
                  </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Nome da Empresa *</label>
                        <input 
                          name="name" 
                          defaultValue={fetchedData.name || editingCompany?.name} 
                          key={fetchedData.name}
                          required 
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">CNPJ</label>
                        <div className="flex gap-2">
                          <InputMask 
                            name="cnpj" 
                            mask="00.000.000/0000-00"
                            defaultValue={editingCompany?.cnpj}
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
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase">Inscrição Estadual (IE)</label>
                      <input name="ie" defaultValue={editingCompany?.ie} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase">Inscrição Municipal (IM)</label>
                      <input name="im" defaultValue={editingCompany?.im} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Regime Tributário</label>
                    <select name="regime_tributario" defaultValue={editingCompany?.regime_tributario || "1"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="1">Simples Nacional</option>
                      <option value="2">Simples Nacional - excesso de sublimite</option>
                      <option value="3">Regime Normal</option>
                    </select>
                  </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase">CNAE</label>
                      <input 
                        name="cnae" 
                        defaultValue={fetchedData.cnae || editingCompany?.cnae} 
                        key={fetchedData.cnae}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">CRT</label>
                    <select name="crt" defaultValue={editingCompany?.crt || "1"} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="1">Simples Nacional</option>
                      <option value="2">Simples Nacional, excesso sublimite</option>
                      <option value="3">Regime Normal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        name="email" 
                        type="email" 
                        defaultValue={fetchedData.email || editingCompany?.email} 
                        key={fetchedData.email}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
                      <InputMask 
                        name="phone" 
                        mask="(00) 00000-0000"
                        defaultValue={fetchedData.phone || editingCompany?.phone}
                        key={fetchedData.phone}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Chave PIX</label>
                    <div className="relative">
                      <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input name="pix_key" defaultValue={editingCompany?.pix_key} placeholder="E-mail, CPF, CNPJ ou Celular" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-bold">
                  <MapPin size={18} className="text-blue-600" />
                  <h3 className="text-sm uppercase tracking-wider">Endereço</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Logradouro</label>
                    <input 
                      name="address" 
                      defaultValue={fetchedData.address || editingCompany?.address} 
                      key={fetchedData.address}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Número</label>
                    <input 
                      name="address_number" 
                      defaultValue={fetchedData.address_number || editingCompany?.address_number} 
                      key={fetchedData.address_number}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Complemento</label>
                    <input 
                      name="complement" 
                      defaultValue={fetchedData.complemento || editingCompany?.complement} 
                      key={fetchedData.complemento}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Bairro</label>
                    <input 
                      name="neighborhood" 
                      defaultValue={fetchedData.neighborhood || editingCompany?.neighborhood} 
                      key={fetchedData.neighborhood}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">CEP</label>
                    <div className="flex gap-2">
                      <InputMask 
                        name="zip_code" 
                        mask="00000-000"
                        defaultValue={fetchedData.zip_code || editingCompany?.zip_code}
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
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Cidade</label>
                    <input 
                      name="city" 
                      defaultValue={fetchedData.city || editingCompany?.city} 
                      key={fetchedData.city}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Estado (UF)</label>
                    <input 
                      name="state" 
                      defaultValue={fetchedData.state || editingCompany?.state} 
                      key={fetchedData.state}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="is_active_company" name="is_active" defaultChecked={editingCompany?.is_active ?? true} className="w-4 h-4 text-blue-600 rounded" />
                    <label htmlFor="is_active_company" className="text-sm font-bold text-gray-700 uppercase">Empresa Ativa</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm">Cancelar</button>
                <button type="submit" disabled={companyMutation.isPending} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 text-sm">
                  {companyMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Salvar Empresa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          setIsDeleteUserModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={() => {
          if (userToDelete) {
            deleteUserMutation.mutate(userToDelete);
          }
        }}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir permanentemente o usuário ${userToDelete?.full_name || userToDelete?.email}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Usuário"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}
