import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCode, 
  X, 
  Copy, 
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface PixDynamicGeneratorProps {
  amount: number;
  pixKey: string;
  companyName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function PixDynamicGenerator({ amount, pixKey, companyName, onSuccess, onClose }: PixDynamicGeneratorProps) {
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED">("PENDING");

  const copyPayload = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      toast.success("Chave PIX copiada!");
    }
  };

  const handleManualConfirm = () => {
    setStatus("CONFIRMED");
    toast.success("Recebimento confirmado manualmente!");
    setTimeout(onSuccess, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start absolute top-4 right-4">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

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
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
              <QrCode size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pagamento via PIX</h2>
              <p className="text-sm text-gray-500">Escaneie o código abaixo para pagar</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-purple-50 inline-block shadow-inner">
              <QRCodeSVG value={pixKey || ""} size={200} />
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">R$ {amount.toLocaleString()}</div>
              <div className="text-sm text-gray-500 font-medium">
                Chave: <span className="text-purple-600 font-bold">{pixKey}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={copyPayload}
                className="w-full py-3 bg-purple-50 text-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
              >
                <Copy size={18} />
                Copiar Chave PIX
              </button>
              
              <button 
                onClick={handleManualConfirm}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <CheckCircle2 size={20} />
                Confirmar Recebimento
              </button>

              <p className="text-[10px] text-gray-400">
                Após receber o pagamento no seu banco, clique no botão acima para finalizar a venda.
              </p>
            </div>
          </>
        )}

        {/* Decorative background element */}
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-50 rounded-full -z-10" />
      </div>
    </div>
  );
}
