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
  Tag
} from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../lib/auth";
import { PermissionId } from "../lib/permissions";
import { motion, AnimatePresence } from "motion/react";

import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";

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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(api.getCompanyId());
  const hasCompany = !!(user?.company_id || selectedCompanyId);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => api.get("companies", { _all: true }),
    enabled: user?.role === 'master'
  });

  const { data: company } = useQuery({ 
    queryKey: ["company", user?.company_id || selectedCompanyId], 
    queryFn: () => (user?.company_id || selectedCompanyId) ? api.get(`companies/${user?.company_id || selectedCompanyId}`) : null,
    enabled: !!(user?.company_id || selectedCompanyId)
  });

  const handleCompanyChange = (id: string | null) => {
    const newId = id === "global" ? null : id;
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
    { name: "Dashboard", path: "/", icon: LayoutDashboard, requiresCompany: true, permission: 'dashboard.view' },
    { name: "Meu Painel", path: "/PainelVendedor", icon: TrendingUp, requiresCompany: true, hideForAdmin: true },
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
    { name: "Dashboard Global", path: "/DashboardGlobal", icon: Globe, requiresSystemAdmin: true },
    { name: "Admin Master", path: "/PainelAdminMaster", icon: Crown, requiresSystemAdmin: true },
    { name: "Minha Empresa", path: "/Empresa", icon: Building2, requiresCompany: true, permission: 'settings.manage' },
    { name: "Funcionários", path: "/Funcionarios", icon: Users, requiresCompany: true, permission: 'employees.manage' },
    { name: "Convites", path: "/Convites", icon: UserPlus, requiresCompany: true, permission: 'employees.manage' },
    { name: "Meu Perfil", path: "/MeuPerfil", icon: User },
    { name: "Configurações", path: "/Configuracoes", icon: Zap, requiresCompany: true, permission: 'settings.manage' },
    { name: "Suporte", path: "/Suporte", icon: HelpCircle },
  ];
  const { hasPermission } = useAuth();
  const isUserAdmin = user?.role === 'admin' || user?.role === 'master';

  const filteredMenuItems = menuItems.filter(item => {
    if (item.requiresSystemAdmin && user?.role !== 'master') return false;
    if (item.requiresAdmin && !isUserAdmin) return false;
    if (item.hideForAdmin && isUserAdmin) return false;
    if (item.requiresCompany && !hasCompany) return false;
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

  // Only redirect non-master and non-admin users if they don't have a company
  if (user && user.role !== 'admin' && user.role !== 'master' && !hasCompany && location.pathname !== "/MeuPerfil" && location.pathname !== "/Suporte") {
    return <Navigate to="/MeuPerfil" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 leading-tight">PowerControl</h1>
            <p className="text-xs text-gray-500">Sistema de Gestão</p>
          </div>
        </div>

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
          {user?.role === 'master' && (
            <div className="mb-4 space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-2">Trocar Empresa</label>
              <select 
                value={selectedCompanyId || "global"}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full p-2 text-xs bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="global">Visão Global</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || "U"
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || "Carregando..."}</p>
              <p className="text-xs text-gray-500 truncate">{company?.name || "Sem empresa"}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-2 p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-8">
        {/* Header Bar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between">
          <GlobalSearch />
          
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-bold text-gray-900">{user?.full_name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{user?.role}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden cursor-pointer" onClick={() => navigate('/profile')}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
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
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-30">
        {hasCompany && (
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
        <Link to="/MeuPerfil" className={cn("flex flex-col items-center p-2", isActive("/MeuPerfil") ? "text-blue-600" : "text-gray-500")}>
          <User size={24} />
          <span className="text-[10px] mt-1">Perfil</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
