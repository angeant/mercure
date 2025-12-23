import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { ShipmentList } from "./shipment-list";
import { Suspense } from "react";

const PAGE_SIZE = 25;

interface SearchParams {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}

async function getShipments(params: SearchParams) {
  const page = parseInt(params.page || '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  // Base query
  let query = supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select('*', { count: 'exact' });

  // Filtro por estado
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  } else {
    // Por defecto, mostrar solo estados de recepción
    query = query.in('status', ['received', 'in_warehouse', 'ingresada', 'pending', 'draft']);
  }

  // Filtro por fecha desde
  if (params.from) {
    query = query.gte('created_at', `${params.from}T00:00:00`);
  }

  // Filtro por fecha hasta
  if (params.to) {
    query = query.lte('created_at', `${params.to}T23:59:59`);
  }

  // Ordenar y paginar
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: shipments, error, count } = await query;

  if (error) {
    console.error("Error fetching shipments:", error);
    return { shipments: [], totalCount: 0 };
  }

  if (!shipments || shipments.length === 0) {
    return { shipments: [], totalCount: count || 0 };
  }

  // Obtener los IDs únicos de sender y recipient
  const senderIds = [...new Set(shipments.map(s => s.sender_id).filter(Boolean))];
  const recipientIds = [...new Set(shipments.map(s => s.recipient_id).filter(Boolean))];
  const quotationIds = [...new Set(shipments.map(s => s.quotation_id).filter(Boolean))];
  const allEntityIds = [...new Set([...senderIds, ...recipientIds])];

  // Obtener entidades
  const { data: entities } = await supabaseAdmin!
    .schema('mercure')
    .from('entities')
    .select('id, legal_name')
    .in('id', allEntityIds.length > 0 ? allEntityIds : [0]);

  // Obtener cotizaciones
  const { data: quotations } = await supabaseAdmin!
    .schema('mercure')
    .from('quotations')
    .select('id, total_price')
    .in('id', quotationIds.length > 0 ? quotationIds : [0]);

  const entitiesMap = new Map((entities || []).map(e => [e.id, e]));
  const quotationsMap = new Map((quotations || []).map(q => [q.id, q]));

  // Combinar datos
  let result = shipments.map(s => ({
    ...s,
    sender: s.sender_id ? entitiesMap.get(s.sender_id) || null : null,
    recipient: s.recipient_id ? entitiesMap.get(s.recipient_id) || null : null,
    quotation: s.quotation_id ? quotationsMap.get(s.quotation_id) || null : null,
  }));

  // Filtro de búsqueda (client-side ya que es texto libre)
  if (params.search) {
    const term = params.search.toLowerCase();
    result = result.filter(s =>
      (s.delivery_note_number?.toLowerCase().includes(term)) ||
      (s.sender?.legal_name?.toLowerCase().includes(term)) ||
      (s.recipient?.legal_name?.toLowerCase().includes(term))
    );
  }

  return { shipments: result, totalCount: count || 0 };
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="h-8 bg-neutral-100 rounded flex-1"></div>
        <div className="h-8 w-40 bg-neutral-100 rounded"></div>
      </div>
      <div className="h-8 bg-neutral-100 rounded mb-3 w-64"></div>
      <div className="border border-neutral-200 rounded p-8 text-center text-neutral-400">
        Cargando envíos...
      </div>
    </div>
  );
}

async function ShipmentListWrapper({ searchParams }: { searchParams: SearchParams }) {
  const { shipments, totalCount } = await getShipments(searchParams);
  const currentPage = parseInt(searchParams.page || '1', 10);

  return (
    <ShipmentList
      shipments={shipments}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      filters={{
        search: searchParams.search,
        status: searchParams.status,
        dateFrom: searchParams.from,
        dateTo: searchParams.to,
      }}
    />
  );
}

export default async function RecepcionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAuth("/recepcion");
  
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Recepción</h1>
            </div>
            <Link href="/recepcion/nueva">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nueva Recepción
              </Button>
            </Link>
          </div>

          <Suspense fallback={<LoadingState />}>
            <ShipmentListWrapper searchParams={params} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
