"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Mail, X, Trash2, Search } from "lucide-react";

interface Receipt {
  id: number;
  receipt_number: string;
  receipt_date: string;
  client_entity_id: number | null;
  client_name: string;
  client_cuit: string | null;
  client_address: string | null;
  currency: string;
  exchange_rate: number;
  total: number;
  observations: string | null;
  status: string;
  created_at: string;
  client?: {
    id: number;
    legal_name: string;
    tax_id: string | null;
    email: string | null;
  } | null;
  payment_items: {
    id: number;
    payment_type: string;
    description: string | null;
    amount: number;
  }[];
  cancelled_invoices: {
    id: number;
    invoice_number: string;
    invoice_date: string | null;
    amount_applied: number;
  }[];
}

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
  email: string | null;
}

interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  total: number;
  client_entity_id: number | null;
  client_name: string;
  payment_status: string | null;
  receipt_id: number | null;
  voucher_type: string | null;
}

interface PaymentItem {
  payment_type: string;
  description: string;
  amount: number;
}

interface CancelledInvoice {
  invoice_id?: number;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  amount_applied: number;
}

interface CobranzasClientProps {
  initialReceipts: Receipt[];
  clients: Entity[];
  invoices: Invoice[];
}

const PAYMENT_TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'retenciones_iva', label: 'Retenciones IVA' },
  { value: 'retenciones_iibb', label: 'Retenciones IIBB' },
  { value: 'retenciones_ganancias', label: 'Retenciones Ganancias' },
  { value: 'otros', label: 'Otros' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
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

export function CobranzasClient({ initialReceipts, clients, invoices }: CobranzasClientProps) {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [observations, setObservations] = useState('');
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([
    { payment_type: 'transferencia', description: '', amount: 0 }
  ]);
  const [cancelledInvoices, setCancelledInvoices] = useState<CancelledInvoice[]>([]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientInvoices = invoices.filter(inv => 
    selectedClientId ? inv.client_entity_id === selectedClientId : false
  );

  const totalPagos = paymentItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const resetForm = () => {
    setSelectedClientId(null);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setCurrency('ARS');
    setExchangeRate(1);
    setObservations('');
    setPaymentItems([{ payment_type: 'transferencia', description: '', amount: 0 }]);
    setCancelledInvoices([]);
  };

  const handleAddPaymentItem = () => {
    setPaymentItems([...paymentItems, { payment_type: 'efectivo', description: '', amount: 0 }]);
  };

  const handleRemovePaymentItem = (index: number) => {
    setPaymentItems(paymentItems.filter((_, i) => i !== index));
  };

  const handlePaymentItemChange = (index: number, field: keyof PaymentItem, value: string | number) => {
    const updated = [...paymentItems];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentItems(updated);
  };

  const handleAddInvoice = (invoice: Invoice) => {
    if (cancelledInvoices.some(ci => ci.invoice_id === invoice.id)) return;
    setCancelledInvoices([...cancelledInvoices, {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.issue_date,
      invoice_amount: Number(invoice.total),
      amount_applied: Number(invoice.total),
    }]);
  };

  const handleRemoveInvoice = (index: number) => {
    setCancelledInvoices(cancelledInvoices.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      alert('Seleccione un cliente');
      return;
    }

    if (paymentItems.length === 0 || totalPagos <= 0) {
      alert('Agregue al menos un pago');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_date: receiptDate,
          client_entity_id: selectedClient.id,
          client_name: selectedClient.legal_name,
          client_cuit: selectedClient.tax_id,
          client_address: selectedClient.address,
          currency,
          exchange_rate: exchangeRate,
          observations,
          payment_items: paymentItems.filter(p => Number(p.amount) > 0),
          cancelled_invoices: cancelledInvoices,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReceipts([result.data, ...receipts]);
        setShowModal(false);
        resetForm();
      } else {
        alert('Error al crear recibo: ' + (result.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Error al crear recibo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (receiptId: number) => {
    window.open(`/api/receipts/pdf?id=${receiptId}`, '_blank');
  };

  const handleSendEmail = async (receipt: Receipt) => {
    const email = receipt.client?.email;
    if (!email) {
      alert('El cliente no tiene email configurado');
      return;
    }
    // TODO: Implementar envío de email
    alert(`Funcionalidad de envío por email en desarrollo. Email: ${email}`);
  };

  const filteredReceipts = receipts.filter(r => 
    r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.receipt_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
        <h1 className="text-lg font-medium text-neutral-900">Cobranzas</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-sm border border-neutral-200 rounded w-full sm:w-48 focus:outline-none focus:border-neutral-400"
            />
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
          >
            <Plus className="w-4 h-4 mr-1" />
            Cargar Cobro
          </Button>
        </div>
      </div>

      {/* Tabla de recibos */}
      <div className="border border-neutral-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Nº Recibo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CUIT</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Pagos</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Facturas</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                    {searchTerm ? 'No se encontraron recibos' : 'No hay recibos cargados'}
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-2 font-mono font-medium">{receipt.receipt_number}</td>
                    <td className="px-3 py-2">{formatDate(receipt.receipt_date)}</td>
                    <td className="px-3 py-2 font-medium truncate max-w-[200px]" title={receipt.client_name}>
                      {receipt.client_name}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{receipt.client_cuit || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {formatCurrency(Number(receipt.total))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                        {receipt.payment_items?.length || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        {receipt.cancelled_invoices?.length || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDownloadPdf(receipt.id)}
                          className="p-1.5 hover:bg-neutral-100 rounded"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4 text-neutral-600" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(receipt)}
                          className="p-1.5 hover:bg-neutral-100 rounded"
                          title="Enviar por Email"
                        >
                          <Mail className="w-4 h-4 text-neutral-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para nuevo recibo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Cargar Cobro</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-neutral-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Cliente y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Cliente *</label>
                  <select
                    value={selectedClientId || ''}
                    onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                    className="h-9 w-full text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.legal_name} {client.tax_id ? `(${client.tax_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="h-9 w-full text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              {/* Info del cliente seleccionado */}
              {selectedClient && (
                <div className="bg-neutral-50 rounded p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-neutral-500">CUIT:</span> {selectedClient.tax_id || '-'}
                    </div>
                    <div>
                      <span className="text-neutral-500">Email:</span> {selectedClient.email || '-'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-500">Domicilio:</span> {selectedClient.address || '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* Moneda */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
                    className="h-9 w-full text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                  >
                    <option value="ARS">ARS - Pesos</option>
                    <option value="USD">USD - Dólares</option>
                  </select>
                </div>
                {currency === 'USD' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Cotización</label>
                    <input
                      type="number"
                      step="0.01"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                      className="h-9 w-full text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                )}
              </div>

              {/* Detalle de Pagos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-neutral-500 uppercase">Detalle de Pagos</label>
                  <button
                    type="button"
                    onClick={handleAddPaymentItem}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {paymentItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.payment_type}
                        onChange={(e) => handlePaymentItemChange(index, 'payment_type', e.target.value)}
                        className="h-8 w-40 text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                      >
                        {PAYMENT_TYPES.map(pt => (
                          <option key={pt.value} value={pt.value}>{pt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Descripción"
                        value={item.description}
                        onChange={(e) => handlePaymentItemChange(index, 'description', e.target.value)}
                        className="h-8 flex-1 text-sm border border-neutral-200 rounded px-2 focus:outline-none focus:border-neutral-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Importe"
                        value={item.amount || ''}
                        onChange={(e) => handlePaymentItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="h-8 w-32 text-sm border border-neutral-200 rounded px-2 text-right font-mono focus:outline-none focus:border-neutral-400"
                      />
                      {paymentItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentItem(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right">
                  <span className="text-sm text-neutral-500">Total: </span>
                  <span className="font-bold font-mono">{formatCurrency(totalPagos)}</span>
                </div>
              </div>

              {/* Comprobantes a cancelar */}
              {selectedClientId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase">
                      Facturas a Cancelar
                    </label>
                    {cancelledInvoices.length > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        {cancelledInvoices.length} seleccionada{cancelledInvoices.length > 1 ? 's' : ''} · {formatCurrency(cancelledInvoices.reduce((s, ci) => s + ci.amount_applied, 0))}
                      </span>
                    )}
                  </div>
                  
                  {/* Tabla de facturas pendientes del cliente */}
                  {clientInvoices.length > 0 ? (
                    <div className="border border-neutral-200 rounded overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0">
                          <tr className="bg-neutral-100 text-xs">
                            <th className="px-2 py-1.5 text-left w-8"></th>
                            <th className="px-2 py-1.5 text-left">Nº Factura</th>
                            <th className="px-2 py-1.5 text-left">Fecha</th>
                            <th className="px-2 py-1.5 text-right">Total</th>
                            <th className="px-2 py-1.5 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientInvoices.map(inv => {
                            const isSelected = cancelledInvoices.some(ci => ci.invoice_id === inv.id);
                            return (
                              <tr 
                                key={inv.id} 
                                className={`border-t border-neutral-100 cursor-pointer hover:bg-neutral-50 ${isSelected ? 'bg-green-50' : ''}`}
                                onClick={() => isSelected ? handleRemoveInvoice(cancelledInvoices.findIndex(ci => ci.invoice_id === inv.id)) : handleAddInvoice(inv)}
                              >
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-orange-500 rounded border-neutral-300 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="px-2 py-1.5 font-mono text-xs">{inv.invoice_number}</td>
                                <td className="px-2 py-1.5 text-xs">{formatDate(inv.issue_date)}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-medium">{formatCurrency(Number(inv.total))}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    inv.payment_status === 'partial' 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-red-50 text-red-600'
                                  }`}>
                                    {inv.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-neutral-200 rounded p-4 text-center text-neutral-400 text-sm">
                      Este cliente no tiene facturas pendientes de cobro
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Observaciones</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:border-neutral-400"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-neutral-500">Total a registrar: </span>
                <span className="text-xl font-bold font-mono">{formatCurrency(totalPagos)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="h-8 px-3 text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedClientId || totalPagos <= 0}
                  className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Recibo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

