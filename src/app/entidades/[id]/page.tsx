import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { EditEntityForm } from "./edit-entity-form";

async function getEntity(id: number) {
  const { data } = await supabase
    .from('mercure_entities')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export default async function EditEntityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/entidades");
  const { id } = await params;
  const entity = await getEntity(parseInt(id));

  if (!entity) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="border-b border-neutral-200 pb-3 mb-6">
            <h1 className="text-lg font-medium text-neutral-900">Editar Entidad</h1>
            <p className="text-sm text-neutral-500 mt-1">{entity.legal_name}</p>
          </div>
          <EditEntityForm entity={entity} />
        </div>
      </main>
    </div>
  );
}

