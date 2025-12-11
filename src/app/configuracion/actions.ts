"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// ID de la organización Mercure SRL
const MERCURE_ORG_ID = "620245b9-bac0-434b-b32e-2e07e9428751";

export async function assignRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden asignar roles
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  const targetUserId = formData.get("userId") as string;
  const targetEmail = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!targetUserId || !role) {
    return { error: "Datos incompletos" };
  }

  // No permitir cambiar rol de super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede cambiar el rol de un Super Admin" };
  }

  try {
    // Verificar si ya existe un registro para este usuario en Mercure
    const { data: existing } = await supabaseAdmin
      .from("user_organizations")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("organization_id", MERCURE_ORG_ID)
      .limit(1);

    if (existing && existing.length > 0) {
      // Actualizar rol existente
      const { error } = await supabaseAdmin
        .from("user_organizations")
        .update({ role, is_active: true })
        .eq("user_id", targetUserId)
        .eq("organization_id", MERCURE_ORG_ID);

      if (error) throw error;
    } else {
      // Insertar nuevo registro
      const { error } = await supabaseAdmin
        .from("user_organizations")
        .insert({ 
          user_id: targetUserId, 
          organization_id: MERCURE_ORG_ID,
          role,
          is_active: true
        });

      if (error) throw error;
    }

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error assigning role:", e);
    return { error: "Error al asignar rol" };
  }
}

export async function removeRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden remover roles
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  const targetUserId = formData.get("userId") as string;
  const targetEmail = formData.get("email") as string;

  if (!targetUserId) {
    return { error: "Datos incompletos" };
  }

  // No permitir modificar super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede modificar a un Super Admin" };
  }

  try {
    // Desactivar el usuario en Mercure (no borrar para mantener historial)
    const { error } = await supabaseAdmin
      .from("user_organizations")
      .update({ is_active: false })
      .eq("user_id", targetUserId)
      .eq("organization_id", MERCURE_ORG_ID);

    if (error) throw error;

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error removing role:", e);
    return { error: "Error al remover rol" };
  }
}
