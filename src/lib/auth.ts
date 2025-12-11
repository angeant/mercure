import { supabase } from "./supabase";
import { isSuperAdmin } from "./permissions";

export async function getUserRole(userId: string): Promise<string | null> {
  // Buscar el rol del usuario en mercure_user_roles
  const { data, error } = await supabase
    .from('mercure_user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function hasAccess(userId: string, email?: string | null): Promise<boolean> {
  // Super admins siempre tienen acceso
  if (email && isSuperAdmin(email)) {
    return true;
  }
  
  // Primero obtener el ID de usuario de Supabase desde clerk_id
  const { data: userData } = await supabase
    .from("users")
    .select("id, email")
    .eq("clerk_id", userId)
    .limit(1);

  if (!userData || userData.length === 0) {
    return false;
  }

  const supabaseUserId = userData[0].id;
  const userEmail = email || userData[0].email;

  // Verificar si es super admin por email
  if (userEmail && isSuperAdmin(userEmail)) {
    return true;
  }

  // Verificar si tiene rol activo en mercure_user_roles
  const { data: roleData } = await supabase
    .from("mercure_user_roles")
    .select("role")
    .eq("user_id", supabaseUserId)
    .eq("is_active", true)
    .limit(1);

  return roleData !== null && roleData.length > 0;
}
