import React from 'react';
import { FileText, Table as TableIcon, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  format: 'pdf' | 'xlsx';
  title?: string;
  headers?: Record<string, string>;
  className?: string;
}

export default function ExportButton({ 
  data, 
  filename, 
  format, 
  title, 
  headers,
  className 
}: ExportButtonProps) {
  
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }

    // Prepare data based on headers mapping
    const exportData = data.map(item => {
      if (!headers) return item;
      const newItem: any = {};
      Object.entries(headers).forEach(([key, label]) => {
        newItem[label] = item[key];
      });
      return newItem;
    });

    if (format === 'xlsx') {
      exportToExcel(exportData);
    } else {
      exportToPDF(exportData);
    }
  };

  const exportToExcel = (preparedData: any[]) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(preparedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success("Arquivo Excel gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao gerar arquivo Excel.");
    }
  };

  const exportToPDF = (preparedData: any[]) => {
    try {
      const doc = new jsPDF();
      
      if (title) {
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
      }

      const tableHeaders = Object.keys(preparedData[0]);
      const tableRows = preparedData.map(item => Object.values(item));

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: title ? 35 : 20,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });

      doc.save(`${filename}.pdf`);
      toast.success("Arquivo PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar arquivo PDF.");
    }
  };

  const Icon = format === 'pdf' ? FileText : TableIcon;
  const label = format === 'pdf' ? 'Exportar PDF' : 'Exportar Excel';
  const bgColor = format === 'pdf' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100';

  return (
    <button
      onClick={handleExport}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${bgColor} ${className}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
