import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { Truck } from "lucide-react";

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  paid_by: string | null;
  payment_terms: string | null;
  created_at: string;
  recipient: { legal_name: string } | null;
  sender: { legal_name: string } | null;
  recipient_address: string | null;
  trip_id: number | null;
  trip: { id: number; origin: string; destination: string; departure_date: string } | null;
}

// Estados que se consideran "en tránsito" (despachados)
const TRANSITO_STATUSES = ['en_transito', 'in_transit', 'loaded'];

async function getShipmentsEnTransito() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address, trip_id,
      sender:mercure_entities!sender_id(legal_name), 
      recipient:mercure_entities!recipient_id(legal_name),
      trip:mercure_trips(id, origin, destination, departure_date)
    `)
    .in('status', TRANSITO_STATUSES)
    .order('created_at', { ascending: false });
  return (data || []) as Shipment[];
}

// Agrupar por viaje
function groupByTrip(shipments: Shipment[]) {
  const groups: Record<string, { trip: Shipment['trip']; shipments: Shipment[] }> = {};
  const sinViaje: Shipment[] = [];
  
  shipments.forEach(s => {
    if (s.trip) {
      const key = `trip-${s.trip.id}`;
      if (!groups[key]) {
        groups[key] = { trip: s.trip, shipments: [] };
      }
      groups[key].shipments.push(s);
    } else {
      sinViaje.push(s);
    }
  });
  
  return { groups: Object.values(groups), sinViaje };
}

export default async function EnviosPage() {
  await requireAuth("/envios");

  const shipments = await getShipmentsEnTransito();
  const { groups, sinViaje } = groupByTrip(shipments);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Envíos en Tránsito</h1>
                <p className="text-xs text-neutral-500">{shipments.length} envíos despachados</p>
              </div>
            </div>
          </div>

          {shipments.length === 0 ? (
            <div className="border border-neutral-200 rounded p-8 text-center">
              <p className="text-neutral-400 text-sm">No hay envíos en tránsito</p>
              <p className="text-neutral-300 text-xs mt-1">Los envíos aparecen aquí cuando se despachan en un viaje</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Viajes con envíos */}
              {groups.map(({ trip, shipments: tripShipments }) => (
                <div key={trip?.id} className="border border-neutral-200 rounded overflow-hidden">
                  {/* Header del viaje */}
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link href={`/viajes/${trip?.id}`} className="text-sm font-medium text-neutral-900 hover:text-orange-600">
                        Viaje #{trip?.id}
                      </Link>
                      <span className="text-xs text-neutral-500">
                        {trip?.origin} → {trip?.destination}
                      </span>
                      {trip?.departure_date && (
                        <span className="text-xs text-neutral-400">
                          {new Date(trip.departure_date).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{tripShipments.length} envíos</span>
                  </div>
                  
                  {/* Tabla de envíos */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripShipments.map(s => (
                        <ShipmentRow key={s.id} shipment={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Envíos sin viaje asignado */}
              {sinViaje.length > 0 && (
                <div className="border border-neutral-200 rounded overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                    <span className="text-sm font-medium text-neutral-500">Sin viaje asignado</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sinViaje.map(s => (
                        <ShipmentRow key={s.id} shipment={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ShipmentRow({ shipment: s }: { shipment: Shipment }) {
  const isContado = s.payment_terms === 'contado';
  
  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
        {s.delivery_note_number && (
          <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
        )}
      </td>
      <td className="px-3 py-2 text-neutral-700 truncate max-w-[150px]">
        {s.recipient?.legal_name || '-'}
      </td>
      <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[200px]">
        {s.recipient_address || '-'}
      </td>
      <td className="px-3 py-2 text-right text-neutral-600">
        {s.package_quantity || '-'}
      </td>
      <td className="px-3 py-2 text-right text-neutral-600">
        {s.weight_kg || '-'}
      </td>
      <td className="px-3 py-2 text-right text-neutral-600">
        {s.volume_m3 || '-'}
      </td>
      <td className="px-3 py-2 text-right text-neutral-600">
        {s.declared_value ? `$${s.declared_value.toLocaleString('es-AR')}` : '-'}
      </td>
      <td className="px-3 py-2">
        {isContado ? (
          <span className="text-xs font-medium text-orange-600">Contra entrega</span>
        ) : (
          <span className="text-xs text-neutral-400">Cta Cte</span>
        )}
      </td>
    </tr>
  );
}
