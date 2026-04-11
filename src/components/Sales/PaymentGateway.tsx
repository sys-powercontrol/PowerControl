import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCode, 
  X, 
  Copy, 
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";

interface PaymentGatewayProps {
  amount: number;
  method: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function PaymentGateway({ amount, method, onSuccess, onClose }: PaymentGatewayProps) {
  const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "CONFIRMED" | "EXPIRED" | "ERROR">("PENDING");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(method === "PIX" ? "pix" : "card");

  // Card form state
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });

  useEffect(() => {
    createPayment();
  }, [activeTab]);

  const createPayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/payments/create", {
        amount,
        method: activeTab,
        metadata: { source: "SalesPDV" }
      });
      setPaymentId(response.data.id);
      if (activeTab === "pix") {
        setQrCode(response.data.qr_code);
      }
      setStatus("PENDING");
    } catch (error) {
      console.error("Error creating payment:", error);
      setStatus("ERROR");
      toast.error("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Polling for status
  useEffect(() => {
    let interval: any;
    if (paymentId && status === "PENDING" && activeTab === "pix") {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/payments/status/${paymentId}`);
          if (response.data.status === "CONFIRMED") {
            setStatus("CONFIRMED");
            clearInterval(interval);
            setTimeout(onSuccess, 2000);
          }
        } catch (error) {
          console.error("Error checking status:", error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [paymentId, status, activeTab]);

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;

    setStatus("PROCESSING");
    try {
      await axios.post("/api/payments/confirm-card", {
        payment_id: paymentId,
        card_data: cardData
      });
      
      // Simulate polling for card confirmation
      const checkStatus = setInterval(async () => {
        const response = await axios.get(`/api/payments/status/${paymentId}`);
        if (response.data.status === "CONFIRMED") {
          setStatus("CONFIRMED");
          clearInterval(checkStatus);
          setTimeout(onSuccess, 2000);
        }
      }, 2000);

    } catch (error) {
      setStatus("ERROR");
      toast.error("Erro ao processar cartão.");
    }
  };

  const copyPix = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      toast.success("Código PIX copiado!");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 max-w-md w-full overflow-hidden"
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
                <div className="bg-white p-4 rounded-2xl border-2 border-purple-50 inline-block shadow-inner">
                  <QRCodeSVG value={qrCode || ""} size={200} />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">R$ {amount.toLocaleString()}</div>
                  <p className="text-sm text-gray-500">Escaneie o código para pagar via PIX</p>
                </div>
                <button 
                  onClick={copyPix}
                  className="w-full py-3 bg-purple-50 text-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
                >
                  <Copy size={18} /> Copiar Código PIX
                </button>
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
                  {status === "PROCESSING" ? "Processando..." : `Pagar R$ ${amount.toLocaleString()}`}
                </button>
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
