import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default async function VacacionesPage() {
  await requireAuth("/vacaciones");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Vacaciones y Licencias</h1>
            <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
              Nueva Solicitud
            </Button>
          </div>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[550px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Empleado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Desde</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Hasta</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Días</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-neutral-400">Módulo en desarrollo</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
