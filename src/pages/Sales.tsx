import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { inventory } from "../lib/inventory";
import { fiscal, FiscalOperation } from "../lib/fiscal";
import { 
  ShoppingCart, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2,
  QrCode,
  Printer,
  ChevronRight,
  Search,
  Minus,
  AlertCircle,
  Tag,
  Package,
  Lock,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR, getTodayBR } from "../lib/dateUtils";
import { printReceipt } from "../lib/utils/print";
import { format, subDays } from "date-fns";
import { PaymentGateway } from "../components/Sales/PaymentGateway";
import { offlineStore } from "../lib/offlineStore";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function Sales() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [cashReceived, setCashReceived] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
  const [dueDate, setDueDate] = useState(formatBR(subDays(getNowBR(), -30), 'yyyy-MM-dd'));
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "cart">("items");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const pending = await offlineStore.hasPendingSales();
      setHasPending(pending);
    };
    checkPending();

    const handleOnline = async () => {
      setIsOnline(true);
      await offlineStore.syncSales();
      await checkPending();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const currentCompanyId = user?.company_id || api.getCompanyId();
  const canEditPrices = hasPermission('prices.edit');
  const canCreate = hasPermission('sales.create');

  

  const { data: productsData = [] } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: servicesData = [] } = useQuery({ 
    queryKey: ["services", currentCompanyId], 
    queryFn: () => api.get("services", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: clientsData = [] } = useQuery({ 
    queryKey: ["clients", currentCompanyId], 
    queryFn: () => api.get("clients", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: cashiersData = [] } = useQuery({ 
    queryKey: ["cashiers", currentCompanyId], 
    queryFn: () => api.get("cashiers", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: bankAccountsData = [] } = useQuery({ 
    queryKey: ["bankAccounts", currentCompanyId], 
    queryFn: () => api.get("bankAccounts", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: sellersData = [] } = useQuery({ 
    queryKey: ["sellers", currentCompanyId], 
    queryFn: () => api.get("sellers", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });

  const products = useMemo(() => {
    if (!currentCompanyId) return productsData;
    return productsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [productsData, currentCompanyId]);

  const services = useMemo(() => {
    if (!currentCompanyId) return servicesData;
    return servicesData.filter((item: any) => item.company_id === currentCompanyId);
  }, [servicesData, currentCompanyId]);

  const clients = useMemo(() => {
    if (!currentCompanyId) return clientsData;
    return clientsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [clientsData, currentCompanyId]);

  const cashiers = useMemo(() => {
    if (!currentCompanyId) return cashiersData;
    return cashiersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [cashiersData, currentCompanyId]);

  const bankAccounts = useMemo(() => {
    if (!currentCompanyId) return bankAccountsData;
    return bankAccountsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [bankAccountsData, currentCompanyId]);

  const sellers = useMemo(() => {
    if (!currentCompanyId) return sellersData;
    return sellersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [sellersData, currentCompanyId]);

  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);

  const hasOpenCashier = useMemo(() => {
    const today = getTodayBR();
    return cashiers.some((c: any) => 
      c.status === "Aberto" && 
      c.opened_by_id === user?.id &&
      c.opened_at?.startsWith(today)
    );
  }, [cashiers, user?.id]);

  // Auto-select the open cashier if there is only one
  useEffect(() => {
    if (hasOpenCashier && !selectedCashier) {
      const myOpenCashier = cashiers.find((c: any) => c.status === "Aberto" && c.opened_by_id === user?.id);
      if (myOpenCashier) {
        setTimeout(() => setSelectedCashier(myOpenCashier), 0);
      }
    }
  }, [hasOpenCashier, cashiers, user?.id, selectedCashier]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", currentCompanyId],
    queryFn: () => api.get("companies"),
    enabled: user?.role === 'admin' || user?.role === 'master'
  });

  const { data: companyData } = useQuery({ 
    queryKey: ["company", currentCompanyId], 
    queryFn: () => api.get(`companies/${currentCompanyId}`),
    enabled: !!currentCompanyId
  });

  const company = companyData;

  const filteredItems = useMemo(() => {
    const p = products.map((item: any) => ({ ...item, type: 'product' }));
    const s = services.map((item: any) => ({ ...item, type: 'service', stock_quantity: Infinity }));
    return [...p, ...s].filter((item: any) => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, services, searchTerm]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const total = subtotal - discount;
  const change = Math.max(0, cashReceived - total);

  const addToCart = (item: any) => {
    if (item.type === 'product' && item.stock_quantity <= 0) {
      toast.error("Produto sem estoque!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (item.type === 'product' && existing.quantity >= item.stock_quantity) {
          toast.error("Quantidade máxima em estoque atingida!");
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    const item = [...products, ...services].find((i: any) => i.id === id);
    if (item && item.type === 'product' && qty > item.stock_quantity) {
      toast.error("Quantidade máxima em estoque atingida!");
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const finalizeSale = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Selecione um cliente");
      if (!selectedCashier) throw new Error("Selecione um caixa");
      if (!selectedSeller) throw new Error("Selecione um vendedor");
      if (cart.length === 0) throw new Error("Carrinho vazio");

      const fiscalOperation: FiscalOperation = {
        type: 'sale',
        origin_state: company?.state || 'SP',
        dest_state: selectedClient.address_state || company?.state || 'SP',
        is_consumer: true,
        is_contributor: !!selectedClient.document && selectedClient.document.length > 11,
        regime: company?.regime_tributario === "3" ? 'normal' : 'simples',
        finality: 'revenda'
      };

      const itemsWithTaxes = cart.map(item => {
        const hasST = !!item.mva_rate && item.mva_rate > 0;
        const cfop = fiscal.getCFOP(fiscalOperation, item.type, hasST);
        
        const itemGrossValue = item.price * item.quantity;
        const discountProportional = subtotal > 0 ? (itemGrossValue / subtotal) * discount : 0;
        const itemNetValue = itemGrossValue - discountProportional;

        const taxes = fiscal.calculateTaxes(itemNetValue, {
          icms_rate: item.icms_rate || 0,
          ipi_rate: item.ipi_rate || 0,
          pis_rate: item.pis_rate || 0,
          cofins_rate: item.cofins_rate || 0,
          iss_rate: item.iss_rate || 0,
          mva_rate: item.mva_rate || 0,
          aliquota_interna_destino: item.aliquota_interna_destino || 0,
          ncm: item.ncm,
          cest: item.cest
        }, fiscalOperation);

        return {
          ...item,
          cfop,
          discount_amount: discountProportional,
          taxes
        };
      });

      const totalTaxes = itemsWithTaxes.reduce((acc, item) => acc + item.taxes.total_taxes, 0);
      
      // The total commercial value is 'total' (subtotal - discount)
      // Since taxes were calculated on net value, we don't need to subtract discount again from the sum of item total values (which already factored in discount indirectly or directly in the base).
      // Wait, item.taxes.total_value from calculateTaxes includes the base value passed to it plus IPI, etc.
      // So item.taxes.total_value is exactly itemNetValue + IPI + ST
      // Therefore, the totalFiscalValue is just the sum of item.taxes.total_value.
      const totalFiscalValue = itemsWithTaxes.reduce((acc, item) => acc + item.taxes.total_value, 0);
      
      const commissionAmount = (totalFiscalValue * (selectedSeller.commission_rate || 0)) / 100;

      if (paymentMethod === "Dinheiro" && !selectedCashier) {
        toast.error("Nenhum caixa aberto selecionado.");
        return;
      }

      if ((paymentMethod === "PIX" || paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito" || paymentMethod === "Boleto") && !selectedBankAccount) {
        toast.error("Nenhuma conta bancária selecionada.");
        return;
      }

      if (isNaN(totalFiscalValue) || totalFiscalValue < 0) {
        toast.error("Valor total da venda inválido.");
        return;
      }

      const saleData = {
        company_id: user?.company_id,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        client_document: selectedClient.document || "",
        ...(paymentMethod === "Dinheiro" ? { cashier_id: selectedCashier.id } : {}),
        ...((paymentMethod === "PIX" || paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito" || paymentMethod === "Boleto") ? { bank_account_id: selectedBankAccount?.id } : {}),
        seller_id: selectedSeller.id,
        seller_name: selectedSeller.name,
        commission_amount: commissionAmount,
        commission_status: "pending" as 'pending' | 'paid',
        items: itemsWithTaxes,
        total: totalFiscalValue,
        subtotal,
        discount,
        total_taxes: totalTaxes,
        payment_method: paymentMethod,
        ...(paymentMethod === "A Prazo" || paymentMethod === "Fiado" ? { due_date: dueDate } : {}),
        status: "Concluída",
        sale_date: new Date().toISOString()
      };

      if (!navigator.onLine) {
        await offlineStore.saveSale(saleData, itemsWithTaxes, user);
        return { id: "offline-" + Date.now(), ...saleData, isOffline: true };
      }

      const sale = await inventory.processSale(saleData, itemsWithTaxes, user);
      
      await api.log({
        action: 'CREATE',
        entity: 'sales',
        entity_id: sale.id,
        description: `Finalizou venda #${sale.id.substr(0, 8).toUpperCase()} para ${selectedClient.name}`,
        metadata: { total, paymentMethod }
      });
      
      return sale;
    },
    onSuccess: (sale: any) => {
      if (sale.isOffline) {
        setCart([]);
        setSelectedClient(null);
        setDiscount(0);
        setHasPending(true);
        return;
      }
      setLastSale(sale);
      setShowReceipt(true);
      setCart([]);
      setSelectedClient(null);
      setDiscount(0);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
      toast.success("Venda finalizada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <ShoppingCart size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para realizar vendas. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!hasOpenCashier && (user?.role !== 'admin' && user?.role !== 'master') && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-3xl">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-md space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Lock size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Caixa Fechado</h2>
              <p className="text-gray-500">
                Você precisa ter um caixa aberto para realizar vendas. 
                Por favor, abra um caixa antes de continuar.
              </p>
            </div>
            <button 
              onClick={() => navigate("/caixas")}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              Ir para Gestão de Caixas
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24 lg:pb-0">
      {/* Mobile Tabs */}
      <div className="lg:hidden flex p-1 bg-gray-100 rounded-xl mb-4">
        <button 
          onClick={() => setActiveTab("items")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "items" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
        >
          Produtos
        </button>
        <button 
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "cart" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
        >
          Carrinho
          {cart.length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {cart.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main Column */}
      <div className={`lg:col-span-2 space-y-6 ${activeTab !== "items" ? "hidden lg:block" : ""}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vender</h1>
          
          <div className="ml-auto flex items-center gap-4">
            {hasPending && (
              <button 
                onClick={async () => {
                  await offlineStore.syncSales();
                  const pending = await offlineStore.hasPendingSales();
                  setHasPending(pending);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-colors"
              >
                <RefreshCw size={14} className={isOnline ? "animate-spin-slow" : ""} />
                Sincronizar Pendentes
              </button>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isOnline ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* Client & Seller Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <User size={16} /> Cliente *
            </label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setSelectedClient(clients.find((c: any) => c.id === e.target.value))}
              value={selectedClient?.id || ""}
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <User size={16} /> Vendedor *
            </label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setSelectedSeller(sellers.find((s: any) => s.id === e.target.value))}
              value={selectedSeller?.id || ""}
            >
              <option value="">Selecione um vendedor...</option>
              {sellers.filter((s: any) => s.active !== false).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product & Service Selection */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Adicionar Itens</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar produto ou serviço..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredItems.map((p: any) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.type === 'product' && p.stock_quantity <= 0}
                className={`flex items-center justify-between p-4 border border-gray-100 rounded-xl transition-all text-left group ${
                  p.type === 'product' && p.stock_quantity <= 0 ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${p.type === 'service' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {p.type === 'service' ? <Tag size={16} /> : <Package size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <p className={`text-xs ${p.type === 'product' && p.stock_quantity <= p.min_stock ? "text-red-500 font-bold" : "text-gray-500"}`}>
                      {p.type === 'service' ? 'Serviço' : `Estoque: ${p.stock_quantity} ${p.unit || "un"}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-blue-600">R$ {p.price?.toLocaleString()}</span>
                  <div className="p-1 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm ${activeTab !== "cart" ? "hidden lg:block" : ""}`}>
          <h2 className="font-bold text-lg mb-4">Carrinho</h2>
          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
              <p>O carrinho está vazio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    {canEditPrices ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            setCart(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i));
                          }}
                          className="w-20 px-1 py-0.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500">/ {item.unit || "un"}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">R$ {item.price?.toLocaleString()} / {item.unit || "un"}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded-md text-gray-500">
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded-md text-gray-500">
                        +
                      </button>
                    </div>
                    <p className="w-24 text-right font-bold text-gray-900">R$ {(item.price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Summary */}
      <div className={`space-y-6 ${activeTab !== "cart" ? "hidden lg:block" : ""}`}>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 sticky top-8">
          <h2 className="font-bold text-xl">Resumo</h2>

          <div className="space-y-4">
            {paymentMethod === "Dinheiro" ? (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Caixa Destino *</label>
                <select 
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={(e) => {
                    const cashier = cashiers.find((c: any) => c.id === e.target.value);
                    setSelectedCashier(cashier || null);
                  }}
                  value={selectedCashier?.id || ""}
                >
                  <option value="">Selecione o caixa...</option>
                  {cashiers.filter((c: any) => c.status === "Aberto").map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} (R$ {c.balance?.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            ) : (paymentMethod === "PIX" || paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito" || paymentMethod === "Boleto") ? (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Conta Bancária Destino *</label>
                <select 
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={(e) => {
                    const account = bankAccounts.find((a: any) => a.id === e.target.value);
                    setSelectedBankAccount(account || null);
                  }}
                  value={selectedBankAccount?.id || ""}
                >
                  <option value="">Selecione a conta bancária...</option>
                  {bankAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} (R$ {a.balance?.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento *</label>
              <select 
                className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
                <option value="A Prazo">A Prazo</option>
                <option value="Fiado">Fiado</option>
              </select>
            </div>

            {(paymentMethod === "A Prazo" || paymentMethod === "Fiado") && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Data de Vencimento *</label>
                <input 
                  type="date" 
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Desconto (R$)</label>
              <input 
                type="number" 
                className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {paymentMethod === "Dinheiro" && (
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Valor Recebido (R$)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                  <span className="text-sm font-bold text-green-700 uppercase">Troco</span>
                  <span className="text-xl font-bold text-green-700">R$ {change.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>R$ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>Desconto</span>
              <span>- R$ {discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2">
              <span>Total</span>
              <span className="text-green-600">R$ {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            {paymentMethod === "PIX" && (
              <button 
                onClick={() => setShowPaymentGateway(true)}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
              >
                <QrCode size={20} />
                Gerar QR Code PIX
              </button>
            )}
            {(paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito") && (
              <button 
                onClick={() => setShowPaymentGateway(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <CreditCard size={20} />
                Pagar com Cartão
              </button>
            )}
            <button 
              onClick={() => finalizeSale.mutate()}
              disabled={finalizeSale.isPending || (paymentMethod === "PIX" && !showPaymentGateway) || ((paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito") && !showPaymentGateway)}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-50"
            >
              <CheckCircle2 size={24} />
              {finalizeSale.isPending ? "Finalizando..." : "Finalizar Venda"}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
          <span className="text-xl font-black text-blue-600">R$ {total.toLocaleString()}</span>
        </div>
        {activeTab === "items" ? (
          <button 
            onClick={() => setActiveTab("cart")}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            Ver Carrinho
            <ChevronRight size={18} />
          </button>
        ) : (
          <button 
            onClick={() => finalizeSale.mutate()}
            disabled={finalizeSale.isPending || cart.length === 0}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {finalizeSale.isPending ? "Processando..." : "Finalizar"}
          </button>
        )}
      </div>

      {/* Payment Gateway Modal */}
      {showPaymentGateway && (
        <PaymentGateway 
          amount={total}
          method={paymentMethod === "PIX" ? "PIX" : "CARD"}
          onSuccess={() => {
            setShowPaymentGateway(false);
            finalizeSale.mutate();
          }}
          onClose={() => setShowPaymentGateway(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Venda Concluída!</h2>
                <p className="text-gray-500">Venda #{lastSale?.id?.substr(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-4xl font-bold text-green-600 py-4">R$ {lastSale?.total?.toLocaleString()}</div>
              
              <div className="bg-gray-50 p-4 rounded-2xl text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-bold">{lastSale?.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pagamento</span>
                  <span className="font-bold">{lastSale?.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span className="font-bold">{formatBR(lastSale?.sale_date, "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => printReceipt(lastSale, company)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  <Printer size={20} /> Imprimir
                </button>
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
