import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Keyboard, 
  X, 
  ShoppingCart, 
  Package, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  CreditCard, 
  Search, 
  Truck,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

export interface ShortcutItem {
  keyCombo: string;
  description: string;
  category: "Navegação" | "Operacional" | "Sistema";
  path?: string;
  actionName?: string;
  icon: any;
}

export const SYSTEM_SHORTCUTS: ShortcutItem[] = [
  { keyCombo: "Ctrl + P", description: "Abrir PDV / Nova Venda", category: "Operacional", path: "/Vender", icon: ShoppingCart },
  { keyCombo: "Ctrl + E", description: "Ir para Catálogo de Produtos", category: "Navegação", path: "/Produtos", icon: Package },
  { keyCombo: "Ctrl + D", description: "Ir para o Dashboard Executive", category: "Navegação", path: "/", icon: LayoutDashboard },
  { keyCombo: "Ctrl + Shift + C", description: "Ir para Gestão de Clientes", category: "Navegação", path: "/Clientes", icon: Users },
  { keyCombo: "Ctrl + Shift + F", description: "Ir para Contas a Pagar / Financeiro", category: "Navegação", path: "/ContasPagar", icon: Wallet },
  { keyCombo: "Ctrl + Shift + X", description: "Gerenciar Caixas e Operações", category: "Operacional", path: "/Caixas", icon: CreditCard },
  { keyCombo: "Ctrl + Shift + B", description: "Ir para Compras e Entradas", category: "Operacional", path: "/Compras", icon: Truck },
  { keyCombo: "Ctrl + K", description: "Abrir Busca Global Inteligente", category: "Sistema", actionName: "search", icon: Search },
  { keyCombo: "Alt + H ou ?", description: "Abrir este Guia de Atalhos", category: "Sistema", actionName: "help", icon: Keyboard },
];

export default function KeyboardShortcutsModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing inside input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      );

      // Toggle modal on Alt+H or Shift+? (when not typing in input)
      if ((e.altKey && e.key?.toLowerCase() === "h") || (!isInputFocused && e.key === "?")) {
        e.preventDefault();
        onClose(); // toggles or triggers
        return;
      }

      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleExecuteShortcut = (shortcut: ShortcutItem) => {
    onClose();
    if (shortcut.path) {
      if (location.pathname !== shortcut.path) {
        navigate(shortcut.path);
        toast.info(`Navegando: ${shortcut.description} (${shortcut.keyCombo})`, {
          icon: <shortcut.icon size={16} className="text-blue-600" />
        });
      }
    } else if (shortcut.actionName === "search") {
      // Dispatch custom event to trigger GlobalSearch
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Keyboard size={22} className="text-blue-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    Atalhos Globais do Sistema
                    <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-extrabold rounded-full">
                      Produtividade
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">Navegue e execute ações rapidamente com teclas de atalho</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {(["Operacional", "Navegação", "Sistema"] as const).map((category) => {
                const shortcuts = SYSTEM_SHORTCUTS.filter(s => s.category === category);
                if (shortcuts.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-400">{category}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {shortcuts.map((s) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={s.keyCombo}
                            onClick={() => handleExecuteShortcut(s)}
                            className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-blue-50/60 hover:border-blue-200 transition-all group text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 group-hover:border-blue-300 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-blue-600 shadow-sm transition-colors">
                                <Icon size={16} />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-gray-800 group-hover:text-blue-900 truncate">
                                  {s.description}
                                </p>
                                {s.path && (
                                  <p className="text-[10px] text-gray-400 group-hover:text-blue-600">
                                    {s.path}
                                  </p>
                                )}
                              </div>
                            </div>

                            <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 ml-2">
                              {s.keyCombo}
                            </kbd>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles size={14} className="text-amber-500" />
                Dica: Pressione <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono font-bold">Alt + H</kbd> a qualquer momento.
              </span>

              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
