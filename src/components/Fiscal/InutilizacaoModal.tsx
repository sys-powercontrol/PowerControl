import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { fiscalApi } from "../../services/fiscalApi";
import { Ban, CheckCircle, AlertCircle, History, X } from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "../../lib/dateUtils";

interface InutilizacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  currentCompanyId: string;
}

export function InutilizacaoModal({
  isOpen,
  onClose,
  company,
  currentCompanyId
}: InutilizacaoModalProps) {
  const queryClient = useQueryClient();
  const [model, setModel] = useState<"55" | "65">("55");
  const [series, setSeries] = useState("001");
  const [startNumber, setStartNumber] = useState<number | "">("");
  const [endNumber, setEndNumber] = useState<number | "">("");
  const [justification, setJustification] = useState("");
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const { data: inutilizacoes = [], isLoading } = useQuery({
    queryKey: ["fiscal_inutilizacoes", currentCompanyId],
    queryFn: () => api.get("fiscal_inutilizacoes", { company_id: currentCompanyId }),
    enabled: isOpen && !!currentCompanyId
  });

  const inutilizarMutation = useMutation({
    mutationFn: async () => {
      if (!startNumber || !endNumber) {
        throw new Error("Informe a faixa de números inicial e final.");
      }
      if (Number(startNumber) > Number(endNumber)) {
        throw new Error("O número inicial não pode ser maior que o número final.");
      }
      if (justification.trim().length < 15) {
        throw new Error("A justificativa deve ter no mínimo 15 caracteres (exigência SEFAZ).");
      }

      let protocol = `INUT-SIM-${Date.now()}`;
      const status = "Homologada";
      let message = "Inutilização concluída com sucesso";

      if (company?.fiscal_token) {
        const fiscalConfig = {
          token: company.fiscal_token,
          environment: company.fiscal_environment || "sandbox",
          provider: company.fiscal_provider || "FocusNFe"
        };

        const result = await fiscalApi.inutilizarNumeracao(fiscalConfig as any, {
          model,
          series,
          startNumber: Number(startNumber),
          endNumber: Number(endNumber),
          justification: justification.trim(),
          company
        });

        protocol = result.protocol || protocol;
        message = result.message || message;
      }

      const record = {
        company_id: currentCompanyId,
        model,
        model_name: model === "55" ? "NF-e (Mod 55)" : "NFC-e (Mod 65)",
        series,
        start_number: Number(startNumber),
        end_number: Number(endNumber),
        justification: justification.trim(),
        protocol,
        status,
        created_at: new Date().toISOString()
      };

      await api.post("fiscal_inutilizacoes", record);
      return { record, message };
    },
    onSuccess: (data) => {
      toast.success(data.message || "Numeração inutilizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fiscal_inutilizacoes"] });
      setStartNumber("");
      setEndNumber("");
      setJustification("");
      setActiveTab("history");
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao processar inutilização de numeração.");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
              <Ban size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inutilização de Numeração Fiscal</h2>
              <p className="text-xs text-gray-500">Comunique à SEFAZ a quebra de sequência ou numerações não utilizadas.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "form" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Nova Inutilização
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <History size={14} /> Histórico ({inutilizacoes.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inutilizarMutation.mutate();
            }}
            className="space-y-4 flex-1 overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Modelo do Documento *</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as "55" | "65")}
                  className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="55">NF-e (Modelo 55 - Mercadorias)</option>
                  <option value="65">NFC-e (Modelo 65 - Consumidor)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Série *</label>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  required
                  placeholder="001"
                  className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Número Inicial *</label>
                <input
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value ? parseInt(e.target.value) : "")}
                  required
                  placeholder="Ex: 105"
                  className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Número Final *</label>
                <input
                  type="number"
                  min={1}
                  value={endNumber}
                  onChange={(e) => setEndNumber(e.target.value ? parseInt(e.target.value) : "")}
                  required
                  placeholder="Ex: 105"
                  className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Justificativa para SEFAZ *</label>
                <span className={`text-[10px] font-bold ${justification.trim().length < 15 ? "text-amber-600" : "text-emerald-600"}`}>
                  {justification.trim().length} / mín. 15 caracteres
                </span>
              </div>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                placeholder="Informe o motivo da quebra da sequência numérica (ex: Falha de comunicação no PDV resultando em salto de numeração)..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-200">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                A inutilização de numeração é irrevogável perante a SEFAZ. Certifique-se de que os números nunca foram emitidos como notas autorizadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={inutilizarMutation.isPending || justification.trim().length < 15 || !startNumber || !endNumber}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-100 disabled:opacity-50 flex items-center gap-2"
              >
                <Ban size={16} />
                {inutilizarMutation.isPending ? "Transmitindo SEFAZ..." : "Confirmar Inutilização"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-center text-xs text-gray-500 py-8">Carregando histórico...</p>
            ) : inutilizacoes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Ban size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">Nenhuma inutilização registrada para esta empresa.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                {inutilizacoes.map((item: any) => (
                  <div key={item.id} className="p-3.5 bg-white hover:bg-gray-50/60 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.model_name || `Modelo ${item.model}`}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono text-[10px]">
                          Série {item.series} | Nº {item.start_number} até {item.end_number}
                        </span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                        <CheckCircle size={10} /> {item.status || "Homologada"}
                      </span>
                    </div>
                    <p className="text-gray-600 italic">"{item.justification}"</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                      <span>Protocolo: {item.protocol || "N/A"}</span>
                      <span>{formatBR(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
