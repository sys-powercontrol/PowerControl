import React from 'react';
import { FileText, Table as TableIcon, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { formatBR, getNowBR } from "../lib/dateUtils";

interface ExportButtonProps {
  data: any[];
  filename: string;
  format: 'pdf' | 'xlsx';
  title?: string;
  headers?: Record<string, string>;
  className?: string;
  summaryBlocks?: {
    label: string;
    value: string;
    isPrimary?: boolean;
  }[];
}

export default function ExportButton({ 
  data, 
  filename, 
  format, 
  title, 
  headers,
  className,
  summaryBlocks
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
      const wsData: any[][] = [];
      
      if (title) {
        wsData.push([title]);
        wsData.push([`Gerado em: ${formatBR(getNowBR(), "dd/MM/yyyy HH:mm")}`]);
        wsData.push([]);
      }

      if (summaryBlocks && summaryBlocks.length > 0) {
        // Group summary blocks by 4 per row
        const chunkSize = 4;
        for (let i = 0; i < summaryBlocks.length; i += chunkSize) {
          const chunk = summaryBlocks.slice(i, i + chunkSize);
          wsData.push(chunk.map((b) => b.label.toUpperCase()));
          wsData.push(chunk.map((b) => b.value));
          wsData.push([]); // spacer
        }
      }

      if (preparedData.length > 0) {
        const tableHeaders = Object.keys(preparedData[0]);
        wsData.push(tableHeaders);
        
        preparedData.forEach(item => {
          wsData.push(Object.values(item));
        });
      }

      const worksheet = XLSX.utils.aoa_to_sheet(wsData);
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
      let startY = 20;

      if (title) {
        doc.setFontSize(18);
        doc.setTextColor(31, 41, 55);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gerado em: ${formatBR(getNowBR(), "dd/MM/yyyy HH:mm")}`, 14, 30);
        startY = 35;
      }

      if (summaryBlocks && summaryBlocks.length > 0) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const baseCurrentX = pageWidth - 14; 
        
        let currentY = 15;
        let blocksInCurrentRow = 0;
        let currentX = baseCurrentX;
        
        // Iterate backwards through the original array to render from right to left
        for (let i = summaryBlocks.length - 1; i >= 0; i--) {
          const block = summaryBlocks[i];
          
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          const labelWidth = doc.getTextWidth(block.label.toUpperCase());
          
          doc.setFontSize(9);
          const valueWidth = doc.getTextWidth(block.value);
          
          const blockWidth = Math.max(labelWidth, valueWidth) + 12; 
          const blockHeight = 14;
          
          currentX -= blockWidth;
          
          if (block.isPrimary) {
            doc.setFillColor(37, 99, 235);
          } else {
            doc.setFillColor(243, 244, 246);
          }
          
          doc.roundedRect(currentX, currentY, blockWidth, blockHeight, 1.5, 1.5, 'F');
          
          if (block.isPrimary) doc.setTextColor(191, 219, 254);
          else doc.setTextColor(156, 163, 175);
          doc.setFontSize(7);
          doc.text(block.label.toUpperCase(), currentX + 6, currentY + 5);
          
          if (block.isPrimary) doc.setTextColor(255, 255, 255);
          else doc.setTextColor(55, 65, 81);
          doc.setFontSize(9);
          doc.text(block.value, currentX + 6, currentY + 11);
          
          currentX -= 4; 
          blocksInCurrentRow++;

          if (blocksInCurrentRow >= 4 && i > 0) { // Move to next row
             currentY += blockHeight + 4;
             currentX = baseCurrentX;
             blocksInCurrentRow = 0;
             startY = currentY + blockHeight + 5;
          }
        }
        
        if (blocksInCurrentRow > 0 && startY === 35) {
            startY = currentY + 19;
        } else if (blocksInCurrentRow > 0) {
            startY = currentY + 19;
        }
      }

      const tableHeaders = Object.keys(preparedData[0]);
      const tableRows = preparedData.map(item => Object.values(item).map(val => val !== null && val !== undefined ? String(val) : ''));

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: startY,
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
