import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  ArrowRightLeft,
  Search,
  Plus,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { parse } from "ofx-js";
import { formatBR } from "../../lib/dateUtils";

interface OFXTransaction {
  id: string;
  type: "DEBIT" | "CREDIT";
  date: string;
  amount: number;
  memo: string;
  fitid: string;
}

interface MatchResult {
  match: any;
  score: number;
  reason: string;
  isRuleMatch?: boolean;
}

// Common bank noise to remove for better matching
const BANK_NOISE = [
  'DOC', 'TED', 'PIX', 'PAGTO', 'TRANSF', 'DEPOSITO', 'SAQUE', 'TAR', 'TARIFA',
  'CH', 'CHEQUE', 'LIQ', 'LIQUIDACAO', 'EST', 'ESTORNO', 'REF', 'REFERENTE',
  'CONV', 'CONVENIO', 'COB', 'COBRANCA', 'PG', 'PAG', 'PAGAMENTO'
];

function normalizeDescription(str: string): string {
  let normalized = str.toUpperCase();
  
  // Remove noise words
  BANK_NOISE.forEach(noise => {
    const regex = new RegExp(`\\b${noise}\\b`, 'g');
    normalized = normalized.replace(regex, '');
  });

  // Remove special characters and extra spaces
  return normalized.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// Simple string similarity (Dice's Coefficient)
function getStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeDescription(str1).toLowerCase();
  const s2 = normalizeDescription(str2).toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }

  let intersect = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    if (bigrams1.has(bigram)) {
      intersect++;
    }
  }

  return (2 * intersect) / (s1.length + s2.length - 2);
}

interface OFXImporterProps {
  onClose: () => void;
  bankAccountId: string;
  bankAccountName: string;
}

export function OFXImporter({ onClose, bankAccountId, bankAccountName }: OFXImporterProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<OFXTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [manualMatches, setManualMatches] = useState<Record<string, any>>({});
  const [isManualMatching, setIsManualMatching] = useState<string | null>(null);
  const [isSavingRule, setIsSavingRule] = useState<string | null>(null);

  const currentCompanyId = api.getCompanyId();

  // Fetch rules
  const { data: rules = [] } = useQuery({
    queryKey: ["reconciliation_rules", currentCompanyId],
    queryFn: () => api.get("reconciliation_rules"),
    enabled: !!user
  });

  // Fetch existing accounts to match
  const { data: payables = [] } = useQuery({
    queryKey: ["accountsPayable", currentCompanyId],
    queryFn: () => api.get("accountsPayable"),
    enabled: transactions.length > 0
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["accountsReceivable", currentCompanyId],
    queryFn: () => api.get("accountsReceivable"),
    enabled: transactions.length > 0
  });

  const findBestMatch = (t: OFXTransaction, existing: any[]): MatchResult | null => {
    let bestMatch: MatchResult | null = null;
    const isExpense = t.type === "DEBIT";

    // 1. Check Rules first to get a "boost" or "category hint"
    const matchingRule = rules.find((r: any) => {
      if (r.target_type !== (isExpense ? 'PAYABLE' : 'RECEIVABLE')) return false;
      
      const memo = t.memo.toLowerCase();
      const pattern = r.pattern.toLowerCase();

      if (r.type === 'EXACT') return memo === pattern;
      if (r.type === 'CONTAINS') return memo.includes(pattern);
      if (r.type === 'REGEX') {
        try {
          return new RegExp(pattern, 'i').test(memo);
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    // 2. Score existing documents
    existing.forEach((e: any) => {
      if (e.status !== "Pendente") return;

      let score = 0;
      const reasons: string[] = [];

      // Amount match (Crucial - Weight: 70)
      if (Math.abs(e.amount) === Math.abs(t.amount)) {
        score += 70;
        reasons.push("Valor idêntico");
      } else if (Math.abs(Math.abs(e.amount) - Math.abs(t.amount)) < 0.05) {
        score += 40;
        reasons.push("Valor aproximado");
      }

      // Date match (Weight: 30)
      const eDate = new Date(e.due_date);
      const tDate = new Date(t.date);
      const diffDays = Math.abs(eDate.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays <= 0.5) {
        score += 30;
        reasons.push("Data idêntica");
      } else if (diffDays <= 3) {
        score += 15;
        reasons.push("Data próxima");
      } else if (diffDays <= 7) {
        score += 5;
      }

      // Description match (Weight: 40)
      const similarity = getStringSimilarity(t.memo, e.description);
      if (similarity > 0.8) {
        score += 40;
        reasons.push("Descrição muito similar");
      } else if (similarity > 0.4) {
        score += 15;
        reasons.push("Descrição similar");
      }

      // Rule match boost (Weight: 50)
      if (matchingRule) {
        // If the rule points to the same supplier/client, it's a very strong match
        const ruleMatchesEntity = 
          (matchingRule.supplier_id && e.supplier_id === matchingRule.supplier_id) ||
          (matchingRule.client_id && e.client_id === matchingRule.client_id);
          
        if (ruleMatchesEntity) {
          score += 50;
          reasons.push("Regra de correspondência");
        } else if (getStringSimilarity(t.memo, matchingRule.pattern) > 0.8) {
          score += 20;
          reasons.push("Padrão de regra");
        }
      }

      if (score > (bestMatch?.score || 30)) {
        bestMatch = {
          match: e,
          score,
          reason: reasons.join(", "),
          isRuleMatch: !!matchingRule
        };
      }
    });

    return bestMatch;
  };

  const importMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const toImport = transactions.filter(t => selectedIds.includes(t.id));
      
      for (const t of toImport) {
        const isExpense = t.type === "DEBIT";
        const endpoint = isExpense ? "accountsPayable" : "accountsReceivable";
        
        // Check manual match first
        const manualMatch = manualMatches[t.id];
        let match = manualMatch;

        if (!match) {
          const existing = isExpense ? payables : receivables;
          const result = findBestMatch(t, existing);
          if (result && result.score >= 70) {
            match = result.match;
          }
        }

        if (match) {
          // Update existing to Paid
          await api.put(endpoint, match.id, {
            status: "Pago",
            [isExpense ? "payment_date" : "receipt_date"]: t.date,
            bank_account_id: bankAccountId
          });
        } else {
          // Check for rule to pre-fill metadata
          const matchingRule = rules.find((r: any) => {
            if (r.target_type !== (isExpense ? 'PAYABLE' : 'RECEIVABLE')) return false;
            const memo = t.memo.toLowerCase();
            const pattern = r.pattern.toLowerCase();
            if (r.type === 'EXACT') return memo === pattern;
            if (r.type === 'CONTAINS') return memo.includes(pattern);
            return false;
          });

          // Create new entry
          await api.post(endpoint, {
            company_id: currentCompanyId,
            description: `OFX: ${t.memo}`,
            amount: Math.abs(t.amount),
            due_date: t.date,
            [isExpense ? "payment_date" : "receipt_date"]: t.date,
            status: "Pago",
            bank_account_id: bankAccountId,
            category_id: matchingRule?.category_id || null,
            supplier_id: matchingRule?.supplier_id || null,
            client_id: matchingRule?.client_id || null,
            created_at: new Date().toISOString()
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Importação e conciliação concluídas!");
      onClose();
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".ofx")) {
      toast.error("Por favor, selecione um arquivo .ofx válido.");
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const data = await parse(text);
      
      // Robust navigation of the OFX structure
      const ofx = data.OFX;
      if (!ofx) throw new Error("Estrutura OFX inválida");

      const bankMsg = ofx.BANKMSGSRSV1 || ofx.CREDITCARDMSGSRSV1;
      if (!bankMsg) throw new Error("Mensagens bancárias não encontradas");

      const stmtTrnRs = bankMsg.STMTTRNRS || bankMsg.CCSTMTTRNRS;
      const stmtRs = Array.isArray(stmtTrnRs) ? stmtTrnRs[0].STMTRS || stmtTrnRs[0].CCSTMTRS : stmtTrnRs.STMTRS || stmtTrnRs.CCSTMTRS;
      const tranList = stmtRs.BANKTRANLIST?.STMTTRN || stmtRs.CCBANKTRANLIST?.STMTTRN;
      
      if (!tranList) {
        toast.info("Nenhuma transação encontrada no período deste extrato.");
        setTransactions([]);
        return;
      }
      
      const parsedTransactions: OFXTransaction[] = (Array.isArray(tranList) ? tranList : [tranList]).map((t: any) => {
        // OFX date format: YYYYMMDDHHMMSS
        const dateStr = t.DTPOSTED || "";
        const year = dateStr.substring(0, 4) || new Date().getFullYear().toString();
        const month = dateStr.substring(4, 6) || "01";
        const day = dateStr.substring(6, 8) || "01";
        const isoDate = `${year}-${month}-${day}T12:00:00Z`;

        return {
          id: t.FITID || Math.random().toString(36).substr(2, 9),
          type: t.TRNTYPE,
          date: isoDate,
          amount: parseFloat(t.TRNAMT),
          memo: t.MEMO || t.NAME || "Transação sem descrição",
          fitid: t.FITID
        };
      });

      setTransactions(parsedTransactions);
      setSelectedTransactions(new Set(parsedTransactions.map(t => t.id)));
      toast.success(`${parsedTransactions.length} transações encontradas.`);
    } catch (error) {
      console.error("Error parsing OFX:", error);
      toast.error("Erro ao processar o arquivo OFX. Verifique se o formato está correto.");
    } finally {
      setIsParsing(false);
    }
  };

  const toggleTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const handleManualMatch = (transactionId: string, match: any) => {
    setManualMatches(prev => ({ ...prev, [transactionId]: match }));
    setIsManualMatching(null);
    setIsSavingRule(transactionId); // Ask to save rule after manual match
    toast.success("Vínculo manual estabelecido!");
  };

  const saveRuleMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const t = transactions.find(tr => tr.id === transactionId);
      const m = manualMatches[transactionId];
      if (!t || !m) return;

      await api.post("reconciliation_rules", {
        company_id: currentCompanyId,
        pattern: t.memo,
        type: 'CONTAINS',
        target_type: t.type === "DEBIT" ? 'PAYABLE' : 'RECEIVABLE',
        category_id: m.category_id || null,
        supplier_id: m.supplier_id || null,
        client_id: m.client_id || null,
        auto_confirm: true,
        created_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation_rules"] });
      toast.success("Regra de conciliação salva!");
      setIsSavingRule(null);
    }
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold">Importar Extrato OFX</h2>
            <p className="text-sm text-gray-500">Conciliação para: <span className="font-bold text-blue-600">{bankAccountName}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 border-2 border-dashed border-gray-100 rounded-3xl">
              <div className="p-6 bg-blue-50 text-blue-600 rounded-full">
                <Upload size={48} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Selecione o arquivo .ofx</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  Arraste o arquivo aqui ou clique no botão abaixo para selecionar o extrato do seu banco.
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".ofx" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {isParsing ? "Processando..." : "Selecionar Arquivo"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    {selectedTransactions.size === transactions.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedTransactions.size} de {transactions.length} selecionados
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setTransactions([]);
                    setManualMatches({});
                  }}
                  className="text-sm font-bold text-red-600 hover:text-red-700"
                >
                  Trocar Arquivo
                </button>
              </div>

              <div className="space-y-3">
                {transactions.map((t) => {
                  const isExpense = t.type === "DEBIT";
                  const existing = isExpense ? payables : receivables;
                  
                  // Check manual match first
                  const manualMatch = manualMatches[t.id];
                  let matchResult = manualMatch ? { match: manualMatch, score: 100, reason: "Vínculo Manual" } : null;

                  if (!matchResult) {
                    matchResult = findBestMatch(t, existing);
                  }

                  const match = matchResult?.match;
                  const score = matchResult?.score || 0;

                  return (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                        selectedTransactions.has(t.id) 
                          ? "border-blue-200 bg-blue-50/30" 
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div 
                        onClick={() => toggleTransaction(t.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          selectedTransactions.has(t.id) 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "border-gray-200"
                        }`}
                      >
                        {selectedTransactions.has(t.id) && <Check size={14} />}
                      </div>

                      <div className={`p-3 rounded-xl ${isExpense ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {isExpense ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 truncate">{t.memo}</h4>
                          {matchResult && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              manualMatch 
                                ? "bg-blue-100 text-blue-700" 
                                : score >= 80 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-yellow-100 text-yellow-700"
                            }`}>
                              <CheckCircle2 size={10} /> 
                              {manualMatch ? "Vínculo Manual" : score >= 80 ? "Conciliação Automática" : "Sugestão"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{formatBR(t.date)}</span>
                          <span>•</span>
                          <span>ID: {t.fitid}</span>
                          {matchResult && !manualMatch && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">{matchResult.reason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-6">
                        <div className="min-w-[120px]">
                          <p className={`text-lg font-bold ${isExpense ? "text-red-600" : "text-green-600"}`}>
                            {isExpense ? "-" : "+"} R$ {Math.abs(t.amount).toLocaleString()}
                          </p>
                          {match && (
                            <p className="text-[10px] text-gray-400 italic truncate max-w-[150px]">
                              {match.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {match ? (
                            <button 
                              onClick={() => setManualMatches(prev => {
                                const next = { ...prev };
                                delete next[t.id];
                                return next;
                              })}
                              className="text-[10px] font-bold text-red-500 hover:underline"
                            >
                              Remover Vínculo
                            </button>
                          ) : (
                            <button 
                              onClick={() => setIsManualMatching(t.id)}
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <ArrowRightLeft size={10} /> Vincular Manual
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => importMutation.mutate(Array.from(selectedTransactions))}
            disabled={selectedTransactions.size === 0 || importMutation.isPending}
            className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center gap-2"
          >
            {importMutation.isPending ? (
              <>Processando...</>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Confirmar Conciliação ({selectedTransactions.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Matching Modal */}
      {isManualMatching && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsManualMatching(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold">Vincular Lançamento Manualmente</h3>
              <button onClick={() => setIsManualMatching(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Transação do Extrato</p>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-900">{transactions.find(t => t.id === isManualMatching)?.memo}</p>
                  <p className="font-bold text-blue-600">R$ {Math.abs(transactions.find(t => t.id === isManualMatching)?.amount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-700">Selecione o lançamento no sistema:</p>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                  {(transactions.find(t => t.id === isManualMatching)?.type === "DEBIT" ? payables : receivables)
                    .filter((e: any) => e.status === "Pendente")
                    .map((e: any) => (
                      <button
                        key={e.id}
                        onClick={() => handleManualMatch(isManualMatching, e)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{e.description}</p>
                          <p className="text-xs text-gray-500">Vencimento: {formatBR(e.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">R$ {e.amount?.toLocaleString()}</p>
                          <p className="text-[10px] text-blue-600 font-bold uppercase">Selecionar</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Rule Modal */}
      {isSavingRule && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSavingRule(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <ArrowRightLeft size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Criar Regra de Conciliação?</h3>
              <p className="text-gray-500">
                Deseja que o sistema aprenda este vínculo? Transações futuras com a descrição 
                <span className="font-bold text-gray-900"> "{transactions.find(t => t.id === isSavingRule)?.memo}"</span> serão 
                conciliadas automaticamente.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsSavingRule(null)}
                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
              >
                Agora não
              </button>
              <button 
                onClick={() => saveRuleMutation.mutate(isSavingRule)}
                disabled={saveRuleMutation.isPending}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                {saveRuleMutation.isPending ? "Salvando..." : "Sim, Criar Regra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
