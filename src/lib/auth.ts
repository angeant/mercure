import { supabase } from "./supabase";

export async function getUserRole(userId: string): Promise<string | null> {
  // Buscar el perfil del usuario en mercure_profiles
  const { data, error } = await supabase
    .from('mercure_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function hasAccess(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role !== null;
}
