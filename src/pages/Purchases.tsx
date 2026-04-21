import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { inventory } from "../lib/inventory";
import { fiscal, FiscalOperation } from "../lib/fiscal";
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle2,
  Truck,
  Package,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR } from "../lib/dateUtils";
import { format, subDays } from "date-fns";

export default function Purchases() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState("Pendente");
  const [dueDate, setDueDate] = useState(formatBR(subDays(getNowBR(), -30), 'yyyy-MM-dd'));
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = hasPermission('inventory.manage');

  

  const currentCompanyId = user?.company_id || api.getCompanyId();

  const { data: productsData = [] } = useQuery({ 
    queryKey: ["products", currentCompanyId], 
    queryFn: () => api.get("products", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: suppliersData = [] } = useQuery({ 
    queryKey: ["suppliers", currentCompanyId], 
    queryFn: () => api.get("suppliers", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: bankAccountsData = [] } = useQuery({ 
    queryKey: ["bankAccounts", currentCompanyId], 
    queryFn: () => api.get("bankAccounts", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: cashiersData = [] } = useQuery({ 
    queryKey: ["cashiers", currentCompanyId], 
    queryFn: () => api.get("cashiers", currentCompanyId ? { company_id: currentCompanyId } : {}),
    enabled: !!currentCompanyId
  });
  const { data: company } = useQuery({
    queryKey: ["company", currentCompanyId],
    queryFn: () => api.get(`companies/${currentCompanyId}`),
    enabled: !!currentCompanyId
  });

  const products = useMemo(() => {
    if (!currentCompanyId) return productsData;
    return productsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [productsData, currentCompanyId]);

  const suppliers = useMemo(() => {
    if (!currentCompanyId) return suppliersData;
    return suppliersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [suppliersData, currentCompanyId]);

  const bankAccounts = useMemo(() => {
    if (!currentCompanyId) return bankAccountsData;
    return bankAccountsData.filter((item: any) => item.company_id === currentCompanyId);
  }, [bankAccountsData, currentCompanyId]);

  const cashiers = useMemo(() => {
    if (!currentCompanyId) return cashiersData;
    return cashiersData.filter((item: any) => item.company_id === currentCompanyId);
  }, [cashiersData, currentCompanyId]);

  const filteredProducts = products.filter((p: any) => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = useMemo(() => cart.reduce((acc, item) => acc + ((item.cost || 0) * item.quantity), 0), [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, cost: product.cost || 0, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const updateCost = (id: string, cost: number) => {
    if (cost < 0) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, cost: cost } : item));
  };

  const finalizePurchase = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier) throw new Error("Selecione um fornecedor");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (paymentStatus === "Pago" && !selectedAccount) throw new Error("Selecione uma conta para pagamento");

      const fiscalOperation: FiscalOperation = {
        type: 'purchase',
        origin_state: selectedSupplier.address_state || 'SP',
        dest_state: company?.state || 'SP',
        is_consumer: false,
        is_contributor: true,
        regime: company?.regime_tributario === "3" ? 'normal' : 'simples',
        finality: 'revenda'
      };

      const itemsWithTaxes = cart.map(item => {
        const cfop = fiscal.getCFOP(fiscalOperation, 'product');
        const taxes = fiscal.calculateTaxes(item.cost * item.quantity, {
          icms_rate: item.icms_rate || 0,
          ipi_rate: item.ipi_rate || 0,
          pis_rate: item.pis_rate || 0,
          cofins_rate: item.cofins_rate || 0,
          iss_rate: 0,
          ncm: item.ncm,
          cest: item.cest
        }, fiscalOperation);

        return {
          ...item,
          cfop,
          taxes
        };
      });

      const totalTaxes = itemsWithTaxes.reduce((acc, item) => acc + item.taxes.total_taxes, 0);

      const purchaseData = {
        company_id: user?.company_id,
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        items: itemsWithTaxes,
        total,
        total_taxes: totalTaxes,
        payment_status: paymentStatus,
        ...(paymentStatus === "Pendente" ? { due_date: dueDate } : {}),
        ...(selectedAccount?.type === 'bank' ? { bank_account_id: selectedAccount.id } : {}),
        ...(selectedAccount?.type === 'cashier' ? { cashier_id: selectedAccount.id } : {}),
        status: "Concluída",
        purchase_date: new Date().toISOString()
      };

      const purchase = await inventory.processPurchase(purchaseData, itemsWithTaxes);
      
      return purchase;
    },
    onSuccess: () => {
      setCart([]);
      setSelectedSupplier(null);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      toast.success("Compra registrada com sucesso!");
    },
    onError: async (err: any, variables, context) => {
      console.warn("Falha ao salvar compra online, acionando offline fallback", err);
      if (!navigator.onLine || err.message?.includes('offline') || err.message?.includes('Failed to fetch')) {
         
         const fiscalOperation: FiscalOperation = {
           type: 'purchase',
           origin_state: selectedSupplier.address_state || 'SP',
           dest_state: company?.state || 'SP',
           is_consumer: false,
           is_contributor: true,
           regime: company?.regime_tributario === "3" ? 'normal' : 'simples',
           finality: 'revenda'
         };

         const itemsWithTaxes = cart.map(item => {
           const cfop = fiscal.getCFOP(fiscalOperation, 'product');
           const taxes = fiscal.calculateTaxes(item.cost * item.quantity, {
             icms_rate: item.icms_rate || 0,
             ipi_rate: item.ipi_rate || 0,
             pis_rate: item.pis_rate || 0,
             cofins_rate: item.cofins_rate || 0,
             iss_rate: 0,
             ncm: item.ncm,
             cest: item.cest
           }, fiscalOperation);
           return { ...item, cfop, taxes };
         });

         const totalTaxes = itemsWithTaxes.reduce((acc, item) => acc + item.taxes.total_taxes, 0);

         const purchaseDataOffline = {
           company_id: user?.company_id,
           supplier_id: selectedSupplier.id,
           supplier_name: selectedSupplier.name,
           items: itemsWithTaxes,
           total,
           total_taxes: totalTaxes,
           payment_status: paymentStatus,
           ...(paymentStatus === "Pendente" ? { due_date: dueDate } : {}),
           ...(selectedAccount?.type === 'bank' ? { bank_account_id: selectedAccount.id } : {}),
           ...(selectedAccount?.type === 'cashier' ? { cashier_id: selectedAccount.id } : {}),
           status: "Concluída",
           purchase_date: new Date().toISOString()
         };

         const { offlineStore } = await import('../lib/offlineStore');
         await offlineStore.savePurchase(purchaseDataOffline, itemsWithTaxes);
         
         setCart([]);
         setSelectedSupplier(null);
      } else {
         toast.error(err.message);
      }
    }
  });

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Truck size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para realizar compras. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-600 text-white rounded-lg">
            <Truck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Compras (Entrada de Estoque)</h1>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Truck size={16} /> Fornecedor *
          </label>
          <select 
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setSelectedSupplier(suppliers.find((s: any) => s.id === e.target.value))}
            value={selectedSupplier?.id || ""}
          >
            <option value="">Selecione um fornecedor...</option>
            {suppliers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Adicionar Produtos</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredProducts.map((p: any) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50 transition-all text-left group"
              >
                <div>
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">Custo: R$ {p.cost?.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Plus size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="font-bold text-lg mb-4">Itens da Compra</h2>
          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum item adicionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Custo: R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-20 px-2 py-0.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-orange-500"
                        value={item.cost ?? 0}
                        onChange={(e) => updateCost(item.id, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded-md text-gray-500">-</button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded-md text-gray-500">+</button>
                    </div>
                    <p className="w-24 text-right font-bold text-gray-900">R$ {(item.cost * item.quantity).toLocaleString()}</p>
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

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 sticky top-8">
          <h2 className="font-bold text-xl">Resumo da Compra</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Status do Pagamento</label>
              <select 
                className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="Pendente">Pendente (Gera Conta a Pagar)</option>
                <option value="Pago">Pago à Vista</option>
              </select>
            </div>

            {paymentStatus === "Pendente" && (
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

            {paymentStatus === "Pago" && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Conta de Pagamento *</label>
                <select 
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedAccount(null);
                      return;
                    }
                    const [type, id] = e.target.value.split(':');
                    setSelectedAccount({ type, id });
                  }}
                  value={selectedAccount ? `${selectedAccount.type}:${selectedAccount.id}` : ""}
                >
                  <option value="">Selecione uma conta...</option>
                  <optgroup label="Contas Bancárias">
                    {bankAccounts.map((a: any) => (
                      <option key={a.id} value={`bank:${a.id}`}>{a.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Caixas">
                    {cashiers.filter((c: any) => c.status === "Aberto").map((c: any) => (
                      <option key={c.id} value={`cashier:${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex justify-between text-2xl font-bold text-gray-900">
              <span>Total</span>
              <span className="text-orange-600">R$ {total.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={() => finalizePurchase.mutate()}
            disabled={finalizePurchase.isPending}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"
          >
            <CheckCircle2 size={24} />
            {finalizePurchase.isPending ? "Processando..." : "Confirmar Compra"}
          </button>
        </div>
      </div>
    </div>
  );
}
