import React, { useState } from 'react';
import { X, Printer, Download, FileText, Receipt } from 'lucide-react';

interface DanfeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  invoiceNumber?: string;
  model?: '55' | '65';
  invoiceData?: any;
}

export default function DanfeViewer({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  invoiceNumber,
  model = '55',
  invoiceData
}: DanfeViewerProps) {
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>(model === '65' ? 'thermal' : 'a4');

  if (!isOpen) return null;

  const isNFCe = model === '65' || invoiceData?.model === '65' || invoiceData?.type === 'NFC-e';

  const handlePrint = () => {
    if (printMode === 'thermal' || (!pdfUrl && isNFCe)) {
      window.print();
    } else if (pdfUrl) {
      const win = window.open(pdfUrl, '_blank');
      win?.print();
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `DANFE-${invoiceNumber || 'Nota'}.pdf`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              {isNFCe ? <Receipt size={24} /> : <FileText size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {isNFCe ? 'DANFE NFC-e (Cupom Fiscal)' : 'Visualizar DANFE NF-e'}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${isNFCe ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                  {isNFCe ? 'Modelo 65' : 'Modelo 55'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Documento Fiscal #{invoiceNumber || invoiceData?.number || '---'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isNFCe && (
              <div className="flex bg-gray-100 p-1 rounded-xl mr-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPrintMode('thermal')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${printMode === 'thermal' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Cupom 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('a4')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${printMode === 'a4' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Padrão A4
                </button>
              </div>
            )}

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors"
              title="Imprimir documento fiscal"
            >
              <Printer size={20} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {pdfUrl && (
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                <Download size={20} />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <div className="w-px h-8 bg-gray-100 mx-2" />
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 p-4 overflow-y-auto flex items-center justify-center">
          {printMode === 'thermal' && isNFCe ? (
            <div className="bg-white p-6 rounded-2xl shadow-md max-w-sm w-full font-mono text-xs text-gray-800 space-y-3 border border-gray-200">
              <div className="text-center border-b border-dashed border-gray-300 pb-3 space-y-1">
                <p className="font-bold text-sm uppercase">{invoiceData?.company_name || 'EMISSÃO FISCAL PDV'}</p>
                <p className="text-[11px] text-gray-600">CNPJ: {invoiceData?.company_cnpj || '---'}</p>
                <p className="text-[10px] text-gray-500">DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
              </div>

              <div className="border-b border-dashed border-gray-300 pb-3 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>NFC-e Nº: {invoiceNumber || invoiceData?.number || '---'}</span>
                  <span>Série: {invoiceData?.series || '1'}</span>
                </div>
                <div className="text-[11px] text-gray-600">
                  Data de Emissão: {invoiceData?.issued_at ? new Date(invoiceData.issued_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                </div>
                {invoiceData?.access_key && (
                  <div className="pt-1">
                    <span className="text-[10px] text-gray-400 block">CHAVE DE ACESSO:</span>
                    <span className="text-[10px] font-bold break-all">{invoiceData.access_key}</span>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-gray-300 pb-3 space-y-1">
                <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-gray-100">
                  <span>ITEM / DESCRIÇÃO</span>
                  <span>TOTAL</span>
                </div>
                {invoiceData?.items && Array.isArray(invoiceData.items) ? (
                  invoiceData.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate pr-2">{idx + 1}. {item.description || item.name} ({item.quantity}x)</span>
                      <span className="font-bold shrink-0">R$ {Number(item.total || item.unit_price * item.quantity || 0).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-gray-500 italic">Venda fiscal registrada no sistema.</p>
                )}
              </div>

              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between font-bold text-sm text-gray-900">
                  <span>VALOR TOTAL:</span>
                  <span>R$ {Number(invoiceData?.total_amount || invoiceData?.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Forma de Pagamento:</span>
                  <span>{invoiceData?.payment_method || 'À Vista'}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-1">
                <p>Consulte pela Chave de Acesso em:</p>
                <p className="font-bold text-blue-600">http://www.sefaz.gov.br/nfce/consulta</p>
                <p className="text-[9px] pt-1">EMITIDA EM HOMOLOGAÇÃO / PRODUÇÃO SEFAZ</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full rounded-xl border border-gray-200 shadow-inner bg-white"
              title="DANFE Viewer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 space-y-4 bg-white rounded-xl border border-gray-200">
              <FileText size={64} className="opacity-20" />
              <p className="font-medium">Visualização PDF não disponível para esta nota.</p>
              <p className="text-xs">Utilize o modo de visualização Cupom 80mm ou gere o PDF na SEFAZ.</p>
            </div>
          )}
        </div>

        {/* Footer (Mobile Actions) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 sm:hidden flex gap-2">
          <button onClick={handlePrint} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 flex items-center justify-center gap-2">
            <Printer size={20} /> Imprimir
          </button>
          {pdfUrl && (
            <button onClick={handleDownload} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
              <Download size={20} /> Baixar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

