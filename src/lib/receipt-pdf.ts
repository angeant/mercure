import puppeteer from 'puppeteer';

export interface ReceiptPaymentItem {
  cuenta: string;
  descripcion: string;
  importe: number;
}

export interface ReceiptCancelledInvoice {
  date: string;
  invoiceNumber: string;
  amount: number;
}

export interface ReceiptPdfParams {
  receiptNumber: string;
  receiptDate: string;
  clientName: string;
  clientCuit: string;
  clientDomicilio?: string;
  clientCbu?: string;
  currency: 'ARS' | 'USD';
  exchangeRate: number;
  paymentItems: ReceiptPaymentItem[];
  cancelledInvoices: ReceiptCancelledInvoice[];
  observations?: string;
  total: number;
}

// Datos del emisor (Mercure)
const MERCURE = {
  cuit: '30-71625497-2',
  address: 'MZA 14 LT 11 BO San Martín',
  city: 'Palpalá, Jujuy',
  phone: '011-2452-0473',
  email: 'consultasmercure@gmail.com',
  web: 'mercuresrl.com',
  iibb: 'A-1-63484',
  inicioActividades: '01/07/2021',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export async function generateReceiptPdf(params: ReceiptPdfParams): Promise<Buffer> {
  const totalCancelledInvoices = params.cancelledInvoices.reduce((acc, inv) => acc + inv.amount, 0);
  
  const paymentItemsHtml = params.paymentItems.length > 0 
    ? params.paymentItems.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 8px; color: #a3a3a3;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: 500;">${item.cuenta}</td>
        <td style="padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.descripcion}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 500;">${formatCurrency(item.importe)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #a3a3a3;">Sin movimientos de pago</td></tr>`;

  const cancelledInvoicesHtml = params.cancelledInvoices.length > 0
    ? params.cancelledInvoices.map((inv, idx) => `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 8px; color: #a3a3a3;">${idx + 1}</td>
        <td style="padding: 8px;">${formatDate(inv.date)}</td>
        <td style="padding: 8px; font-family: monospace; font-weight: 500;">${inv.invoiceNumber}</td>
        <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 500;">${formatCurrency(inv.amount)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #a3a3a3;">Sin comprobantes cancelados</td></tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #262626;
      padding: 32px;
      background: white;
      min-height: 100%;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
    <div style="flex: 1;">
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAAtCAYAAADcf/DRAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAfzSURBVHhe7Zx9bBRVF8Z/u7u0S0tbKC1aKEVBvgQUi4i" alt="Mercure" style="height: 32px; width: auto;" />
      <p style="margin-top: 4px; font-size: 9px; color: #737373; line-height: 1.4;">
        ${MERCURE.address}, ${MERCURE.city}<br/>
        ${MERCURE.phone} · CUIT: ${MERCURE.cuit}
      </p>
    </div>
    
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <!-- Fecha destacada -->
      <div style="text-align: right; padding-top: 4px;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3; margin-bottom: 2px;">Fecha</p>
        <p style="font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums;">${formatDate(params.receiptDate)}</p>
      </div>
      
      <!-- Número de recibo -->
      <div style="background: #171717; color: white; padding: 10px 16px; text-align: center;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7; margin-bottom: 2px;">Recibo</p>
        <p style="font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${params.receiptNumber}</p>
      </div>
    </div>
  </div>

  <!-- Gradient divider -->
  <div style="height: 2px; background: linear-gradient(to right, #171717, #525252, #a3a3a3); margin-bottom: 16px;"></div>

  <!-- DATOS DEL CLIENTE -->
  <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
    <div style="background: #171717; color: white; padding: 6px 12px;">
      <p style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Datos del Cliente</p>
    </div>
    <div style="display: grid; grid-template-columns: 2fr 1fr;">
      <div style="padding: 10px; border-right: 1px solid #e5e5e5;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3;">Razón Social</p>
        <p style="font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${params.clientName}</p>
      </div>
      <div style="padding: 10px;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3;">CUIT</p>
        <p style="font-weight: 700; font-size: 13px; font-family: monospace;">${params.clientCuit}</p>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 2fr 1fr; border-top: 1px solid #e5e5e5;">
      <div style="padding: 10px; border-right: 1px solid #e5e5e5;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3;">Domicilio</p>
        <p style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${params.clientDomicilio || '-'}</p>
      </div>
      <div style="padding: 10px;">
        <p style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #a3a3a3;">CBU</p>
        <p style="font-size: 10px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${params.clientCbu || '-'}</p>
      </div>
    </div>
  </div>

  <!-- TOTAL DESTACADO -->
  <div style="border: 2px solid #171717; border-radius: 8px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #737373; margin-bottom: 2px;">Total del Recibo</p>
      <p style="font-size: 11px; color: #a3a3a3;">Moneda: ${params.currency}${params.exchangeRate !== 1 ? ` · Cotización: ${formatCurrency(params.exchangeRate)}` : ''}</p>
    </div>
    <p style="font-size: 24px; font-weight: 700; font-family: monospace;">${formatCurrency(params.total)}</p>
  </div>

  <!-- DETALLE DE PAGOS -->
  <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
    <div style="background: #171717; color: white; padding: 8px 12px;">
      <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Detalle de Pagos</p>
    </div>
    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr style="background: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px; width: 24px;">#</th>
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px;">Cuenta</th>
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px;">Descripción</th>
          <th style="padding: 8px; text-align: right; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${paymentItemsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f5f5f5; font-weight: 700;">
          <td colspan="3" style="padding: 8px; text-align: right; text-transform: uppercase; font-size: 9px; color: #737373;">Total</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(params.total)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- COMPROBANTES CANCELADOS -->
  <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
    <div style="background: #171717; color: white; padding: 8px 12px;">
      <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Comprobantes Cancelados</p>
    </div>
    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr style="background: #fafafa; border-bottom: 1px solid #e5e5e5;">
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px; width: 24px;">#</th>
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px; width: 100px;">Fecha</th>
          <th style="padding: 8px; text-align: left; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px;">Nº Comprobante</th>
          <th style="padding: 8px; text-align: right; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-size: 9px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${cancelledInvoicesHtml}
      </tbody>
      ${params.cancelledInvoices.length > 0 ? `
      <tfoot>
        <tr style="background: #f5f5f5; font-weight: 700;">
          <td colspan="3" style="padding: 8px; text-align: right; text-transform: uppercase; font-size: 9px; color: #737373;">Total Cancelado</td>
          <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(totalCancelledInvoices)}</td>
        </tr>
      </tfoot>
      ` : ''}
    </table>
  </div>

  <!-- OBSERVACIONES -->
  ${params.observations ? `
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
    <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 4px;">Observaciones</p>
    <p style="font-size: 11px; color: #78350f;">${params.observations}</p>
  </div>
  ` : ''}

  <!-- FIRMAS -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
    <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px;">
      <p style="font-size: 9px; color: #a3a3a3; text-transform: uppercase; margin-bottom: 8px;">Recibí Conforme</p>
      <div style="border-bottom: 1px dashed #d4d4d4; height: 48px; margin-bottom: 4px;"></div>
      <p style="font-size: 8px; color: #a3a3a3; text-align: center;">Firma y Aclaración</p>
    </div>
    <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px;">
      <p style="font-size: 9px; color: #a3a3a3; text-transform: uppercase; margin-bottom: 8px;">Por Mercure SRL</p>
      <div style="border-bottom: 1px dashed #d4d4d4; height: 48px; margin-bottom: 4px;"></div>
      <p style="font-size: 8px; color: #a3a3a3; text-align: center;">Firma Autorizada</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="text-align: center;">
    <p style="font-size: 8px; color: #a3a3a3; line-height: 1.5; max-width: 400px; margin: 0 auto;">
      Documento no válido como factura. El presente recibo tiene carácter de comprobante interno.
    </p>
    <p style="font-size: 9px; color: #737373; margin-top: 4px; font-weight: 500;">${MERCURE.web}</p>
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 10000 });
  
  const pdfBuffer = await page.pdf({ 
    format: 'A4', 
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm',
    },
  });
  await browser.close();

  return Buffer.from(pdfBuffer);
}
