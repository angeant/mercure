import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { FileText, Plus, MinusCircle, CreditCard } from "lucide-react";
import { DownloadButton } from "./download-button";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Mapeo de tipos de comprobante a labels
const VOUCHER_LABELS: Record<string, { label: string; short: string; color: string }> = {
  'A': { label: 'Factura A', short: 'FA', color: 'bg-blue-100 text-blue-700' },
  'B': { label: 'Factura B', short: 'FB', color: 'bg-blue-100 text-blue-700' },
  'C': { label: 'Factura C', short: 'FC', color: 'bg-blue-100 text-blue-700' },
  'NC_A': { label: 'Nota de Crédito A', short: 'NC A', color: 'bg-red-100 text-red-700' },
  'NC_B': { label: 'Nota de Crédito B', short: 'NC B', color: 'bg-red-100 text-red-700' },
  'NC_C': { label: 'Nota de Crédito C', short: 'NC C', color: 'bg-red-100 text-red-700' },
  'ND_A': { label: 'Nota de Débito A', short: 'ND A', color: 'bg-amber-100 text-amber-700' },
  'ND_B': { label: 'Nota de Débito B', short: 'ND B', color: 'bg-amber-100 text-amber-700' },
  'ND_C': { label: 'Nota de Débito C', short: 'ND C', color: 'bg-amber-100 text-amber-700' },
  'FCE_A': { label: 'FCE MiPyME A', short: 'FCE A', color: 'bg-green-100 text-green-700' },
  'FCE_B': { label: 'FCE MiPyME B', short: 'FCE B', color: 'bg-green-100 text-green-700' },
  'FCE_C': { label: 'FCE MiPyME C', short: 'FCE C', color: 'bg-green-100 text-green-700' },
  'NC_FCE_A': { label: 'NC FCE A', short: 'NC FCE', color: 'bg-rose-100 text-rose-700' },
  'NC_FCE_B': { label: 'NC FCE B', short: 'NC FCE', color: 'bg-rose-100 text-rose-700' },
  'NC_FCE_C': { label: 'NC FCE C', short: 'NC FCE', color: 'bg-rose-100 text-rose-700' },
  'ND_FCE_A': { label: 'ND FCE A', short: 'ND FCE', color: 'bg-orange-100 text-orange-700' },
  'ND_FCE_B': { label: 'ND FCE B', short: 'ND FCE', color: 'bg-orange-100 text-orange-700' },
  'ND_FCE_C': { label: 'ND FCE C', short: 'ND FCE', color: 'bg-orange-100 text-orange-700' },
};

function getVoucherDisplay(voucherType?: string, invoiceType?: string) {
  const type = voucherType || invoiceType || 'A';
  return VOUCHER_LABELS[type] || VOUCHER_LABELS[invoiceType || 'A'] || { label: type, short: type, color: 'bg-neutral-100 text-neutral-600' };
}

export default async function FacturasPage() {
  await requireAuth("/facturas");

  // Obtener comprobantes (facturas, NC, ND)
  const { data: facturas, error } = await supabaseAdmin!
    .schema('mercure')
    .from('invoices')
    .select('*')
    .order('issue_date', { ascending: false });

  // Contar por tipo
  const facturaCount = facturas?.filter(f => !f.voucher_type || (!f.voucher_type.startsWith('NC') && !f.voucher_type.startsWith('FCE'))).length || 0;
  const ncCount = facturas?.filter(f => f.voucher_type?.startsWith('NC')).length || 0;
  const fceCount = facturas?.filter(f => f.voucher_type?.startsWith('FCE')).length || 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Comprobantes</h1>
              <p className="text-xs text-neutral-500">
                {facturaCount} factura{facturaCount !== 1 ? 's' : ''} · {ncCount} NC · {fceCount} FCE
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/facturas/nueva-nc"
                className="h-8 px-3 text-sm border border-neutral-200 hover:bg-neutral-50 rounded flex items-center justify-center gap-1.5"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nota de</span> Crédito
              </Link>
              <Link 
                href="/facturas/nueva-fce"
                className="h-8 px-3 text-sm border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 rounded flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                FCE MiPyME
              </Link>
              <Link 
                href="/facturas/nueva"
                className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Factura
              </Link>
            </div>
          </div>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Número</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CAE</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-red-500">
                        Error al cargar facturas: {error.message}
                      </td>
                    </tr>
                  ) : !facturas || facturas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                        No hay facturas emitidas
                      </td>
                    </tr>
                  ) : (
                    facturas.map((factura) => {
                      const voucherDisplay = getVoucherDisplay(factura.voucher_type, factura.invoice_type);
                      const isNC = factura.voucher_type?.startsWith('NC');
                      const isND = factura.voucher_type?.startsWith('ND');
                      const showPaymentStatus = !isNC && !isND;
                      return (
                      <tr key={factura.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded ${voucherDisplay.color}`}>
                            {voucherDisplay.short}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-900">
                          {factura.invoice_number}
                        </td>
                        <td className="px-3 py-2 text-neutral-700 max-w-[200px] truncate" title={factura.client_name}>
                          {factura.client_name}
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {formatDate(factura.issue_date)}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium font-mono ${isNC ? 'text-red-600' : 'text-neutral-900'}`}>
                          {isNC ? '-' : ''}{formatCurrency(Number(factura.total))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {showPaymentStatus ? (
                            factura.payment_status === 'paid' ? (
                              <Link 
                                href="/cobranzas" 
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                                title={`Recibo #${factura.receipt_id}`}
                              >
                                ✓ Pagada
                              </Link>
                            ) : factura.payment_status === 'partial' ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                Parcial
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                                Pendiente
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                          {factura.cae}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <DownloadButton
                            invoiceNumber={factura.invoice_number}
                            cae={factura.cae}
                            caeExpiration={factura.cae_expiration}
                            clienteCuit={factura.client_cuit || ''}
                            clienteNombre={factura.client_name}
                            neto={Number(factura.neto)}
                            iva={Number(factura.iva)}
                            total={Number(factura.total)}
                            invoiceType={factura.invoice_type}
                          />
                        </td>
                        </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Resumen */}
          {facturas && facturas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-sm text-neutral-500">
                Total: {facturas.length} factura{facturas.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
