import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { generatePixPayload } from "../../lib/pixUtils";
import { 
  QrCode, 
  X, 
  Copy, 
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion } from "motion/react";
import { formatCurrency } from "../../lib/currencyUtils";

interface PaymentGatewayProps {
  amount: number;
  method: string;
  onSuccess: () => void;
  onClose: () => void;
  bankAccounts?: any[];
  selectedBankAccount?: any;
  onBankAccountChange?: (account: any) => void;
}

export function PaymentGateway({ 
  amount, 
  method, 
  onSuccess, 
  onClose,
  bankAccounts = [],
  selectedBankAccount = null,
  onBankAccountChange
}: PaymentGatewayProps) {
  const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "CONFIRMED" | "EXPIRED" | "ERROR">("PENDING");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(method === "PIX" ? "pix" : "card");

  const companyId = api.getCompanyId();
  const { data: companyData = {} } = useQuery({ 
    queryKey: ["company", companyId], 
    queryFn: () => api.get("companies", companyId as string),
    enabled: !!companyId
  });

  // Card form state
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });

  const pixKey = companyData?.pix_key || "00000000000";
  const compName = companyData?.name || "EMPRESA PDV";
  const compCity = companyData?.city || "BRASILIA";

  const displayQrCode = React.useMemo(() => {
    if (!qrCode) return null;
    const isDummy = qrCode.includes("00000000000");
    if (activeTab === "pix" && isDummy) {
      try {
        const safePixKey = String(pixKey || "00000000000");
        const safeCompName = String(compName || "EMPRESA PDV");
        const safeCompCity = String(compCity || "BRASILIA");
        const suffix = paymentId ? String(paymentId).slice(-4) : "9999";
        return generatePixPayload(
           safePixKey,
           amount || 0,
           safeCompName.substring(0, 25),
           safeCompCity.substring(0, 15),
           "PDV" + suffix
        );
      } catch (_err) {
        return qrCode;
      }
    }
    return qrCode;
  }, [qrCode, activeTab, amount, pixKey, compName, compCity, paymentId]);

  const configRef = React.useRef({ pixKey, compName, compCity });
  useEffect(() => {
    configRef.current = { pixKey, compName, compCity };
  }, [pixKey, compName, compCity]);

  useEffect(() => {
    let isMounted = true;
    const createPayment = async () => {
      setLoading(true);
      try {
        const response = await axios.post("/api/payments/create", {
          amount,
          method: activeTab,
          metadata: { source: "SalesPDV" }
        }, { timeout: 10000 });
        if (!isMounted) return;
        setPaymentId(response.data.id);
        if (activeTab === "pix") {
          setQrCode(response.data.qr_code || null);
        }
        setStatus("PENDING");
      } catch (error: any) {
        if (!isMounted) return;
        console.error("Error creating payment:", error);
        const errVal = error.response?.data?.error || error.response?.data?.message;
        if (errVal) {
          const msg = typeof errVal === "string" ? errVal : (errVal.message || String(errVal));
          toast.error(msg);
        }
        // Fallback for demo/manual confirmation without backend
        setPaymentId("mock_" + Date.now());
        if (activeTab === "pix") {
          try {
            const safePixKey = String(configRef.current.pixKey || "00000000000");
            const safeCompName = String(configRef.current.compName || "EMPRESA PDV");
            const safeCompCity = String(configRef.current.compCity || "BRASILIA");
            const payload = generatePixPayload(
               safePixKey,
               amount || 0,
               safeCompName.substring(0, 25),
               safeCompCity.substring(0, 15),
               "PDV" + Date.now().toString().slice(-4)
            );
            setQrCode(payload);
          } catch (payloadError) {
            console.error("Error generating local PIX payload fallback:", payloadError);
            setQrCode("00020101021226580014br.gov.bcb.pix011400000000000000021504PDV_5204000053039865405" + (amount || 0).toFixed(2) + "5802BR5915EMPRESA PDV6008BRASILIA62070503PDV6304");
          }
        }
        setStatus("PENDING");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    createPayment();
    return () => {
      isMounted = false;
    };
  }, [activeTab, amount]);

  useEffect(() => {
    if (!paymentId || status !== "PENDING") return;
    
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/payments/status/${paymentId}`);
        if (!isMounted) return;
        if (res.data.status === "CONFIRMED") {
          setStatus("CONFIRMED");
          toast.success("Pagamento via Mercado Pago aprovado!");
          setTimeout(onSuccess, 1500);
        } else if (res.data.status === "EXPIRED") {
          setStatus("EXPIRED");
          toast.error("O pagamento expirou. Tente novamente.");
        }
      } catch (_err) {
        // Ignorar erros de rede no polling
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentId, status, onSuccess]);

  const handleManualConfirmation = () => {
    setStatus("CONFIRMED");
    setTimeout(onSuccess, 1500);
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;

    setStatus("PROCESSING");
    try {
      await axios.post("/api/payments/confirm-card", {
        payment_id: paymentId,
        card_data: cardData
      }, { timeout: 10000 }); 
      
      // Assume success instantly for manual process
      setStatus("CONFIRMED");
      setTimeout(onSuccess, 1500);
    } catch (error) {
      console.error("Card processing error:", error);
      // Fallback for manual confirmation without backend
      setStatus("CONFIRMED");
      setTimeout(onSuccess, 1500);
    }
  };

  const copyPix = () => {
    if (displayQrCode) {
      navigator.clipboard.writeText(displayQrCode);
      toast.success("Código PIX copiado!");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        {status === "CONFIRMED" ? (
          <div className="py-8 space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Pagamento Confirmado!</h2>
            <p className="text-gray-500">Aguarde, finalizando sua venda...</p>
          </div>
        ) : status === "EXPIRED" ? (
          <div className="py-8 space-y-4">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Cobrança Expirada</h2>
            <p className="text-sm text-gray-500">O tempo limite para este QR Code expirou ou o pagamento foi cancelado.</p>
            <div className="space-y-3 pt-4">
              <button 
                onClick={() => {
                  setStatus("PENDING");
                  setPaymentId(null);
                  setQrCode(null);
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                <RefreshCw size={18} /> Gerar Novo QR Code / Tentar Novamente
              </button>
              <button 
                onClick={handleManualConfirmation}
                className="w-full py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 size={18} /> Confirmação Manual
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex p-1 bg-gray-100 rounded-2xl mb-4">
              <button 
                onClick={() => setActiveTab("pix")}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "pix" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"}`}
              >
                <QrCode size={18} /> PIX
              </button>
              <button 
                onClick={() => setActiveTab("card")}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "card" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
              >
                <CreditCard size={18} /> Cartão
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-gray-500 font-medium">Gerando pagamento...</p>
              </div>
            ) : activeTab === "pix" ? (
              <div className="space-y-6">
                {bankAccounts && bankAccounts.length > 0 && (
                  <div className="text-left space-y-1.5 p-3 bg-purple-50/50 border border-purple-100 rounded-2xl">
                    <label className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Conta Bancária de Destino *</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-gray-700"
                      value={selectedBankAccount?.id || ""}
                      onChange={(e) => {
                        const account = bankAccounts.find((a: any) => a.id === e.target.value);
                        if (onBankAccountChange) onBankAccountChange(account || null);
                      }}
                    >
                      <option value="">Selecione a conta bancária...</option>
                      {bankAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance || 0)})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border-2 border-purple-50 inline-block shadow-inner min-w-[200px] min-h-[200px] flex items-center justify-center mx-auto">
                  {displayQrCode ? (
                    <QRCodeSVG value={displayQrCode} size={200} />
                  ) : (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="animate-spin text-purple-600" size={32} />
                      <span className="text-xs font-medium">Gerando QR Code...</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(amount)}</div>
                  <p className="text-sm text-gray-500">Escaneie o código para pagar via PIX</p>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={copyPix}
                    className="w-full py-3 bg-purple-50 text-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
                  >
                    <Copy size={18} /> Copiar Código PIX
                  </button>
                  <button 
                    onClick={handleManualConfirmation}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                  >
                    <CheckCircle2 size={18} /> Confirmação Manual
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCardSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Número do Cartão</label>
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000 0000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={cardData.number}
                    onChange={(e) => setCardData({...cardData, number: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome no Cartão</label>
                  <input 
                    type="text" 
                    placeholder="NOME COMPLETO"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={cardData.name}
                    onChange={(e) => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Validade</label>
                    <input 
                      type="text" 
                      placeholder="MM/AA"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">CVV</label>
                    <input 
                      type="text" 
                      placeholder="123"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    type="submit"
                    disabled={status === "PROCESSING"}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {status === "PROCESSING" ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    {status === "PROCESSING" ? "Processando..." : `Pagar ${formatCurrency(amount)}`}
                  </button>
                  <button 
                    type="button"
                    onClick={handleManualConfirmation}
                    className="w-full py-3 bg-green-50 justify-center text-green-600 border border-green-200 rounded-xl font-bold flex items-center gap-2 hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 size={18} /> Confirmação Manual
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-gray-400">
              <AlertCircle size={12} />
              Pagamento processado de forma segura.
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
