"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Check, 
  Loader2, 
  Download, 
  History,
  Zap,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  generada: 'Generada',
  enviada: 'Enviada',
  conformada: 'Conformada',
  disputada: 'Disputada',
  facturada: 'Facturada',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

interface ClientDetailProps {
  clientId: number;
  clientName: string;
  clientTaxId: string | null;
}

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  created_at: string;
  recipient_name: string;
  origin: string;
  destination: string;
  package_quantity: number | null;
  weight_kg: number | null;
  declared_value: number | null;
  calculated_amount: number;
  quotation_id: string | null;
}

interface Settlement {
  id: number;
  settlement_number: number;
  settlement_date: string;
  total_amount: number;
  status: string;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  cae: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string, includeTime = false): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(date).toLocaleDateString('es-AR', options);
}

export function ClientDetail({ clientId, clientName, clientTaxId }: ClientDetailProps) {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'remitos' | 'historico'>('remitos');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [facturando, setFacturando] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: shipmentsData } = await supabase
        .from('mercure_shipments')
        .select(`
          id,
          delivery_note_number,
          created_at,
          package_quantity,
          weight_kg,
          declared_value,
          quotation_id,
          recipient:mercure_entities!recipient_id(legal_name)
        `)
        .eq('sender_id', clientId)
        .eq('status', 'rendida')
        .order('created_at', { ascending: false });

      // Cargar precios de cotizaciones asociadas
      const mappedShipments: Shipment[] = await Promise.all(
        (shipmentsData || []).map(async (s) => {
          const recipientData = s.recipient as { legal_name: string } | { legal_name: string }[] | null;
          const recipient = Array.isArray(recipientData) ? recipientData[0] : recipientData;
          const declaredValue = s.declared_value || 0;
          
          // Buscar precio de la cotización asociada
          let calculatedAmount = 0;
          if (s.quotation_id) {
            const { data: quotation } = await supabase
              .from('mercure_quotations')
              .select('total_price')
              .eq('id', s.quotation_id)
              .single();
            calculatedAmount = quotation?.total_price || 0;
          }

          return {
            id: s.id,
            delivery_note_number: s.delivery_note_number,
            created_at: s.created_at,
            recipient_name: recipient?.legal_name || '-',
            origin: 'LANUS',
            destination: 'SALTA',
            package_quantity: s.package_quantity,
            weight_kg: s.weight_kg,
            declared_value: declaredValue,
            calculated_amount: calculatedAmount,
            quotation_id: s.quotation_id,
          };
        })
      );

      setShipments(mappedShipments);
      setSelectedShipments(new Set(mappedShipments.map(s => s.id)));

      const { data: settlementsData } = await supabase
        .from('mercure_client_settlements')
        .select('id, settlement_number, settlement_date, total_amount, status, invoice_number, invoice_pdf_url, cae')
        .eq('entity_id', clientId)
        .order('settlement_date', { ascending: false });

      setSettlements(settlementsData || []);
      setLoading(false);
    }

    loadData();
  }, [clientId]);

  const toggleShipment = (id: number) => {
    const newSelection = new Set(selectedShipments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedShipments(newSelection);
  };

  const toggleAll = () => {
    if (selectedShipments.size === shipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(shipments.map(s => s.id)));
    }
  };

  const selectedTotal = shipments
    .filter(s => selectedShipments.has(s.id))
    .reduce((acc, s) => acc + s.calculated_amount, 0);

  const handleGenerateSettlement = async () => {
    if (selectedShipments.size === 0) return;

    setGenerating(true);
    try {
      const selectedShipmentsData = shipments.filter(s => selectedShipments.has(s.id));
      
      // Cargar cotizaciones para obtener desglose de flete y seguro
      const shipmentsWithQuotations = await Promise.all(
        selectedShipmentsData.map(async (s) => {
          let fleteAmount = 0;
          let seguroAmount = 0;
          
          if (s.quotation_id) {
            const { data: quotation } = await supabase
              .from('mercure_quotations')
              .select('base_price, insurance_cost')
              .eq('id', s.quotation_id)
              .single();
            fleteAmount = quotation?.base_price || 0;
            seguroAmount = quotation?.insurance_cost || 0;
          }
          
          return { ...s, fleteAmount, seguroAmount };
        })
      );
      
      const subtotalFlete = shipmentsWithQuotations.reduce((acc, s) => acc + s.fleteAmount, 0);
      const subtotalSeguro = shipmentsWithQuotations.reduce((acc, s) => acc + s.seguroAmount, 0);
      const subtotal = subtotalFlete + subtotalSeguro;
      const iva = subtotal * 0.21;
      const total = subtotal + iva;

      const { data: maxData } = await supabase
        .from('mercure_client_settlements')
        .select('settlement_number')
        .order('settlement_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextNumber = (maxData?.settlement_number || 0) + 1;

      const { data: settlement, error } = await supabase
        .from('mercure_client_settlements')
        .insert({
          settlement_number: nextNumber,
          entity_id: clientId,
          generated_by: user?.id || 'unknown',
          generated_by_name: user?.fullName || user?.firstName || 'Usuario',
          subtotal_flete: subtotalFlete,
          subtotal_seguro: subtotalSeguro,
          subtotal_iva: iva,
          total_amount: total,
          status: 'generada',
        })
        .select()
        .single();

      if (error) throw error;

      const items = shipmentsWithQuotations.map((s, index) => ({
        settlement_id: settlement.id,
        shipment_id: s.id,
        delivery_note_number: s.delivery_note_number || `#${s.id}`,
        emission_date: s.created_at,
        recipient_name: s.recipient_name,
        origin: s.origin,
        destination: s.destination,
        package_quantity: s.package_quantity,
        weight_kg: s.weight_kg,
        flete_amount: s.fleteAmount,
        seguro_amount: s.seguroAmount,
        total_amount: s.calculated_amount,
        sort_order: index,
      }));

      await supabase.from('mercure_settlement_items').insert(items);

      await supabase
        .from('mercure_shipments')
        .update({ status: 'facturada' })
        .in('id', Array.from(selectedShipments));

      router.push(`/liquidaciones/${settlement.id}`);
    } catch (error) {
      console.error('Error generando liquidación:', error);
      alert('Error al generar la liquidación');
    } finally {
      setGenerating(false);
    }
  };

  const handleFacturar = async (settlementId: number) => {
    if (!clientTaxId) {
      alert('El cliente no tiene CUIT cargado');
      return;
    }

    setFacturando(settlementId);
    try {
      const response = await fetch('/api/afip/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: settlementId,
          invoice_type: 'A',
          point_of_sale: 4,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al facturar');
      }

      alert(`Factura generada!\nCAE: ${result.cae}\nNúmero: ${result.invoiceNumber}`);
      
      // Recargar liquidaciones
      const { data: settlementsData } = await supabase
        .from('mercure_client_settlements')
        .select('id, settlement_number, settlement_date, total_amount, status, invoice_number, invoice_pdf_url, cae')
        .eq('entity_id', clientId)
        .order('settlement_date', { ascending: false });

      setSettlements(settlementsData || []);
    } catch (error) {
      console.error('Error facturando:', error);
      alert(error instanceof Error ? error.message : 'Error al facturar');
    } finally {
      setFacturando(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 text-neutral-400" />
        <span className="text-sm text-neutral-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4 text-sm">
        <button
          onClick={() => setActiveTab('remitos')}
          className={`pb-1 transition-colors ${
            activeTab === 'remitos'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Remitos pendientes {shipments.length > 0 && <span className="text-neutral-400">({shipments.length})</span>}
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`pb-1 transition-colors ${
            activeTab === 'historico'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Histórico {settlements.length > 0 && <span className="text-neutral-400">({settlements.length})</span>}
        </button>
      </div>

      {/* Tab: Remitos */}
      {activeTab === 'remitos' && (
        <div>
          {shipments.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">
              No hay remitos pendientes
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={toggleAll} className="text-xs text-neutral-600 hover:text-neutral-900">
                  {selectedShipments.size === shipments.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-neutral-500">{selectedShipments.size} seleccionados</span>
                  <span className="font-medium font-mono">${formatCurrency(selectedTotal)}</span>
                </div>
              </div>

              <div className="border border-neutral-200 rounded overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        onClick={() => toggleShipment(shipment.id)}
                        className={`border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${
                          selectedShipments.has(shipment.id) ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedShipments.has(shipment.id) ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                          }`}>
                            {selectedShipments.has(shipment.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-900">
                          {shipment.delivery_note_number || `#${shipment.id}`}
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs">
                          {formatDate(shipment.created_at)}
                        </td>
                        <td className="px-3 py-2 text-neutral-600 truncate max-w-[150px]">
                          {shipment.recipient_name}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ${formatCurrency(shipment.calculated_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateSettlement}
                  disabled={selectedShipments.size === 0 || generating}
                  className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-sm rounded flex items-center gap-2 transition-colors"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
                  ) : (
                    <>Liquidar seleccionados<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === 'historico' && (
        <div>
          {settlements.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">
              No hay liquidaciones anteriores
            </div>
          ) : (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Nro.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Factura</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-neutral-900">#{settlement.settlement_number}</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">{formatDate(settlement.settlement_date)}</td>
                      <td className="px-3 py-2 text-right font-mono">${formatCurrency(settlement.total_amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          settlement.status === 'pagada' || settlement.status === 'conformada' 
                            ? 'bg-neutral-100 text-neutral-700' 
                            : settlement.status === 'facturada' 
                            ? 'bg-neutral-100 text-neutral-600'
                            : settlement.status === 'disputada'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {settlement.cae ? (
                          <span className="text-xs font-mono text-neutral-600">{settlement.invoice_number}</span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/liquidaciones/${settlement.id}`}
                            className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline"
                          >
                            Ver
                          </Link>
                          {!settlement.cae && settlement.status === 'generada' && (
                            <button
                              onClick={() => handleFacturar(settlement.id)}
                              disabled={facturando === settlement.id}
                              className="text-xs px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-1"
                            >
                              {facturando === settlement.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><Zap className="w-3 h-3" />AFIP</>
                              )}
                            </button>
                          )}
                          {settlement.invoice_pdf_url && (
                            <a
                              href={settlement.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
