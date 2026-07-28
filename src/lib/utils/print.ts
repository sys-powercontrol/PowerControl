import { formatCurrency } from '../currencyUtils';

const escapeHtml = (unsafe: any): string => {
  if (unsafe === null || unsafe === undefined) return '';
  if (typeof unsafe !== 'string') unsafe = String(unsafe);
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const printReceipt = (sale: any, company: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o recibo.');
    return;
  }

  const itemsHtml = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0;">${escapeHtml(item.name)}</td>
      <td style="text-align: center; padding: 4px 0;">${escapeHtml(item.quantity)}</td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.price)}</td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo de Venda - ${escapeHtml(sale.id)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            width: 80mm; 
            box-sizing: border-box;
            margin: 0 auto; 
            padding: 10mm 5mm;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
          .details { margin-bottom: 15px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
          th, td { word-wrap: break-word; }
          th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 11px; }
          .totals { text-align: right; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print {
            body { padding: 10mm 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${escapeHtml(company?.name || 'PowerControl')}</div>
          <div>CNPJ: ${escapeHtml(company?.cnpj || '00.000.000/0000-00')}</div>
          <div>${escapeHtml(company?.address || '')}</div>
          <div>${escapeHtml(company?.phone || '')}</div>
        </div>
        <div class="details">
          <div><strong>PEDIDO:</strong> #${escapeHtml(sale.id).substr(0, 8).toUpperCase()}</div>
          <div><strong>DATA:</strong> ${escapeHtml(new Date(sale.sale_date).toLocaleString())}</div>
          <div><strong>CLIENTE:</strong> ${escapeHtml(sale.client_name)}</div>
          <div><strong>VENDEDOR:</strong> ${escapeHtml(sale.seller_name || 'Balcão')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th style="text-align: center;">QTD</th>
              <th style="text-align: right;">PREÇO</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: ${formatCurrency(sale.subtotal)}</div>
          <div>Desconto: - ${formatCurrency(sale.discount)}</div>
          <div class="total-row">TOTAL: ${formatCurrency(sale.total)}</div>
          <div style="margin-top: 4px;">PAGAMENTO: ${escapeHtml(sale.payment_method)}</div>
        </div>
        <div class="footer">
          Obrigado pela preferência!<br/>
          www.powercontrol.com.br
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printA4Quote = (sale: any, company: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o orçamento.');
    return;
  }

  const itemsHtml = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.quantity)}</td>
      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatCurrency(item.price)}</td>
      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orçamento - ${escapeHtml(sale.id)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          @page { size: A4; margin: 20mm; }
          body { 
            font-family: 'Inter', sans-serif; 
            font-size: 14px; 
            line-height: 1.5;
            color: #1f2937;
            margin: 0;
            padding: 0;
          }
          .container { max-width: 100%; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .company-info { flex: 1; }
          .document-info { text-align: right; }
          .logo { max-width: 150px; max-height: 80px; margin-bottom: 10px; }
          h1 { margin: 0 0 5px 0; font-size: 24px; color: #111827; text-transform: uppercase; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
          .card h3 { margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
          .totals-container { display: flex; justify-content: flex-end; }
          .totals { width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .total-row.final { font-size: 18px; font-weight: 700; color: #111827; border-bottom: none; border-top: 2px solid #e5e7eb; margin-top: 5px; padding-top: 10px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6b7280; }
          .signature-area { margin-top: 50px; display: flex; justify-content: space-around; }
          .signature-line { width: 200px; border-top: 1px solid #111827; text-align: center; padding-top: 5px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-info">
              ${company?.logo ? `<img src="${company.logo}" class="logo" />` : `<h2 style="margin: 0 0 10px 0; font-size: 20px;">${escapeHtml(company?.name || 'PowerControl')}</h2>`}
              <div><strong>CNPJ:</strong> ${escapeHtml(company?.cnpj || '')}</div>
              <div>${escapeHtml(company?.address || '')}</div>
              <div>${escapeHtml(company?.phone || '')} | ${escapeHtml(company?.email || '')}</div>
            </div>
            <div class="document-info">
              <h1>ORÇAMENTO</h1>
              <div><strong>Nº:</strong> #${escapeHtml(sale.id).substr(0, 8).toUpperCase()}</div>
              <div><strong>Data:</strong> ${escapeHtml(new Date(sale.sale_date).toLocaleDateString())}</div>
              <div><strong>Validade:</strong> 15 dias</div>
            </div>
          </div>
          
          <div class="details-grid">
            <div class="card">
              <h3>DADOS DO CLIENTE</h3>
              <div><strong>Nome:</strong> ${escapeHtml(sale.client_name)}</div>
              ${sale.client_document ? `<div><strong>CPF/CNPJ:</strong> ${escapeHtml(sale.client_document)}</div>` : ''}
              ${sale.client_phone ? `<div><strong>Telefone:</strong> ${escapeHtml(sale.client_phone)}</div>` : ''}
            </div>
            <div class="card">
              <h3>DADOS DA VENDA</h3>
              <div><strong>Vendedor:</strong> ${escapeHtml(sale.seller_name || 'Balcão')}</div>
              <div><strong>Condição de Pagamento:</strong> ${escapeHtml(sale.payment_method)}</div>
              <div><strong>Status:</strong> ${escapeHtml(sale.status)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>DESCRIÇÃO DO PRODUTO/SERVIÇO</th>
                <th style="text-align: center;">QTD</th>
                <th style="text-align: right;">VALOR UNIT.</th>
                <th style="text-align: right;">VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatCurrency(sale.subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Desconto</span>
                <span>- ${formatCurrency(sale.discount)}</span>
              </div>
              <div class="total-row final">
                <span>TOTAL</span>
                <span>${formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature-line">Assinatura da Empresa</div>
            <div class="signature-line">Assinatura do Cliente</div>
          </div>

          <div class="footer">
            Este orçamento é válido por 15 dias a partir da data de emissão.<br/>
            Gerado por Sistema PowerControl.
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printPurchaseReceipt = (purchase: any, company: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o recibo.');
    return;
  }

  const itemsHtml = purchase.items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0;">${escapeHtml(item.name)}</td>
      <td style="text-align: center; padding: 4px 0;">${escapeHtml(item.quantity)}</td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.cost)}</td>
      <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.cost * item.quantity)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo de Compra - ${escapeHtml(purchase.purchase_number)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            width: 80mm; 
            box-sizing: border-box;
            margin: 0 auto; 
            padding: 10mm 5mm;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
          .details { margin-bottom: 15px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
          th, td { word-wrap: break-word; }
          th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 11px; }
          .totals { text-align: right; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print {
            body { padding: 10mm 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${escapeHtml(company?.name || 'PowerControl')}</div>
          <div>CNPJ: ${escapeHtml(company?.cnpj || '00.000.000/0000-00')}</div>
        </div>
        <div class="details">
          <div><strong>COMPRA:</strong> #${escapeHtml(purchase.purchase_number)}</div>
          <div><strong>DATA:</strong> ${escapeHtml(new Date(purchase.purchase_date).toLocaleString())}</div>
          <div><strong>FORNECEDOR:</strong> ${escapeHtml(purchase.supplier_name)}</div>
          <div><strong>STATUS:</strong> ${escapeHtml(purchase.status || 'Concluída')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th style="text-align: center;">QTD</th>
              <th style="text-align: right;">CUSTO</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row">TOTAL: ${formatCurrency(purchase.total)}</div>
          <div style="margin-top: 4px;">PAGAMENTO: ${escapeHtml(purchase.payment_status)}</div>
        </div>
        <div class="footer">
          Entrada de Estoque - Sistema PowerControl
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
