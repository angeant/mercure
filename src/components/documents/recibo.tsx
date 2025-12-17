"use client";

import Image from "next/image";

interface ReceiptPaymentItem {
  cuenta: string;
  descripcion: string;
  importe: number;
}

interface ReceiptCancelledInvoice {
  date: string;
  invoiceNumber: string;
  amount: number;
}

interface ReciboDocumentProps {
  receipt: {
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
  };
}

const MERCURE = {
  cuit: "30-71625497-2",
  address: "MZA 14 LT 11 BO San Martín",
  city: "Palpalá, Jujuy",
  phone: "011-2452-0473",
  email: "consultasmercure@gmail.com",
  web: "mercuresrl.com",
  iibb: "A-1-63484",
  inicioActividades: "01/07/2021",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function ReciboDocument({ receipt }: ReciboDocumentProps) {
  const totalCancelledInvoices = receipt.cancelledInvoices.reduce((acc, inv) => acc + inv.amount, 0);
  
  return (
    <div className="p-8 font-sans text-neutral-800 print:p-6 bg-white min-h-full">
      
      {/* ══════════════════════════════════════════════════════════════
          HEADER - Estilo Hoja de Ruta
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Image 
            src="/mercure_logos/logo_remito.png" 
            alt="Mercure" 
            width={140} 
            height={38}
            style={{ height: '32px', width: 'auto' }}
          />
          <div className="mt-1 text-[9px] text-neutral-500 leading-relaxed">
            <p>{MERCURE.address}, {MERCURE.city}</p>
            <p>{MERCURE.phone} · CUIT: {MERCURE.cuit}</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          {/* Fecha destacada */}
          <div className="text-right pt-1">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400 mb-0.5">Fecha</p>
            <p className="text-lg font-bold tabular-nums">{formatDate(receipt.receiptDate)}</p>
          </div>
          
          {/* Número de recibo */}
          <div className="bg-neutral-900 text-white px-4 py-2.5 text-center">
            <p className="text-[8px] uppercase tracking-widest opacity-70 mb-0.5">Recibo</p>
            <p className="text-lg font-bold font-mono tracking-wide">{receipt.receiptNumber}</p>
          </div>
        </div>
      </div>

      {/* Línea divisoria con accent */}
      <div className="h-0.5 bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-400 mb-4"></div>

      {/* ══════════════════════════════════════════════════════════════
          DATOS DEL CLIENTE
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-neutral-900 text-white px-3 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider">Datos del Cliente</p>
        </div>
        <div className="grid grid-cols-12 divide-x divide-neutral-200">
          {/* Cliente */}
          <div className="col-span-8 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">Razón Social</p>
            <p className="font-bold text-sm truncate">{receipt.clientName}</p>
          </div>

          {/* CUIT */}
          <div className="col-span-4 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">CUIT</p>
            <p className="font-bold text-sm font-mono">{receipt.clientCuit}</p>
          </div>
        </div>
        
        {/* Segunda fila */}
        <div className="grid grid-cols-12 divide-x divide-neutral-200 border-t border-neutral-200">
          {/* Domicilio */}
          <div className="col-span-8 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">Domicilio</p>
            <p className="text-sm truncate">{receipt.clientDomicilio || '-'}</p>
          </div>

          {/* CBU */}
          <div className="col-span-4 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">CBU</p>
            <p className="text-[10px] font-mono truncate">{receipt.clientCbu || '-'}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TOTAL DESTACADO
      ══════════════════════════════════════════════════════════════ */}
      <div className="border-2 border-neutral-900 rounded-lg p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-0.5">Total del Recibo</p>
          <p className="text-xs text-neutral-400">Moneda: {receipt.currency} {receipt.exchangeRate !== 1 ? `· Cotización: ${formatCurrency(receipt.exchangeRate)}` : ''}</p>
        </div>
        <p className="text-2xl font-bold font-mono">{formatCurrency(receipt.total)}</p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DETALLE DE PAGOS
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-neutral-900 text-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Detalle de Pagos</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-6">#</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Cuenta</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Descripción</th>
              <th className="px-2 py-2 text-right font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Importe</th>
            </tr>
          </thead>
          <tbody>
            {receipt.paymentItems.length > 0 ? (
              receipt.paymentItems.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-100">
                  <td className="px-2 py-2 text-neutral-400">{idx + 1}</td>
                  <td className="px-2 py-2 font-medium">{item.cuenta}</td>
                  <td className="px-2 py-2 truncate max-w-[200px]" title={item.descripcion}>{item.descripcion}</td>
                  <td className="px-2 py-2 text-right font-mono font-medium">{formatCurrency(item.importe)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-neutral-400">
                  Sin movimientos de pago
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-100 font-bold">
              <td colSpan={3} className="px-2 py-2 text-right uppercase text-[9px] text-neutral-500">Total</td>
              <td className="px-2 py-2 text-right font-mono">{formatCurrency(receipt.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          COMPROBANTES CANCELADOS
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-neutral-900 text-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Comprobantes Cancelados</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-6">#</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-28">Fecha</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Nº Comprobante</th>
              <th className="px-2 py-2 text-right font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Importe</th>
            </tr>
          </thead>
          <tbody>
            {receipt.cancelledInvoices.length > 0 ? (
              receipt.cancelledInvoices.map((inv, idx) => (
                <tr key={idx} className="border-b border-neutral-100">
                  <td className="px-2 py-2 text-neutral-400">{idx + 1}</td>
                  <td className="px-2 py-2">{formatDate(inv.date)}</td>
                  <td className="px-2 py-2 font-mono font-medium">{inv.invoiceNumber}</td>
                  <td className="px-2 py-2 text-right font-mono font-medium">{formatCurrency(inv.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-neutral-400">
                  Sin comprobantes cancelados
                </td>
              </tr>
            )}
          </tbody>
          {receipt.cancelledInvoices.length > 0 && (
            <tfoot>
              <tr className="bg-neutral-100 font-bold">
                <td colSpan={3} className="px-2 py-2 text-right uppercase text-[9px] text-neutral-500">Total Cancelado</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalCancelledInvoices)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          OBSERVACIONES
      ══════════════════════════════════════════════════════════════ */}
      {receipt.observations && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">Observaciones</p>
          <p className="text-[11px] text-amber-900">{receipt.observations}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FIRMAS
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-neutral-200 rounded-lg p-3">
          <p className="text-[9px] text-neutral-400 mb-2 uppercase">Recibí Conforme</p>
          <div className="border-b border-dashed border-neutral-300 h-12 mb-1"></div>
          <p className="text-[8px] text-neutral-400 text-center">Firma y Aclaración</p>
        </div>
        <div className="border border-neutral-200 rounded-lg p-3">
          <p className="text-[9px] text-neutral-400 mb-2 uppercase">Por Mercure SRL</p>
          <div className="border-b border-dashed border-neutral-300 h-12 mb-1"></div>
          <p className="text-[8px] text-neutral-400 text-center">Firma Autorizada</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[8px] text-neutral-400 leading-relaxed max-w-xl mx-auto">
          Documento no válido como factura. El presente recibo tiene carácter de comprobante interno.
        </p>
        <p className="text-[9px] text-neutral-500 mt-1 font-medium">{MERCURE.web}</p>
      </div>
    </div>
  );
}
