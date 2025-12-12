import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";
import { isSuperAdmin, canAccessRoute, Permission, hasPermission } from "./permissions";

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

// Helper para obtener el rol del usuario actual autenticado
export async function getCurrentUserRole(): Promise<{ role: string | null; email: string | null; userId: string | null }> {
  const { userId } = await auth();
  
  if (!userId) {
    return { role: null, email: null, userId: null };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || null;

  // Super admins tienen rol especial
  if (userEmail && isSuperAdmin(userEmail)) {
    return { role: "super_admin", email: userEmail, userId };
  }

  // Buscar usuario en Supabase
  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .limit(1);

  if (!userData || userData.length === 0) {
    return { role: null, email: userEmail, userId };
  }

  // Buscar rol en mercure_user_roles
  const { data: roleData } = await supabase
    .from("mercure_user_roles")
    .select("role")
    .eq("user_id", userData[0].id)
    .eq("is_active", true)
    .limit(1);

  return { 
    role: roleData?.[0]?.role || null, 
    email: userEmail,
    userId 
  };
}

// Helper para proteger páginas server-side
export async function requireAuth(pathname: string) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Verificar si tiene acceso base (rol asignado o super admin)
  const userHasAccess = await hasAccess(userId, userEmail);
  if (!userHasAccess) {
    redirect("/solicitar-acceso");
  }

  // Obtener rol para verificar permisos de ruta
  const { role } = await getCurrentUserRole();

  // Verificar si puede acceder a esta ruta específica
  if (!canAccessRoute(role, userEmail, pathname)) {
    redirect("/");
  }

  return { userId, userEmail, role };
}

// Helper para verificar permiso específico en página
export async function requirePermission(permission: Permission) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  const { role } = await getCurrentUserRole();

  if (!hasPermission(role, userEmail, permission)) {
    redirect("/");
  }

  return { userId, userEmail, role };
}
