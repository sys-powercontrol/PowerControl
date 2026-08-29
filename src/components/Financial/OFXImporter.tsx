import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { 
  X, 
  Upload, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft,
  ArrowRightLeft,
  Check,
  Zap,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "../../lib/dateUtils";
import { formatCurrency } from "../../lib/currencyUtils";

// Custom browser-safe OFX Parser to avoid Node.js external dependencies warnings/errors
function parseOFX(ofxContent: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  
  // Find all <STMTTRN>...</STMTTRN> blocks or <STMTTRN> tags
  // OFX files can be standard SGML (unclosed tags) or XML (closed tags)
  const chunks = ofxContent.split(/<STMTTRN>/i);
  
  // The first chunk is before any <STMTTRN>, so we skip it.
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // We want to extract: TRNTYPE, DTPOSTED, TRNAMT, FITID, MEMO, NAME
    const trntype = getTagValue(chunk, "TRNTYPE");
    const dtposted = getTagValue(chunk, "DTPOSTED");
    const trnamt = getTagValue(chunk, "TRNAMT");
    const fitid = getTagValue(chunk, "FITID");
    const memo = getTagValue(chunk, "MEMO");
    const name = getTagValue(chunk, "NAME");
    
    if (dtposted && trnamt) {
      // OFX date format: YYYYMMDDHHMMSS
      const year = dtposted.substring(0, 4) || new Date().getFullYear().toString();
      const month = dtposted.substring(4, 6) || "01";
      const day = dtposted.substring(6, 8) || "01";
      const isoDate = `${year}-${month}-${day}T12:00:00Z`;
      
      const amt = parseFloat(trnamt.replace(",", ".")); // Handle comma if any
      
      transactions.push({
        id: fitid || Math.random().toString(36).substring(2, 11),
        type: (trntype || "").toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
        date: isoDate,
        amount: isNaN(amt) ? 0 : amt,
        memo: memo || name || "Transação sem descrição",
        fitid: fitid || ""
      });
    }
  }
  
  return transactions;
}

function getTagValue(chunk: string, tagName: string): string {
  // Matches <TAGNAME>VALUE with optional closing tag </TAGNAME> or newline or next tag start <
  const regex = new RegExp(`<${tagName}>([^<\r\n]*)`, "i");
  const match = chunk.match(regex);
  if (match && match[1]) {
    // Some OFX files have closing tags like <MEMO>TEXT</MEMO>
    let value = match[1].trim();
    const closeTagRegex = new RegExp(`</${tagName}>`, "i");
    if (closeTagRegex.test(value)) {
      value = value.split(closeTagRegex)[0].trim();
    }
    return value;
  }
  return "";
}

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

  // Quick Launch state
  const [quickLaunchTx, setQuickLaunchTx] = useState<OFXTransaction | null>(null);
  const [quickLaunchData, setQuickLaunchData] = useState({
    description: "",
    amount: 0,
    due_date: "",
    category_id: "",
    supplier_id: "",
    client_id: ""
  });

  // Fetch categories, suppliers, clients for quick launch
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", currentCompanyId],
    queryFn: () => api.get("categories"),
    enabled: !!quickLaunchTx
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", currentCompanyId],
    queryFn: () => api.get("suppliers"),
    enabled: !!quickLaunchTx
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentCompanyId],
    queryFn: () => api.get("clients"),
    enabled: !!quickLaunchTx
  });

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
      
      const memo = (t.memo || "").toLowerCase();
      const pattern = (r.pattern || "").toLowerCase();

      if (r.type === 'EXACT') return memo === pattern;
      if (r.type === 'CONTAINS') return memo.includes(pattern);
      if (r.type === 'REGEX') {
        try {
          return new RegExp(pattern, 'i').test(memo);
        } catch {
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

      // Amount match (ScoreValor: 50%)
      if (Math.abs(e.amount) === Math.abs(t.amount)) {
        score += 50;
        reasons.push("Valor idêntico");
      } else if (Math.abs(Math.abs(e.amount) - Math.abs(t.amount)) < 0.05) {
        score += 25;
        reasons.push("Valor aproximado");
      }

      // Date match (ScoreData: 30%)
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

      // Description match (ScoreDescrição: 20%)
      const similarity = getStringSimilarity(t.memo, e.description || e.supplier || e.client || "");
      if (similarity > 0.8) {
        score += 20;
        reasons.push("Descrição idêntica/similar");
      } else if (similarity > 0.4) {
        score += 10;
        reasons.push("Descrição parcialmente similar");
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
      const { processAccountPayment, processAccountReceipt } = await import("../../lib/finance");
      
      for (const t of toImport) {
        const isExpense = t.type === "DEBIT";
        const endpoint = isExpense ? "accountsPayable" : "accountsReceivable";
        
        // Check manual match first
        const manualMatch = manualMatches[t.id];
        let match = manualMatch;

        if (!match) {
          const existing = isExpense ? payables : receivables;
          const result = findBestMatch(t, existing);
          if (result && result.score >= 50) {
            match = result.match;
          }
        }

        if (match) {
          // Process payment/receipt to update bank account balance and register movement
          try {
            if (isExpense) {
              await processAccountPayment(match.id, { ...match, amount: Math.abs(t.amount) }, { type: 'bank', id: bankAccountId });
            } else {
              await processAccountReceipt(match.id, { ...match, amount: Math.abs(t.amount) }, { type: 'bank', id: bankAccountId });
            }
          } catch (err) {
            console.warn("Conta já baixada ou erro ao processar fluxo financeiro:", err);
          }

          // Update existing to Reconciled
          await api.put(endpoint, match.id, {
            status: isExpense ? "Pago" : "Recebido",
            reconciled: true,
            reconciliation_date: new Date().toISOString(),
            [isExpense ? "payment_date" : "receipt_date"]: t.date,
            bank_account_id: bankAccountId,
            ofx_fitid: t.fitid || t.id
          });
        } else {
          // Check for rule to pre-fill metadata
          const matchingRule = rules.find((r: any) => {
            if (r.target_type !== (isExpense ? 'PAYABLE' : 'RECEIVABLE')) return false;
            const memo = (t.memo || "").toLowerCase();
            const pattern = (r.pattern || "").toLowerCase();
            if (r.type === 'EXACT') return memo === pattern;
            if (r.type === 'CONTAINS') return memo.includes(pattern);
            return false;
          });

          // Create new entry marked as Paid and Reconciled
          const createdAcc = await api.post(endpoint, {
            company_id: currentCompanyId,
            description: `OFX: ${t.memo}`,
            amount: Math.abs(t.amount),
            due_date: t.date,
            [isExpense ? "payment_date" : "receipt_date"]: t.date,
            status: isExpense ? "Pago" : "Recebido",
            reconciled: true,
            reconciliation_date: new Date().toISOString(),
            bank_account_id: bankAccountId,
            ofx_fitid: t.fitid || t.id,
            category_id: matchingRule?.category_id || null,
            supplier_id: matchingRule?.supplier_id || null,
            client_id: matchingRule?.client_id || null,
            created_at: new Date().toISOString()
          });

          if (createdAcc && createdAcc.id) {
            try {
              if (isExpense) {
                await processAccountPayment(createdAcc.id, createdAcc, { type: 'bank', id: bankAccountId });
              } else {
                await processAccountReceipt(createdAcc.id, createdAcc, { type: 'bank', id: bankAccountId });
              }
            } catch (err) {
              console.warn("Erro ao atualizar saldo da conta bancária:", err);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Importação e conciliação concluídas!");
      onClose();
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name?.toLowerCase().endsWith(".ofx")) {
      toast.error("Por favor, selecione um arquivo .ofx válido.");
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const parsedTransactions = parseOFX(text);
      
      if (parsedTransactions.length === 0) {
        toast.info("Nenhuma transação encontrada no período deste extrato.");
        setTransactions([]);
        return;
      }
      
      const isReconciled = (t: OFXTransaction) => {
        const tId = t.fitid || t.id;
        return payables.some((p: any) => p.ofx_fitid === tId || (p.ofx_fitid && (p.ofx_fitid === t.fitid || p.ofx_fitid === t.id))) ||
               receivables.some((r: any) => r.ofx_fitid === tId || (r.ofx_fitid && (r.ofx_fitid === t.fitid || r.ofx_fitid === t.id)));
      };

      setTransactions(parsedTransactions);
      const availableToImport = parsedTransactions.filter(t => !isReconciled(t));
      const alreadyReconciledCount = parsedTransactions.length - availableToImport.length;

      setSelectedTransactions(new Set(availableToImport.map(t => t.id)));
      
      if (alreadyReconciledCount > 0) {
        toast.info(`${parsedTransactions.length} transações lidas (${alreadyReconciledCount} já conciliadas anteriormente e desmarcadas).`);
      } else {
        toast.success(`${parsedTransactions.length} transações encontradas.`);
      }
    } catch (error) {
      console.error("Error parsing OFX:", error);
      toast.error("Erro ao processar o arquivo OFX. Verifique se o formato está correto.");
    } finally {
      setIsParsing(false);
    }
  };

  const isTxAlreadyReconciled = (t: OFXTransaction) => {
    const tId = t.fitid || t.id;
    return payables.some((p: any) => p.ofx_fitid === tId || (p.ofx_fitid && (p.ofx_fitid === t.fitid || p.ofx_fitid === t.id))) ||
           receivables.some((r: any) => r.ofx_fitid === tId || (r.ofx_fitid && (r.ofx_fitid === t.fitid || r.ofx_fitid === t.id)));
  };

  const toggleTransaction = (id: string) => {
    const targetTx = transactions.find(t => t.id === id);
    if (targetTx && isTxAlreadyReconciled(targetTx)) {
      toast.info("Esta transação já foi conciliada anteriormente.");
      return;
    }
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    const importableTransactions = transactions.filter(t => !isTxAlreadyReconciled(t));
    if (selectedTransactions.size === importableTransactions.length && importableTransactions.length > 0) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(importableTransactions.map(t => t.id)));
    }
  };

  const handleManualMatch = (transactionId: string, match: any) => {
    setManualMatches(prev => ({ ...prev, [transactionId]: match }));
    setIsManualMatching(null);
    setIsSavingRule(transactionId); // Ask to save rule after manual match
    toast.success("Vínculo manual estabelecido!");
  };

  const openQuickLaunch = (t: OFXTransaction) => {
    setQuickLaunchTx(t);
    setQuickLaunchData({
      description: t.memo,
      amount: Math.abs(t.amount || 0),
      due_date: t.date ? t.date.split("T")[0] : new Date().toISOString().split("T")[0],
      category_id: "",
      supplier_id: "",
      client_id: ""
    });
  };

  const quickLaunchMutation = useMutation({
    mutationFn: async () => {
      if (!quickLaunchTx) return;
      const isExpense = quickLaunchTx.type === "DEBIT";
      const endpoint = isExpense ? "accountsPayable" : "accountsReceivable";
      const { processAccountPayment, processAccountReceipt } = await import("../../lib/finance");

      const createdAcc = await api.post(endpoint, {
        company_id: currentCompanyId,
        description: quickLaunchData.description || quickLaunchTx.memo,
        amount: Number(quickLaunchData.amount) || Math.abs(quickLaunchTx.amount),
        due_date: quickLaunchData.due_date || quickLaunchTx.date,
        [isExpense ? "payment_date" : "receipt_date"]: quickLaunchData.due_date || quickLaunchTx.date,
        status: isExpense ? "Pago" : "Recebido",
        reconciled: true,
        reconciliation_date: new Date().toISOString(),
        bank_account_id: bankAccountId,
        ofx_fitid: quickLaunchTx.fitid || quickLaunchTx.id,
        category_id: quickLaunchData.category_id || null,
        supplier_id: isExpense ? (quickLaunchData.supplier_id || null) : null,
        client_id: !isExpense ? (quickLaunchData.client_id || null) : null,
        created_at: new Date().toISOString()
      });

      if (createdAcc && createdAcc.id) {
        const docId = String(createdAcc.id);
        if (isExpense) {
          await processAccountPayment(docId, createdAcc, { type: 'bank', id: bankAccountId });
        } else {
          await processAccountReceipt(docId, createdAcc, { type: 'bank', id: bankAccountId });
        }
      }

      setManualMatches(prev => ({ ...prev, [quickLaunchTx.id]: createdAcc }));
      setSelectedTransactions(prev => {
        const next = new Set(prev);
        next.add(quickLaunchTx.id);
        return next;
      });
      return createdAcc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Lançamento criado e conciliado no ERP com sucesso!");
      const txId = quickLaunchTx?.id;
      setQuickLaunchTx(null);
      if (txId) {
        setIsSavingRule(txId);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar lançamento rápido.");
    }
  });

  const handleAutoReconcileHighConfidence = () => {
    const highConfidenceIds: string[] = [];
    transactions.forEach((t) => {
      if (isTxAlreadyReconciled(t)) return;
      const isExpense = t.type === "DEBIT";
      const existing = isExpense ? payables : receivables;
      const manual = manualMatches[t.id];
      if (manual) {
        highConfidenceIds.push(t.id);
        return;
      }
      const matchRes = findBestMatch(t, existing);
      if (matchRes && matchRes.score >= 90) {
        highConfidenceIds.push(t.id);
      }
    });

    if (highConfidenceIds.length === 0) {
      toast.info("Nenhuma transação com correspondência de alta certeza (≥ 90%) pendente de conciliação.");
      return;
    }

    setSelectedTransactions(new Set(highConfidenceIds));
    importMutation.mutate(highConfidenceIds);
    toast.success(`${highConfidenceIds.length} transações conciliadas automaticamente com sucesso!`);
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
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4">
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAutoReconcileHighConfidence}
                    disabled={importMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                    title="Conciliar automaticamente todas as transações com correspondência confiável (≥90%)"
                  >
                    <Zap size={14} className="text-amber-600 fill-amber-500" />
                    Auto Conciliar (≥90%)
                  </button>
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
              </div>

              <div className="space-y-3">
                {transactions.map((t) => {
                  const isExpense = t.type === "DEBIT";
                  const existing = isExpense ? payables : receivables;
                  const alreadyReconciled = isTxAlreadyReconciled(t);
                  
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
                        alreadyReconciled
                          ? "border-emerald-200 bg-emerald-50/20 opacity-80"
                          : selectedTransactions.has(t.id) 
                            ? "border-blue-200 bg-blue-50/30" 
                            : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div 
                        onClick={() => !alreadyReconciled && toggleTransaction(t.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          alreadyReconciled
                            ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                            : selectedTransactions.has(t.id) 
                              ? "bg-blue-600 border-blue-600 text-white cursor-pointer" 
                              : "border-gray-200 cursor-pointer"
                        }`}
                      >
                        {(selectedTransactions.has(t.id) || alreadyReconciled) && <Check size={14} />}
                      </div>

                      <div className={`p-3 rounded-xl ${alreadyReconciled ? "bg-emerald-100 text-emerald-700" : isExpense ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {isExpense ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 truncate">{t.memo}</h4>
                          {alreadyReconciled ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={10} /> Já Conciliado
                            </span>
                          ) : matchResult && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              manualMatch 
                                ? "bg-blue-100 text-blue-700 border border-blue-200" 
                                : score >= 80 
                                  ? "bg-green-100 text-green-700 border border-green-200" 
                                  : score >= 50
                                    ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                              <CheckCircle2 size={10} /> 
                              {manualMatch 
                                ? "Vínculo Manual (100%)" 
                                : score >= 80 
                                  ? `Match Alto (${score}%)` 
                                  : score >= 50
                                    ? `Match Médio (${score}%)`
                                    : `Match Baixo (${score}%)`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{formatBR(t.date)}</span>
                          <span>•</span>
                          <span>ID: {t.fitid}</span>
                          {alreadyReconciled ? (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">Processado no ERP</span>
                            </>
                          ) : matchResult && !manualMatch ? (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">{matchResult.reason}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-6">
                        <div className="min-w-[120px]">
                          <p className={`text-lg font-bold ${isExpense ? "text-red-600" : "text-green-600"}`}>
                            {isExpense ? "-" : "+"} {formatCurrency(Math.abs(t.amount || 0))}
                          </p>
                          {match && (
                            <p className="text-[10px] text-gray-400 italic truncate max-w-[150px]">
                              {match.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 items-end">
                          {alreadyReconciled ? (
                            <span className="text-[10px] font-bold text-gray-400">Importação Bloqueada</span>
                          ) : match ? (
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
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => openQuickLaunch(t)}
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                title="Criar novo lançamento financeiro direto do extrato"
                              >
                                <PlusCircle size={11} /> Lançar no ERP
                              </button>
                              <button 
                                onClick={() => setIsManualMatching(t.id)}
                                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ArrowRightLeft size={10} /> Vincular
                              </button>
                            </div>
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
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsManualMatching(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold">Vincular Lançamento Manualmente</h3>
              <button onClick={() => setIsManualMatching(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Transação do Extrato</p>
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-900">{transactions.find(t => t.id === isManualMatching)?.memo}</p>
                  <p className="font-bold text-blue-600">{formatCurrency(Math.abs(transactions.find(t => t.id === isManualMatching)?.amount || 0))}</p>
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
                          <p className="font-bold text-gray-900">{formatCurrency(e.amount || 0)}</p>
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

      {/* Quick Launch Modal */}
      {quickLaunchTx && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQuickLaunchTx(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Lançar no ERP ({quickLaunchTx.type === "DEBIT" ? "Conta a Pagar" : "Conta a Receber"})
                </h3>
                <p className="text-xs text-gray-500">Cria o lançamento e já realiza a baixa e conciliação bancária.</p>
              </div>
              <button onClick={() => setQuickLaunchTx(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Descrição *</label>
                <input 
                  type="text"
                  value={quickLaunchData.description}
                  onChange={(e) => setQuickLaunchData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  placeholder="Descrição do lançamento..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={quickLaunchData.amount}
                    onChange={(e) => setQuickLaunchData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Data *</label>
                  <input 
                    type="date"
                    value={quickLaunchData.due_date}
                    onChange={(e) => setQuickLaunchData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                <select
                  value={quickLaunchData.category_id}
                  onChange={(e) => setQuickLaunchData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {quickLaunchTx.type === "DEBIT" ? (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Fornecedor (Opcional)</label>
                  <select
                    value={quickLaunchData.supplier_id}
                    onChange={(e) => setQuickLaunchData(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Cliente (Opcional)</label>
                  <select
                    value={quickLaunchData.client_id}
                    onChange={(e) => setQuickLaunchData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map((cl: any) => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setQuickLaunchTx(null)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => quickLaunchMutation.mutate()}
                disabled={quickLaunchMutation.isPending || !quickLaunchData.description}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-200 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                {quickLaunchMutation.isPending ? "Criando..." : "Lançar e Conciliar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Rule Modal */}
      {isSavingRule && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSavingRule(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center space-y-6 max-h-[90vh] overflow-y-auto">
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
