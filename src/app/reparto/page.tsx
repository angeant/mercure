import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { MapPin } from "lucide-react";

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
  recipient: { legal_name: string } | { legal_name: string }[] | null;
  sender: { legal_name: string } | { legal_name: string }[] | null;
  recipient_address: string | null;
}

// Helper para extraer legal_name de relación
function getLegalName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return '-';
  if (Array.isArray(entity)) return entity[0]?.legal_name || '-';
  return entity.legal_name || '-';
}

async function getShipmentsReparto() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address,
      sender:mercure_entities!sender_id(legal_name), 
      recipient:mercure_entities!recipient_id(legal_name)
    `)
    .eq('status', 'en_reparto')
    .order('created_at', { ascending: false });
  return (data || []) as Shipment[];
}

async function getShipmentsEntregados() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address,
      sender:mercure_entities!sender_id(legal_name), 
      recipient:mercure_entities!recipient_id(legal_name)
    `)
    .in('status', ['entregada', 'delivered', 'no_entregada', 'rechazada'])
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []) as Shipment[];
}

export default async function RepartoPage() {
  await requireAuth("/reparto");

  const [enReparto, entregados] = await Promise.all([
    getShipmentsReparto(),
    getShipmentsEntregados()
  ]);

  const totalCobrar = enReparto
    .filter(s => s.payment_terms === 'contado')
    .reduce((acc, s) => acc + (s.declared_value || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Reparto</h1>
                <p className="text-xs text-neutral-500">
                  {enReparto.length} en calle
                  {totalCobrar > 0 && ` · $${totalCobrar.toLocaleString('es-AR')} a cobrar`}
                </p>
              </div>
            </div>
          </div>

          {/* En reparto */}
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">En Calle</span>
              <span className="text-xs text-neutral-500 ml-2">{enReparto.length} envíos</span>
            </div>
            {enReparto.length === 0 ? (
              <div className="p-4 text-center text-neutral-400 text-sm">
                No hay envíos en reparto
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                  </tr>
                </thead>
                <tbody>
                  {enReparto.map(s => {
                    const isContado = s.payment_terms === 'contado';
                    return (
                      <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                          {s.delivery_note_number && (
                            <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
                          {getLegalName(s.recipient)}
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[250px]">
                          {s.recipient_address || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600">
                          {s.package_quantity || '-'}
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
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Entregados hoy / recientes */}
          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">Finalizados (recientes)</span>
            </div>
            {entregados.length === 0 ? (
              <div className="p-4 text-center text-neutral-400 text-sm">
                Sin entregas recientes
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entregados.map(s => (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                        {s.delivery_note_number && (
                          <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {getLegalName(s.recipient)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          s.status === 'entregada' || s.status === 'delivered'
                            ? 'bg-green-50 text-green-700' 
                            : s.status === 'no_entregada'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {s.status === 'entregada' || s.status === 'delivered' ? 'Entregada' : 
                           s.status === 'no_entregada' ? 'No entregada' : 'Rechazada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

