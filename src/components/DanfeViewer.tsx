import React from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';

interface DanfeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  invoiceNumber?: string;
}

export default function DanfeViewer({ isOpen, onClose, pdfUrl, invoiceNumber }: DanfeViewerProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    if (pdfUrl) {
      const win = window.open(pdfUrl, '_blank');
      win?.print();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Visualizar DANFE</h2>
              <p className="text-xs text-gray-500">Nota Fiscal #{invoiceNumber || '---'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors"
            >
              <Printer size={20} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Download</span>
            </button>
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
        <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
          {pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full rounded-xl border border-gray-200 shadow-inner bg-white"
              title="DANFE Viewer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 space-y-4 bg-white rounded-xl border border-gray-200">
              <FileText size={64} className="opacity-20" />
              <p className="font-medium">Visualização não disponível para esta nota.</p>
              <p className="text-xs">O arquivo PDF ainda não foi gerado ou o link expirou.</p>
            </div>
          )}
        </div>

        {/* Footer (Mobile Actions) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 sm:hidden flex gap-2">
          <button onClick={handlePrint} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 flex items-center justify-center gap-2">
            <Printer size={20} /> Imprimir
          </button>
          <button onClick={handleDownload} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <Download size={20} /> Baixar
          </button>
        </div>
      </div>
    </div>
  );
}
