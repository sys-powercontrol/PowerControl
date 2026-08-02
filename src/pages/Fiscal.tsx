import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { formatCurrency } from "../lib/currencyUtils";
import { 
  Plus, 
  Search, 
  Download, 
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  XCircle,
  Shield,
  ChevronRight,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import NfeStatusBadge, { NfeStatus } from "../components/NfeStatusBadge";
import DanfeViewer from "../components/DanfeViewer";
import JSZip from "jszip";
import { fiscalApi } from "../services/fiscalApi";
import ExportButton from "../components/ExportButton";

import { Link } from "react-router-dom";

function XmlDownloadButton({ invoice }: { invoice: any }) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = invoice.xml_storage_url || invoice.xml_url;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `NFe-${invoice.access_key || invoice.number}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Tentando abrir link diretamente...", { duration: 1500 });
      window.open(invoice.xml_storage_url || invoice.xml_url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isDownloading}
      className={`p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${isDownloading ? 'opacity-50' : ''}`} 
      title={invoice.xml_storage_url ? "Baixar XML (Armazenamento Seguro)" : "Baixar XML (Link Externo)"}
    >
      <Download size={18} className={isDownloading ? 'animate-bounce' : ''} />
    </button>
  );
}

export default function Fiscal() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = hasPermission('fiscal.manage');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDanfeOpen, setIsDanfeOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isExportingXmlZip, setIsExportingXmlZip] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);

  const handleSyncPendingInvoices = async () => {
    const pendingInvoices = invoices.filter(
      (i) => i.status === "Pendente" || i.status === "Aguardando" || i.status === "Processando"
    );

    if (pendingInvoices.length === 0) {
      toast.info("Nenhuma nota fiscal pendente de reprocessamento/sincronização.");
      return;
    }

    setIsSyncingPending(true);
    toast.info(`Sincronizando ${pendingInvoices.length} nota(s) pendente(s)...`);

    let updatedCount = 0;
    for (const inv of pendingInvoices) {
      try {
        await checkStatusMutation.mutateAsync(inv);
        updatedCount++;
      } catch (err) {
        console.warn(`Erro ao sincronizar nota #${inv.number}:`, err);
      }
    }

    toast.success(`Sincronização concluída! ${updatedCount} nota(s) consultada(s).`);
    setIsSyncingPending(false);
  };

  const handleExportXmlZip = async () => {
    const emittedInvoices = filteredInvoices.filter(
      (i) => (i.status === "Emitida" || i.status === "Autorizada") && (i.xml_storage_url || i.xml_url || i.xml_content)
    );

    if (emittedInvoices.length === 0) {
      toast.warning("Nenhuma nota fiscal emitida/autorizada com XML disponível para exportação no filtro atual.");
      return;
    }

    setIsExportingXmlZip(true);
    toast.info(`Compactando XMLs de ${emittedInvoices.length} nota(s)...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder("XMLs_NFe");

      let addedCount = 0;
      for (const invoice of emittedInvoices) {
        try {
          let xmlData = "";
          if (invoice.xml_content) {
            xmlData = invoice.xml_content;
          } else {
            const url = invoice.xml_storage_url || invoice.xml_url;
            const res = await fetch(url);
            xmlData = await res.text();
          }

          const fileName = `NFe_${invoice.number || invoice.id}_${invoice.access_key || "chave"}.xml`;
          folder?.file(fileName, xmlData);
          addedCount++;
        } catch (fileErr) {
          console.warn(`Erro ao obter XML da nota #${invoice.number}:`, fileErr);
        }
      }

      if (addedCount === 0) {
        throw new Error("Não foi possível carregar os arquivos XML das notas selecionadas.");
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const now = new Date();
      const monthYear = `${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getFullYear()}`;
      const downloadUrl = URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `NFe_Lote_${monthYear}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Exportação concluída! ${addedCount} arquivo(s) XML baixado(s) em ZIP.`);
    } catch (err: any) {
      console.error("Erro na exportação ZIP de XML:", err);
      toast.error(err.message || "Erro ao gerar arquivo ZIP com os XMLs.");
    } finally {
      setIsExportingXmlZip(false);
    }
  };

  const currentCompanyId = user?.company_id || api.getCompanyId();

  React.useEffect(() => {
    if (!currentCompanyId) return;
    const unsubscribe = api.subscribe("invoices", { company_id: currentCompanyId }, (data) => {
      setInvoices(data);
      setIsLoadingInvoices(false);
    });
    return () => unsubscribe();
  }, [currentCompanyId]);

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", currentCompanyId],
    queryFn: () => api.get("sales"),
    enabled: !!(currentCompanyId || canManage)
  });

  const filteredInvoices = invoices.filter((i: any) => 
    (i.number?.toString() || "").includes(searchTerm) ||
    (i.client_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const invoiceExportHeaders = {
    number: "Número",
    series: "Série",
    client_name: "Cliente",
    total_value: "Valor Total",
    status: "Status",
    created_at: "Data Emissão",
    access_key: "Chave de Acesso"
  };

  const cancelMutation = useMutation({
    mutationFn: async (invoice: any) => {
      if (!company?.fiscal_token || !invoice.reference) {
        // Fallback for simulated notes or missing config
        return api.put("invoices", invoice.id, { status: "Cancelada" });
      }

      const fiscalConfig = {
        token: company.fiscal_token,
        environment: company.fiscal_environment || "sandbox",
        provider: company.fiscal_provider || "FocusNFe"
      };

      const reason = window.prompt("Motivo do cancelamento (mínimo 15 caracteres):", "Erro na digitação dos dados da venda");
      if (!reason || reason.length < 15) {
        throw new Error("O motivo do cancelamento deve ter pelo menos 15 caracteres.");
      }

      const result = await fiscalApi.cancel(fiscalConfig as any, invoice.reference, reason);
      
      if (result.status === "sucesso" || result.status === "cancelado") {
        return api.put("invoices", invoice.id, { status: "Cancelada" });
      } else {
        throw new Error(result.message || "Erro ao cancelar nota no provedor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Nota Fiscal cancelada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao cancelar: ${error.message}`);
    }
  });

  const { data: company } = useQuery({
    queryKey: ["company", currentCompanyId],
    queryFn: () => api.get("companies", currentCompanyId),
    enabled: !!currentCompanyId
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentCompanyId],
    queryFn: () => api.get("clients"),
    enabled: !!currentCompanyId
  });

  const emitMutation = useMutation({
    mutationFn: async (data: any) => {
      const sale = sales.find((s: any) => s.id === data.sale_id);
      if (!sale) throw new Error("Venda não encontrada");

      const client = clients.find((c: any) => c.id === sale.client_id) || { name: sale.client_name };

      if (!company?.fiscal_token) {
        throw new Error("Token fiscal não configurado. Vá em Configurações > Fiscal.");
      }

      const fiscalConfig = {
        token: company.fiscal_token,
        environment: company.fiscal_environment || "sandbox",
        provider: company.fiscal_provider || "FocusNFe"
      };

      const result = await fiscalApi.emit(fiscalConfig as any, {
        sale_id: sale.id,
        type: data.type,
        client,
        items: sale.items,
        total: sale.total,
        company
      });

      return api.post("invoices", {
        ...data,
        company_id: currentCompanyId,
        number: result.protocol ? parseInt(result.protocol.slice(-6)) : Math.floor(Math.random() * 90000),
        series: "001",
        client_name: sale.client_name,
        client_document: sale.client_document || "Consumidor Final",
        total: sale.total,
        status: result.status === "processando" ? "Pendente" : "Emitida",
        emission_date: new Date().toISOString(),
        reference: result.reference,
        protocol: result.protocol,
        access_key: result.access_key
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Nota Fiscal enviada para processamento!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro na emissão: ${error.message}`);
    }
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (invoice: any) => {
      if (!company?.fiscal_token || !invoice.reference) return;

      const fiscalConfig = {
        token: company.fiscal_token,
        environment: company.fiscal_environment || "sandbox",
        provider: company.fiscal_provider || "FocusNFe"
      };

      const result = await fiscalApi.checkStatus(fiscalConfig as any, invoice.reference, invoice.type);
      
      let newStatus = invoice.status;
      let xmlStorageUrl = invoice.xml_storage_url;

      if (result.status === "autorizado") {
        newStatus = "Emitida";
        
        // Persist XML to Storage if not already done
        if (!xmlStorageUrl && result.xml_url && result.access_key) {
          try {
            xmlStorageUrl = await fiscalApi.saveXmlToStorage(
              currentCompanyId,
              result.access_key,
              result.xml_url
            );
          } catch (e) {
            console.error("Failed to persist XML:", e);
          }
        }
      }
      
      if (result.status === "erro_autorizacao") newStatus = "Erro";
      if (result.status === "cancelado") newStatus = "Cancelada";

      return api.put("invoices", invoice.id, {
        status: newStatus,
        protocol: result.protocol || invoice.protocol,
        access_key: result.access_key || invoice.access_key,
        xml_url: result.xml_url,
        xml_storage_url: xmlStorageUrl,
        pdf_url: result.pdf_url,
        error_message: result.error_message
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status da nota atualizado!");
    },
    onError: (error: any) => {
      console.error("Erro ao verificar status da nota:", error);
      toast.error(error.message || "Falha ao consultar status da nota fiscal. Tente novamente.");
    }
  });

  const handleEmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    emitMutation.mutate(data);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInvoice || !recipientEmail) return;

    setIsSendingEmail(true);
    try {
      await api.post("fiscal/send-email", {
        invoice_id: emailInvoice.id,
        recipient_email: recipientEmail
      });
      toast.success(`Nota Fiscal #${emailInvoice.number} enviada por e-mail com sucesso!`);
      setIsEmailModalOpen(false);
      setEmailInvoice(null);
      setRecipientEmail("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail fiscal.");
    } finally {
      setIsSendingEmail(false);
    }
  };

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar os dados fiscais. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal (NF-e / NFC-e)</h1>
          <p className="text-gray-500">Emissão e controle de Notas Fiscais Eletrônicas.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:items-center gap-3 w-full lg:w-auto min-w-0 items-stretch">
          <ExportButton 
            data={filteredInvoices} 
            filename="notas-fiscais" 
            format="xlsx" 
            headers={invoiceExportHeaders} 
            className="bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-emerald-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileSpreadsheet className="text-emerald-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-700 leading-tight truncate">Excel</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <ExportButton 
            data={filteredInvoices} 
            filename="notas-fiscais" 
            format="pdf" 
            title="Relatório de Notas Fiscais"
            headers={invoiceExportHeaders} 
            className="bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-rose-900 transition-all cursor-pointer shadow-2xs group min-h-[48px] w-full h-full"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/90 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="text-rose-600" size={17} />
              </div>
              <div className="text-left truncate">
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Exportar</p>
                <p className="text-xs sm:text-sm font-bold text-rose-700 leading-tight truncate">PDF</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-500 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:block" />
          </ExportButton>

          <button
            onClick={handleExportXmlZip}
            disabled={isExportingXmlZip}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-slate-700 font-bold transition-all text-xs sm:text-sm disabled:opacity-50 min-h-[48px] w-full h-full cursor-pointer"
            title="Exportar todos os XMLs emitidos compactados em arquivo ZIP"
          >
            <Download size={18} className={isExportingXmlZip ? "animate-bounce text-emerald-600 shrink-0" : "text-slate-600 shrink-0"} />
            <span className="truncate">{isExportingXmlZip ? "Exportando..." : "XMLs (ZIP)"}</span>
          </button>

          <button
            onClick={handleSyncPendingInvoices}
            disabled={isSyncingPending}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold transition-all text-xs sm:text-sm disabled:opacity-50 min-h-[48px] w-full h-full cursor-pointer"
            title="Consultar e reprocessar notas fiscais com status pendente"
          >
            <Clock size={18} className={isSyncingPending ? "animate-spin text-amber-600 shrink-0" : "text-amber-600 shrink-0"} />
            <span className="truncate">{isSyncingPending ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          <Link 
            to="/Certificado"
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold transition-all text-xs sm:text-sm min-h-[48px] w-full h-full"
          >
            <Shield size={18} className="text-blue-600 shrink-0" />
            <span className="truncate">Certificado</span>
          </Link>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="col-span-2 sm:col-span-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-500/20 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] w-full h-full"
          >
            <Plus size={18} className="text-white shrink-0" />
            <span className="truncate">Emitir Nova Nota</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Emitidas (Mês)", value: "124", color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle2 },
          { label: "Aguardando", value: "12", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
          { label: "Rejeitadas", value: "2", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por número da nota ou cliente..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Número / Série</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Emissão</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingInvoices ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Carregando notas...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma nota fiscal encontrada.</td></tr>
              ) : filteredInvoices.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">#{invoice.number || "---"}</p>
                    <p className="text-xs text-gray-500">Série: {invoice.series || "001"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">{invoice.client_name || "Consumidor Final"}</p>
                    <p className="text-xs text-gray-500">{invoice.client_document || "---"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{formatBR(invoice.emission_date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.total || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <NfeStatusBadge status={invoice.status as NfeStatus} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {invoice.status === "Pendente" && (
                        <button 
                          onClick={() => checkStatusMutation.mutate(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Sincronizar Status"
                        >
                          <Clock size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsDanfeOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Imprimir DANFE"
                        disabled={!invoice.pdf_url && invoice.status !== "Emitida"}
                      >
                        <Printer size={18} />
                      </button>
                      {(invoice.xml_storage_url || invoice.xml_url) && invoice.status === "Emitida" && (
                        <XmlDownloadButton invoice={invoice} />
                      )}
                      <button 
                        onClick={() => {
                          setEmailInvoice(invoice);
                          setRecipientEmail(invoice.client_email || "");
                          setIsEmailModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Enviar por E-mail"
                      >
                        <Send size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          cancelMutation.mutate(invoice);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Cancelar Nota"
                        disabled={invoice.status === "Cancelada"}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Emitir Nota */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Emitir Nota Fiscal</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleEmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Venda de Origem</label>
                <select name="sale_id" required className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione uma venda...</option>
                  {sales.filter((s: any) => s.status === "Concluída").map((s: any) => (
                    <option key={s.id} value={s.id}>
                      Venda #{s.sale_number} - {formatCurrency(s.total || 0)} ({s.client_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo de Nota</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="type" value="NFe" defaultChecked className="text-blue-600" />
                    <span className="text-sm font-bold">NF-e (Produtos)</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="type" value="NFCe" className="text-blue-600" />
                    <span className="text-sm font-bold">NFC-e (Consumidor)</span>
                  </label>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  A emissão de notas fiscais requer um certificado digital A1 válido e configurado no sistema. 
                  Certifique-se de que os dados fiscais do cliente e dos produtos estão completos.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
                <button type="submit" disabled={emitMutation.isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                  {emitMutation.isPending ? "Emitindo..." : "Emitir Nota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DanfeViewer 
        isOpen={isDanfeOpen} 
        onClose={() => setIsDanfeOpen(false)} 
        pdfUrl={selectedInvoice?.pdf_url} 
        invoiceNumber={selectedInvoice?.number} 
      />

      {/* Modal Enviar E-mail Fiscal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Enviar Nota por E-mail</h3>
                  <p className="text-xs text-gray-500">Nota Fiscal #{emailInvoice?.number}</p>
                </div>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">E-mail do Destinatário</label>
                <input 
                  type="email" 
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEmailModalOpen(false)} 
                  className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingEmail || !recipientEmail} 
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSendingEmail ? "Enviando..." : "Enviar E-mail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
