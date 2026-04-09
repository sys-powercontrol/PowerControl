export const printReceipt = (sale: any, company: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o recibo.');
    return;
  }

  const itemsHtml = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0;">${item.name}</td>
      <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
      <td style="text-align: right; padding: 4px 0;">R$ ${item.price.toLocaleString()}</td>
      <td style="text-align: right; padding: 4px 0;">R$ ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo de Venda - ${sale.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10mm;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
          .details { margin-bottom: 15px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 11px; }
          .totals { text-align: right; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print {
            body { width: 100%; padding: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company?.name || 'PowerControl'}</div>
          <div>CNPJ: ${company?.cnpj || '00.000.000/0000-00'}</div>
          <div>${company?.address || ''}</div>
          <div>${company?.phone || ''}</div>
        </div>
        <div class="details">
          <div><strong>PEDIDO:</strong> #${sale.id.substr(0, 8).toUpperCase()}</div>
          <div><strong>DATA:</strong> ${new Date(sale.sale_date).toLocaleString()}</div>
          <div><strong>CLIENTE:</strong> ${sale.client_name}</div>
          <div><strong>VENDEDOR:</strong> ${sale.seller_name || 'Balcão'}</div>
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
          <div>Subtotal: R$ ${sale.subtotal.toLocaleString()}</div>
          <div>Desconto: - R$ ${sale.discount.toLocaleString()}</div>
          <div class="total-row">TOTAL: R$ ${sale.total.toLocaleString()}</div>
          <div style="margin-top: 4px;">PAGAMENTO: ${sale.payment_method}</div>
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

export const printPurchaseReceipt = (purchase: any, company: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir o recibo.');
    return;
  }

  const itemsHtml = purchase.items.map((item: any) => `
    <tr>
      <td style="padding: 4px 0;">${item.name}</td>
      <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
      <td style="text-align: right; padding: 4px 0;">R$ ${item.cost.toLocaleString()}</td>
      <td style="text-align: right; padding: 4px 0;">R$ ${(item.cost * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo de Compra - ${purchase.purchase_number}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10mm;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
          .details { margin-bottom: 15px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 11px; }
          .totals { text-align: right; border-top: 1px dashed #000; padding-top: 10px; line-height: 1.4; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print {
            body { width: 100%; padding: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company?.name || 'PowerControl'}</div>
          <div>CNPJ: ${company?.cnpj || '00.000.000/0000-00'}</div>
        </div>
        <div class="details">
          <div><strong>COMPRA:</strong> #${purchase.purchase_number}</div>
          <div><strong>DATA:</strong> ${new Date(purchase.purchase_date).toLocaleString()}</div>
          <div><strong>FORNECEDOR:</strong> ${purchase.supplier_name}</div>
          <div><strong>STATUS:</strong> ${purchase.status || 'Concluída'}</div>
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
          <div class="total-row">TOTAL: R$ ${purchase.total.toLocaleString()}</div>
          <div style="margin-top: 4px;">PAGAMENTO: ${purchase.payment_status}</div>
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
