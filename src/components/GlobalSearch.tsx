import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  X, 
  Package, 
  Users, 
  ShoppingCart, 
  Command,
  ChevronRight,
  Loader2,
  ArrowRight
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'product' | 'client' | 'sale';
  path: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCompanyId = api.getCompanyId();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      }, 100);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (query.length < 2) {
      setTimeout(() => setResults([]), 0);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [products, clients, sales] = await Promise.all([
          api.get("products", { company_id: currentCompanyId }),
          api.get("clients", { company_id: currentCompanyId }),
          api.get("sales", { company_id: currentCompanyId })
        ]);

        const searchLower = query.toLowerCase();

        const productResults: SearchResult[] = products
          .filter((p: { name?: string, id: string, stock_quantity: number, sale_price: number }) => p.name?.toLowerCase().includes(searchLower))
          .slice(0, 3)
          .map((p: { name?: string, id: string, stock_quantity: number, sale_price: number }) => ({
            id: p.id,
            title: p.name || 'Sem nome',
            subtitle: `Estoque: ${p.stock_quantity} | R$ ${p.sale_price}`,
            type: 'product',
            path: '/Produtos'
          }));

        const clientResults: SearchResult[] = clients
          .filter((c: { name?: string, document?: string, id: string, email?: string, phone?: string }) => c.name?.toLowerCase().includes(searchLower) || c.document?.includes(query))
          .slice(0, 3)
          .map((c: { name?: string, document?: string, id: string, email?: string, phone?: string }) => ({
            id: c.id,
            title: c.name || 'Sem nome',
            subtitle: c.email || c.phone,
            type: 'client',
            path: '/Clientes'
          }));

        const saleResults: SearchResult[] = sales
          .filter((s: { id: string, client_name?: string, total: number }) => 
            s.id.toLowerCase().includes(searchLower) || 
            s.client_name?.toLowerCase().includes(searchLower)
          )
          .slice(0, 3)
          .map((s: { id: string, client_name?: string, total: number }) => ({
            id: s.id,
            title: `Venda #${s.id.substring(0, 8).toUpperCase()}`,
            subtitle: `${s.client_name} | R$ ${s.total}`,
            type: 'sale',
            path: '/HistoricoVendas'
          }));

        setResults([...productResults, ...clientResults, ...saleResults]);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, currentCompanyId]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return <Package size={18} className="text-blue-500" />;
      case 'client': return <Users size={18} className="text-green-500" />;
      case 'sale': return <ShoppingCart size={18} className="text-purple-500" />;
    }
  };

  const getTypeName = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return 'Produto';
      case 'client': return 'Cliente';
      case 'sale': return 'Venda';
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all w-full max-w-md group"
      >
        <Search size={18} className="group-hover:text-blue-500 transition-colors" />
        <span className="text-sm flex-1 text-left">Buscar produtos, clientes...</span>
        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400">
          <Command size={10} /> K
        </div>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              {/* Search Input */}
              <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                <Search size={24} className={cn("transition-colors", isLoading ? "text-blue-500" : "text-gray-400")} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="O que você está procurando?"
                  className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 placeholder:text-gray-400"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                ) : (
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Results Area */}
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {query.length < 2 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <Search size={32} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Busca Inteligente</p>
                      <p className="text-sm text-gray-500">Digite pelo menos 2 caracteres para pesquisar em todo o sistema.</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Package size={12} /> Produtos</span>
                      <span className="flex items-center gap-1"><Users size={12} /> Clientes</span>
                      <span className="flex items-center gap-1"><ShoppingCart size={12} /> Vendas</span>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                          selectedIndex === index ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                          selectedIndex === index ? "bg-white text-blue-600 shadow-sm" : "bg-gray-50 text-gray-400"
                        )}>
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 truncate">{result.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-tighter">
                              {getTypeName(result.type)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                        </div>
                        <div className={cn(
                          "transition-all",
                          selectedIndex === index ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                        )}>
                          <ArrowRight size={18} className="text-blue-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !isLoading && (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-200">
                      <X size={32} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">Nenhum resultado encontrado</p>
                      <p className="text-sm text-gray-500">Não encontramos nada para "{query}". Tente outros termos.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded shadow-sm text-gray-500">↵</kbd> Selecionar</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded shadow-sm text-gray-500">↑↓</kbd> Navegar</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded shadow-sm text-gray-500">ESC</kbd> Fechar
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
