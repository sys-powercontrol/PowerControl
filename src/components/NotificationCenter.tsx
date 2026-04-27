import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2,
  Info,
  ChevronRight,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getTodayBR } from "../lib/dateUtils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  link: string;
  date: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canViewProducts = hasPermission('products.view');
  const canViewFinance = hasPermission('finance.view');
  const canViewFiscal = hasPermission('fiscal.manage');

  // Queries for dynamic alerts
  const { data: products = [] } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products"),
    enabled: !!user && canViewProducts
  });

  const { data: accountsPayable = [] } = useQuery({ 
    queryKey: ["accountsPayable", currentCompanyId], 
    queryFn: () => api.get("accountsPayable"),
    enabled: !!user && canViewFinance
  });

  const { data: accountsReceivable = [] } = useQuery({ 
    queryKey: ["accountsReceivable", currentCompanyId], 
    queryFn: () => api.get("accountsReceivable"),
    enabled: !!user && canViewFinance
  });

  const { data: invoices = [] } = useQuery({ 
    queryKey: ["invoices", currentCompanyId], 
    queryFn: () => api.get("invoices"),
    enabled: !!user && canViewFiscal
  });

  // Persisted notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", currentCompanyId],
    queryFn: () => api.get("notifications", { company_id: currentCompanyId, status: "unread" }),
    enabled: !!user
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.put("notifications", id, { status: "read" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n: any) => n.status === "unread");
      await Promise.all(unread.map((n: any) => api.put("notifications", n.id, { status: "read" })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const today = getTodayBR();

    // 1. Low Stock Alerts
    products.filter((p: any) => p.stock_quantity <= p.min_stock).forEach((p: any) => {
      list.push({
        id: `stock-${p.id}`,
        title: "Estoque Baixo",
        message: `O produto "${p.name}" está com apenas ${p.stock_quantity} unidades.`,
        type: 'warning',
        link: "/Produtos",
        date: new Date().toISOString()
      });
    });

    // 2. Accounts Due Today
    accountsPayable.filter((a: any) => a.due_date === today && a.status === "Pendente").forEach((a: any) => {
      list.push({
        id: `payable-${a.id}`,
        title: "Conta a Pagar Hoje",
        message: `Vencimento de ${formatCurrency(a.amount)} para "${a.description}".`,
        type: 'error',
        link: "/ContasPagar",
        date: new Date().toISOString()
      });
    });

    accountsReceivable.filter((a: any) => a.due_date === today && a.status === "Pendente").forEach((a: any) => {
      list.push({
        id: `receivable-${a.id}`,
        title: "Conta a Receber Hoje",
        message: `Expectativa de ${formatCurrency(a.amount)} de "${a.client_name || a.description}".`,
        type: 'info',
        link: "/ContasReceber",
        date: new Date().toISOString()
      });
    });

    // 3. Rejected & Emitted Invoices
    invoices.filter((i: any) => i.status === "Rejeitada").forEach((i: any) => {
      list.push({
        id: `invoice-rej-${i.id}`,
        title: "NF-e Rejeitada",
        message: `A nota fiscal #${i.number} foi rejeitada pela SEFAZ.`,
        type: 'error',
        link: "/Fiscal",
        date: new Date().toISOString()
      });
    });

    invoices.filter((i: any) => i.status === "Emitida" && i.date === today).forEach((i: any) => {
      list.push({
        id: `invoice-emi-${i.id}`,
        title: "NF-e Autorizada",
        message: `A nota fiscal #${i.number} para ${i.client_name} foi autorizada com sucesso!`,
        type: 'success',
        link: "/Fiscal",
        date: new Date().toISOString()
      });
    });

    // 4. Persisted Notifications
    notifications.forEach((n: any) => {
      list.push({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        link: n.link || "#",
        date: n.created_at
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [products, accountsPayable, accountsReceivable, invoices, notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'error': return <XCircle size={18} className="text-red-500" />;
      case 'success': return <CheckCircle2 size={18} className="text-emerald-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          isOpen ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        )}
      >
        <Bell size={22} />
        {alerts.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-[90vw] max-w-[360px] sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100]"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900">Notificações</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{alerts.length} Alertas Ativos</p>
              </div>
              {alerts.length > 0 && (
                <button 
                  onClick={() => clearAllMutation.mutate()}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Limpar tudo"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <Bell size={32} />
                  </div>
                  <p className="text-sm text-gray-500">Tudo limpo por aqui! Nenhuma notificação pendente.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-4 hover:bg-gray-50 transition-colors group relative"
                    >
                      <div className="flex gap-3">
                        <div className="mt-1 shrink-0">
                          {getIcon(alert.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                            <span className="text-[10px] text-gray-400">
                              {new Date(alert.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{alert.message}</p>
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => {
                                navigate(alert.link);
                                setIsOpen(false);
                              }}
                              className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                            >
                              Ver Detalhes <ChevronRight size={12} />
                            </button>
                            {!alert.id.includes('-') && (
                              <button
                                onClick={() => markAsReadMutation.mutate(alert.id)}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-600"
                              >
                                Marcar como lida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <button 
                onClick={() => {
                  navigate("/Suporte");
                  setIsOpen(false);
                }}
                className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
              >
                Central de Ajuda
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
