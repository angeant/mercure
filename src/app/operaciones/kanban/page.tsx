import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { KanbanBoard } from "./kanban-board";

interface ShipmentWithRelations {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  recipient_address: string | null;
  created_at: string;
  updated_at: string;
  trip_id: number | null;
  quotation_id: string | null;
  sender: { legal_name: string } | null;
  recipient: { legal_name: string } | null;
  trip: { 
    id: number;
    origin: string;
    destination: string;
    status: string;
    departure_time: string | null;
  } | null;
  quotation: {
    total_price: number;
    base_price: number;
    insurance_cost: number | null;
  } | null;
}

async function getShipments(): Promise<ShipmentWithRelations[]> {
  // Obtener envíos de los últimos 30 días que no estén cancelados
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Paso 1: Obtener shipments sin relaciones
  const { data: shipments, error: shipmentError } = await supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select('id, delivery_note_number, status, package_quantity, weight_kg, volume_m3, declared_value, recipient_address, created_at, updated_at, trip_id, quotation_id, sender_id, recipient_id')
    .neq('status', 'cancelled')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (shipmentError) {
    console.error('Error fetching shipments for Kanban:', shipmentError);
    return [];
  }

  if (!shipments || shipments.length === 0) {
    console.log('[Kanban] No shipments found');
    return [];
  }

  console.log(`[Kanban] Loaded ${shipments.length} shipments`);

  // Paso 2: Obtener IDs únicos para relaciones
  const senderIds = [...new Set(shipments.map(s => s.sender_id).filter(Boolean))];
  const recipientIds = [...new Set(shipments.map(s => s.recipient_id).filter(Boolean))];
  const allEntityIds = [...new Set([...senderIds, ...recipientIds])];
  const tripIds = [...new Set(shipments.map(s => s.trip_id).filter(Boolean))];
  const quotationIds = [...new Set(shipments.map(s => s.quotation_id).filter(Boolean))];

  // Paso 3: Obtener entidades, trips y quotations en paralelo
  const [entitiesRes, tripsRes, quotationsRes] = await Promise.all([
    allEntityIds.length > 0 
      ? supabaseAdmin!.schema('mercure').from('entities').select('id, legal_name').in('id', allEntityIds)
      : { data: [] },
    tripIds.length > 0 
      ? supabaseAdmin!.schema('mercure').from('trips').select('id, origin, destination, status, departure_time').in('id', tripIds)
      : { data: [] },
    quotationIds.length > 0 
      ? supabaseAdmin!.schema('mercure').from('quotations').select('id, total_price, base_price, insurance_cost').in('id', quotationIds)
      : { data: [] },
  ]);

  // Crear mapas para lookup rápido
  const entitiesMap = new Map((entitiesRes.data || []).map(e => [e.id, e]));
  const tripsMap = new Map((tripsRes.data || []).map(t => [t.id, t]));
  const quotationsMap = new Map((quotationsRes.data || []).map(q => [q.id, q]));

  // Paso 4: Combinar datos
  return shipments.map(s => ({
    id: s.id,
    delivery_note_number: s.delivery_note_number,
    status: s.status,
    package_quantity: s.package_quantity,
    weight_kg: s.weight_kg,
    volume_m3: s.volume_m3,
    declared_value: s.declared_value,
    recipient_address: s.recipient_address,
    created_at: s.created_at,
    updated_at: s.updated_at,
    trip_id: s.trip_id,
    quotation_id: s.quotation_id,
    sender: s.sender_id ? entitiesMap.get(s.sender_id) || null : null,
    recipient: s.recipient_id ? entitiesMap.get(s.recipient_id) || null : null,
    trip: s.trip_id ? tripsMap.get(s.trip_id) || null : null,
    quotation: s.quotation_id ? quotationsMap.get(s.quotation_id) || null : null,
  })) as ShipmentWithRelations[];
}

export default async function KanbanPage() {
  await requireAuth("/operaciones/kanban");

  const shipments = await getShipments();

  // Agrupar por columnas del kanban
  const columns = {
    recepcion: shipments.filter(s => 
      ['received', 'in_warehouse', 'ingresada'].includes(s.status) && !s.trip_id
    ),
    enViaje: shipments.filter(s => 
      ['loaded', 'in_transit'].includes(s.status) || 
      (s.trip_id && s.trip?.status === 'in_transit')
    ),
    enDestino: shipments.filter(s => 
      s.trip?.status === 'arrived' && s.status !== 'delivered'
    ),
    entregado: shipments.filter(s => s.status === 'delivered'),
  };

  // Totales
  const totals = {
    recepcion: columns.recepcion.length,
    enViaje: columns.enViaje.length,
    enDestino: columns.enDestino.length,
    entregado: columns.entregado.length,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Kanban Operativo</h1>
              <p className="text-xs text-neutral-500">Flujo de mercadería en tiempo real · Últimos 30 días</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-neutral-600">{totals.recepcion + totals.enViaje + totals.enDestino} activos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-neutral-600">{totals.entregado} entregados</span>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <KanbanBoard columns={columns} />
        </div>
      </main>
    </div>
  );
}

