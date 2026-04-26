import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatBR } from '../dateUtils';

interface ExportPdfOptions {
  elementId: string;
  filename: string;
  title: string;
  companyName?: string;
}

export const exportToPdf = async ({ elementId, filename, title, companyName }: ExportPdfOptions) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Add temporary styling for Power BI look during capture
    const originalBackground = element.style.background;
    const originalPadding = element.style.padding;
    
    // Apply Power BI style background
    element.style.background = '#f3f2f1'; // Light gray classic BI background
    element.style.padding = '20px';

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#f3f2f1',
      ignoreElements: (element) => element.classList.contains('hide-on-print'),
    });

    // Revert original styles
    element.style.background = originalBackground;
    element.style.padding = originalPadding;

    const imgData = canvas.toDataURL('image/png');
    
    // A4 landscape dimensions in mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate aspect ratio
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Header Power BI Style
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfWidth, 20, 'F'); // White top bar
    
    // Power BI yellow accent line
    pdf.setFillColor(242, 200, 17);
    pdf.rect(0, 20, pdfWidth, 2, 'F');
    
    // Title and Metadata
    pdf.setTextColor(51, 51, 51);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, 10, 12);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const dateStr = `Exportado em: ${formatBR(new Date(), 'dd/MM/yyyy HH:mm')}`;
    pdf.text(dateStr, pdfWidth - 10 - pdf.getTextWidth(dateStr), 12);
    
    if (companyName) {
      pdf.setFontSize(9);
      pdf.setTextColor(102, 102, 102);
      pdf.text(companyName, 10, 17);
    }

    // Add captured image below the header
    const yOffset = 25; // Below header
    // Re-adjust height if it exceeds page after offset
    const availableHeight = pdfHeight - yOffset - 5;
    const finalRatio = Math.min(pdfWidth / imgWidth, availableHeight / imgHeight);
    
    const printWidth = imgWidth * finalRatio;
    const printHeight = imgHeight * finalRatio;
    
    const xOffset = (pdfWidth - printWidth) / 2; // Center horizontally

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, printWidth, printHeight);

    pdf.save(`${filename}-${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
