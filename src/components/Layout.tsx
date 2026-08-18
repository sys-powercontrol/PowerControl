import { Outlet, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Wallet, 
  CreditCard, 
  User, 
  UserPlus,
  Crown, 
  HelpCircle,
  Menu,
  Zap,
  TrendingDown,
  TrendingUp,
  Building2,
  ChevronDown,
  ArrowRightLeft,
  LogOut,
  Truck,
  History,
  BarChart3,
  Globe,
  Tag,
  WifiOff,
  Keyboard
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../lib/auth";
import { PermissionId } from "../lib/permissions";
import { motion, AnimatePresence } from "motion/react";
import * as idb from "idb-keyval";

import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { useGlobalKeyboardShortcuts } from "../hooks/useGlobalKeyboardShortcuts";
import Footer from "./Footer";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { isModalOpen, openModal, closeModal } = useGlobalKeyboardShortcuts();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(api.getCompanyId());

  const { data: allCompanies = [] } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => api.get("companies", { _all: true }),
    enabled: !!user
  });

  const userCompanyIds = useMemo(() => {
    if (!user) return [];
    return Array.isArray(user.company_ids) && user.company_ids.length > 0
      ? user.company_ids
      : (user.company_id ? [user.company_id] : []);
  }, [user]);

  const availableCompanies = useMemo(() => {
    if (!user) return [];
    if (user.role === 'master') return allCompanies;
    if (user.is_active === false) return [];
    if (userCompanyIds.length === 0) return [];

    const matched = allCompanies.filter((c: any) => 
      c.is_active !== false && userCompanyIds.includes(c.id)
    );

    if (matched.length > 0) return matched;
    
    // Fallback while queries are loading
    return userCompanyIds.map(id => ({ id, name: "Minha Empresa", is_active: true }));
  }, [user, allCompanies, userCompanyIds]);

  const effectiveCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.role === 'master') {
      return selectedCompanyId;
    }
    if (user.is_active === false || availableCompanies.length === 0) {
      return null;
    }
    if (selectedCompanyId && availableCompanies.some((c: any) => c.id === selectedCompanyId)) {
      return selectedCompanyId;
    }
    return availableCompanies[0]?.id || userCompanyIds[0] || null;
  }, [user, availableCompanies, selectedCompanyId, userCompanyIds]);

  useEffect(() => {
    if (api.getCompanyId() !== effectiveCompanyId) {
      api.setCompanyId(effectiveCompanyId);
    }
  }, [effectiveCompanyId]);

  const hasCompany = Boolean(
    user && 
    user.is_active !== false && 
    (user.role === 'master' || userCompanyIds.length > 0 || (availableCompanies.length > 0 && effectiveCompanyId))
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleOpenMobileMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener("open-mobile-menu", handleOpenMobileMenu);

    // Periodically check for offline mutations in React Query Cache from IDB
    const checkOfflineQueue = async () => {
      try {
        const cache = await idb.get("react-query-offline-cache");
        if (cache && cache.clientState && cache.clientState.mutations) {
          const pendingMutations = cache.clientState.mutations.filter((m: any) => m.state.status === "pending" || m.state.isPaused);
          setOfflineQueueLength(pendingMutations.length);
        } else {
          setOfflineQueueLength(0);
        }
      } catch (err) {
        console.error("Error reading offline queue", err);
      }
    };

    const interval = setInterval(checkOfflineQueue, 5000);
    checkOfflineQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("open-mobile-menu", handleOpenMobileMenu);
      clearInterval(interval);
    };
  }, []);

  const { data: company } = useQuery({ 
    queryKey: ["company", effectiveCompanyId], 
    queryFn: () => effectiveCompanyId ? api.get(`companies/${effectiveCompanyId}`) : null,
    enabled: !!effectiveCompanyId
  });

  const handleCompanyChange = (id: string | null) => {
    if (user?.role !== 'master' && id === "global") {
      return;
    }
    const newId = id === "global" ? null : id;
    if (user?.role !== 'master' && newId && !availableCompanies.some((c: any) => c.id === newId)) {
      toast.error("Você não tem permissão para acessar esta empresa.");
      return;
    }
    setSelectedCompanyId(newId);
    api.setCompanyId(newId);
    queryClient.invalidateQueries();
    toast.success(newId ? "Empresa selecionada!" : "Visão global ativada.");
    navigate("/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Sessão encerrada.");
  };

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const menuItems: { 
    name: string; 
    path?: string; 
    icon: any; 
    requiresCompany?: boolean; 
    requiresAdmin?: boolean;
    requiresSystemAdmin?: boolean;
    hideForAdmin?: boolean;
    permission?: PermissionId;
    submenu?: { 
      name: string; 
      path: string; 
      icon?: any; 
      requiresAdmin?: boolean;
      permission?: PermissionId;
    }[];
  }[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, permission: 'dashboard.view' },
    { name: "Meu Painel", path: "/PainelVendedor", icon: TrendingUp, requiresCompany: true, hideForAdmin: true },
    { name: "Admin Master", path: "/PainelAdminMaster", icon: Crown, requiresSystemAdmin: true },
    { name: "Dashboard Global", path: "/DashboardGlobal", icon: Globe, requiresSystemAdmin: true },
    { 
      name: "Catálogo", 
      icon: Package,
      requiresCompany: true,
      submenu: [
        { name: "Produtos", path: "/Produtos", permission: 'products.view' },
        { name: "Categorias", path: "/Categorias", permission: 'products.view' },
        { name: "Marcas", path: "/Marcas", permission: 'products.view' },
        { name: "Serviços", path: "/Servicos", permission: 'products.view' },
        { name: "Ajustes de Estoque", path: "/AjustesEstoque", permission: 'inventory.manage' },
        { name: "Histórico de Estoque", path: "/HistoricoEstoque", icon: History, permission: 'inventory.manage' },
        { name: "Giro e Reposição", path: "/RelatorioGiro", icon: BarChart3, permission: 'reports.view' },
      ]
    },
    { 
      name: "Compras", 
      icon: Truck,
      requiresCompany: true,
      submenu: [
        { name: "Comprar", path: "/Compras", permission: 'inventory.manage' },
        { name: "Histórico", path: "/HistoricoCompras", permission: 'inventory.manage' },
      ]
    },
    { 
      name: "Vendas", 
      icon: ShoppingCart,
      requiresCompany: true,
      submenu: [
        { name: "Vender", path: "/Vender", permission: 'sales.create' },
        { name: "Histórico", path: "/HistoricoVendas", permission: 'sales.view' },
        { name: "Comissões", path: "/Comissoes", permission: 'reports.view' },
        { name: "Vendedores", path: "/Vendedores", permission: 'sellers.manage' },
      ]
    },
    { name: "Clientes", path: "/Clientes", icon: Users, requiresCompany: true, permission: 'sales.view' },
    { 
      name: "Financeiro", 
      icon: Wallet,
      requiresCompany: true,
      submenu: [
        { name: "Contas a Pagar", path: "/ContasPagar", icon: TrendingDown, permission: 'finance.view' },
        { name: "Contas a Receber", path: "/ContasReceber", icon: TrendingUp, permission: 'finance.view' },
        { name: "Lucratividade", path: "/RelatorioLucratividade", icon: TrendingUp, permission: 'reports.view' },
        { name: "Relatório DRE", path: "/RelatorioDRE", icon: BarChart3, permission: 'reports.view' },
        { name: "Contas Bancárias", path: "/ContasBancarias", icon: Building2, permission: 'finance.manage' },
        { name: "Conciliação Bancária", path: "/ConciliacaoBancaria", icon: ArrowRightLeft, permission: 'finance.manage' },
        { name: "Transferências", path: "/Transferencias", icon: ArrowRightLeft, permission: 'finance.manage' },
        { name: "Fornecedores", path: "/Fornecedores", icon: Users, permission: 'finance.view' },
        { name: "Centro de Custos", path: "/Categorias", icon: Tag, permission: 'finance.manage' },
      ]
    },
    { name: "Caixas", path: "/Caixas", icon: CreditCard, requiresCompany: true, permission: 'finance.view' },
    { 
      name: "Fiscal", 
      icon: Zap, 
      requiresCompany: true, 
      submenu: [
        { name: "Notas Fiscais", path: "/Fiscal", permission: 'fiscal.manage' },
        { name: "Configurações", path: "/ConfiguracoesFiscais", permission: 'fiscal.manage' },
        { name: "Certificado Digital", path: "/Certificado", permission: 'fiscal.manage' },
      ]
    },
    { name: "Minha Empresa", path: "/Empresa", icon: Building2, requiresCompany: true, permission: 'settings.manage' },
    { name: "Funcionários", path: "/Funcionarios", icon: Users, requiresCompany: true, permission: 'employees.manage' },
    { name: "Convites", path: "/Convites", icon: UserPlus, requiresCompany: true, permission: 'employees.manage' },
    { name: "Meu Perfil", path: "/MeuPerfil", icon: User },
    { name: "Configurações", path: "/Configuracoes", icon: Zap, requiresCompany: true, permission: 'settings.manage' },
    { name: "Suporte", path: "/Suporte", icon: HelpCircle },
  ];
  const { hasPermission } = useAuth();
  const isUserAdmin = user?.role === 'admin' || user?.role === 'master';
  const isPendingApproval = Boolean(user && user.role !== 'master' && !user.is_active);

  const filteredMenuItems = menuItems.filter(item => {
    if (isPendingApproval) {
      return item.path === "/MeuPerfil" || item.path === "/Suporte";
    }
    if (item.requiresSystemAdmin && user?.role !== 'master') return false;
    if (item.requiresAdmin && !isUserAdmin) return false;
    if (item.hideForAdmin && isUserAdmin) return false;
    if (item.requiresCompany && !hasCompany && user?.role !== 'master') return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    
    // If it's a submenu, check if at least one sub-item is visible
    if (item.submenu) {
      const visibleSubs = item.submenu.filter(sub => {
        if (sub.requiresAdmin && !isUserAdmin) return false;
        if (sub.permission && !hasPermission(sub.permission)) return false;
        return true;
      });
      return visibleSubs.length > 0;
    }
    
    return true;
  }).map(item => {
    if (item.submenu) {
      return {
        ...item,
        submenu: item.submenu.filter((sub: any) => {
          if (sub.requiresAdmin && !isUserAdmin) return false;
          if (sub.permission && !hasPermission(sub.permission)) return false;
          return true;
        })
      };
    }
    return item;
  });

  const isActive = (path: string) => location.pathname === path;

  // Route permission guard
  const currentRouteConfig = (() => {
    for (const item of menuItems) {
      if (item.path === location.pathname) {
        return { 
          permission: item.permission, 
          requiresSystemAdmin: item.requiresSystemAdmin, 
          requiresAdmin: item.requiresAdmin,
          requiresCompany: item.requiresCompany 
        };
      }
      if (item.submenu) {
        for (const sub of item.submenu) {
          if (sub.path === location.pathname) {
            return { 
              permission: sub.permission, 
              requiresSystemAdmin: false, 
              requiresAdmin: sub.requiresAdmin,
              requiresCompany: item.requiresCompany 
            };
          }
        }
      }
    }
    return null;
  })();

  // Redirect non-master users if explicitly pending approval (is_active === false) or if they don't have any company assigned
  if (user && user.role !== 'master' && (user.is_active === false || (!hasCompany && userCompanyIds.length === 0)) && location.pathname !== "/MeuPerfil" && location.pathname !== "/Suporte") {
    return <Navigate to="/MeuPerfil" replace />;
  }

  // Redirect users who navigate directly to a route they lack permissions for
  if (user && user.role !== 'master' && currentRouteConfig) {
    if (currentRouteConfig.requiresSystemAdmin) {
      return <Navigate to="/" replace />;
    }
    if (currentRouteConfig.requiresAdmin && !isUserAdmin) {
      return <Navigate to="/" replace />;
    }
    if (currentRouteConfig.permission && !hasPermission(currentRouteConfig.permission)) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-20">
        <Link to="/" className="p-6 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50/80 transition-colors group">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">PowerControl</h1>
            <p className="text-xs text-gray-500">Sistema de Gestão</p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenuItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors",
                      "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      {item.name}
                    </div>
                    <ChevronDown size={16} className={cn("transition-transform", openSubmenus[item.name] && "rotate-180")} />
                  </button>
                  {openSubmenus[item.name] && (
                    <div className="ml-9 mt-1 space-y-1">
                      {item.submenu.map(sub => (
                        <Link
                          key={sub.name}
                          to={sub.path}
                          className={cn(
                            "block p-2 rounded-lg text-xs font-medium transition-colors",
                            isActive(sub.path) ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-blue-600"
                          )}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path!}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.path!) 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                  )}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          {user?.role === 'master' ? (
            <div className="mb-4 space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 flex items-center gap-1">
                <Crown size={12} className="text-amber-500" />
                Empresa Ativa
              </label>
              <select 
                value={selectedCompanyId || "global"}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="global">🌐 Visão Global (Todas)</option>
                {allCompanies.map((c: any) => (
                  <option key={c.id} value={c.id}>🏢 {c.name}</option>
                ))}
              </select>
            </div>
          ) : availableCompanies.length > 1 ? (
            <div className="mb-4 space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 flex items-center gap-1">
                <Building2 size={12} className="text-blue-500" />
                Trocar Empresa ({availableCompanies.length})
              </label>
              <select 
                value={effectiveCompanyId || ""}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full p-2 text-xs bg-blue-50/60 border border-blue-200 text-blue-900 font-semibold rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {availableCompanies.map((c: any) => (
                  <option key={c.id} value={c.id}>🏢 {c.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || "U"
              )}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || "Carregando..."}</p>
              <p className="text-xs text-gray-500 truncate">{company?.name || (user?.role === 'master' && !selectedCompanyId ? "Visão Global" : "Sem empresa")}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-2 p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-8">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GlobalSearch />
            
            {/* Connectivity Badge */}
            <div className="hidden sm:flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">On-line</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100">
                  <WifiOff size={12} className="text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Off-line</span>
                </div>
              )}
              
              {/* Offline Queue Counter */}
              {!isOnline && offlineQueueLength > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 border border-red-200" title="Vendas/Ações aguardando sincronização">
                  <span className="text-xs font-bold text-red-700">{offlineQueueLength}</span>
                  <span className="text-[10px] text-red-600 font-medium">pendentes</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              title="Atalhos Globais do Teclado (Alt+H)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-bold transition-all border border-gray-200 shadow-sm"
            >
              <Keyboard size={15} className="text-blue-600" />
              <span>Atalhos</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-300 rounded text-gray-500 font-extrabold ml-1">
                Alt+H
              </kbd>
            </button>

            <NotificationCenter />
            <Link to="/MeuPerfil" className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{user?.full_name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden border border-blue-200 group-hover:border-blue-400 transition-colors">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0)
                )}
              </div>
            </Link>
          </div>
        </header>

        <KeyboardShortcutsModal isOpen={isModalOpen} onClose={closeModal} />

        {isPendingApproval && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 text-amber-900 text-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 font-bold">
              ⏳
            </div>
            <div>
              <p className="font-bold">Aguardando Liberação por Administrador</p>
              <p className="text-amber-700 text-xs">
                Sua conta foi criada com sucesso! Você tem acesso restrito às páginas de <strong>Meu Perfil</strong> e <strong>Suporte</strong> enquanto aguarda a aprovação por um usuário administrador.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          <Footer />
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-30">
        {!isPendingApproval && hasCompany && (
          <>
            <Link to="/" className={cn("flex flex-col items-center p-2", isActive("/") ? "text-blue-600" : "text-gray-500")}>
              <LayoutDashboard size={24} />
              <span className="text-[10px] mt-1">Início</span>
            </Link>
            <Link to="/Vender" className={cn("flex flex-col items-center p-2", isActive("/Vender") ? "text-blue-600" : "text-gray-500")}>
              <ShoppingCart size={24} />
              <span className="text-[10px] mt-1">Vender</span>
            </Link>
            <Link to="/Caixas" className={cn("flex flex-col items-center p-2", isActive("/Caixas") ? "text-blue-600" : "text-gray-500")}>
              <CreditCard size={24} />
              <span className="text-[10px] mt-1">Caixa</span>
            </Link>
          </>
        )}
        <Link to="/Produtos" className={cn("flex flex-col items-center p-2", isActive("/Produtos") ? "text-blue-600" : "text-gray-500")}>
          <Package size={24} />
          <span className="text-[10px] mt-1">Catálogo</span>
        </Link>
        <Link to="/ContasPagar" className={cn("flex flex-col items-center p-2", isActive("/ContasPagar") ? "text-blue-600" : "text-gray-500")}>
          <Wallet size={24} />
          <span className="text-[10px] mt-1">Financeiro</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center p-2 text-gray-500"
        >
          <Menu size={24} />
          <span className="text-[10px] mt-1">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500">✕</button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredMenuItems.map(item => (
                <div key={item.name}>
                  {item.submenu ? (
                    <div>
                      <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors",
                          "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} />
                          {item.name}
                        </div>
                        <ChevronDown size={16} className={cn("transition-transform", openSubmenus[item.name] && "rotate-180")} />
                      </button>
                      {openSubmenus[item.name] && (
                        <div className="ml-9 mt-1 space-y-1">
                          {item.submenu.map(sub => (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={cn(
                                "block p-2 rounded-lg text-xs font-medium transition-colors",
                                isActive(sub.path) ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-blue-600"
                              )}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path!}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg text-sm font-medium",
                        isActive(item.path!) ? "bg-blue-50 text-blue-600" : "text-gray-600"
                      )}
                    >
                      <item.icon size={20} />
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              {user?.role === 'master' ? (
                <div className="mb-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Empresa Ativa</label>
                  <select 
                    value={selectedCompanyId || "global"}
                    onChange={(e) => {
                      handleCompanyChange(e.target.value);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-2 text-xs bg-white border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="global">🌐 Visão Global</option>
                    {allCompanies.map((c: any) => (
                      <option key={c.id} value={c.id}>🏢 {c.name}</option>
                    ))}
                  </select>
                </div>
              ) : availableCompanies.length > 1 ? (
                <div className="mb-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Trocar Empresa</label>
                  <select 
                    value={selectedCompanyId || ""}
                    onChange={(e) => {
                      handleCompanyChange(e.target.value);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-2 text-xs bg-white border border-blue-200 text-blue-900 font-semibold rounded-xl outline-none"
                  >
                    {availableCompanies.map((c: any) => (
                      <option key={c.id} value={c.id}>🏢 {c.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full p-2 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
