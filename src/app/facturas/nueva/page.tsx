import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { NuevaFacturaClient } from "./nueva-factura-client";
import { supabaseAdmin } from "@/lib/supabase";

async function getClientes() {
  if (!supabaseAdmin) return [];
  
  const { data, error } = await supabaseAdmin
    .schema('mercure')
    .from('entities')
    .select('id, legal_name, tax_id')
    .not('tax_id', 'is', null)
    .order('legal_name');

  if (error) {
    console.error("Error loading clients:", error);
    return [];
  }
  
  return data || [];
}

export default async function NuevaFacturaPage() {
  await requireAuth("/facturas/nueva");
  
  const clientes = await getClientes();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <NuevaFacturaClient initialClientes={clientes} />
      </main>
    </div>
  );
}

