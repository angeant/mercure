import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

async function getVehicles() {
  const { data } = await supabase
    .from('mercure_vehicles')
    .select('*')
    .order('identifier', { ascending: true });
  return data || [];
}

export default async function VehiculosPage() {
  // Verificar autenticación y permiso para esta ruta
  await requireAuth("/vehiculos");

  const vehicles = await getVehicles();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Vehículos</h1>
            <Link href="/vehiculos/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nuevo Vehículo
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Identificador</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Patente Tractor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Patente Semi</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Pallets</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Peso Máx</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Sin vehículos</td></tr>
                  ) : (
                    vehicles.map((v: Record<string, unknown>) => (
                      <tr key={v.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2 font-medium">{v.identifier as string}</td>
                        <td className="px-3 py-2 font-mono text-neutral-600">{(v.tractor_license_plate as string) || '-'}</td>
                        <td className="px-3 py-2 font-mono text-neutral-600">{(v.trailer_license_plate as string) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600">{v.pallet_capacity ? `${v.pallet_capacity}` : '-'}</td>
                        <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">{v.weight_capacity_kg ? `${Number(v.weight_capacity_kg).toLocaleString('es-AR')}kg` : '-'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={v.is_active ? 'success' : 'error'}>
                            {v.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-neutral-400 text-xs truncate max-w-[120px]">{(v.notes as string) || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
