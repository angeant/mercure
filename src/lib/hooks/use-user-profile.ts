"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Permission, 
  hasPermission, 
  canAccessRoute, 
  getAccessibleModules,
  isSuperAdmin 
} from "@/lib/permissions";

interface MercureUserRole {
  user_id: string;
  role: string;
}

interface UserProfileData {
  mercureRole: MercureUserRole | null;
  role: string | null;
  email: string | null;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
  // Métodos de permisos
  can: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  accessibleModules: Permission[];
}

export function useUserProfile(): UserProfileData {
  const { user: clerkUser, isLoaded } = useUser();
  const [data, setData] = useState<{
    mercureRole: MercureUserRole | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    mercureRole: null,
    isLoading: true,
    error: null,
  });

  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || null;
  const role = data.mercureRole?.role || null;
  const isSuper = isSuperAdmin(userEmail);

  // Método para verificar permisos
  const can = useCallback((permission: Permission): boolean => {
    return hasPermission(role, userEmail, permission);
  }, [role, userEmail]);

  // Método para verificar acceso a rutas
  const canAccessRouteFn = useCallback((pathname: string): boolean => {
    return canAccessRoute(role, userEmail, pathname);
  }, [role, userEmail]);

  // Módulos accesibles
  const accessibleModules = getAccessibleModules(role, userEmail);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!isLoaded || !clerkUser) {
        setData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Buscar el usuario en public.users por clerk_id
        const { data: usersData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", clerkUser.id)
          .limit(1);

        if (userError) {
          console.error("Error fetching user:", userError);
          setData({ mercureRole: null, isLoading: false, error: null });
          return;
        }

        const userData = usersData?.[0];
        if (!userData) {
          // Usuario no existe en la tabla users - no es error, solo no tiene perfil
          setData({ mercureRole: null, isLoading: false, error: null });
          return;
        }

        // Buscar el rol en mercure_user_roles
        const { data: rolesData, error: roleError } = await supabase
          .from("mercure_user_roles")
          .select("user_id, role")
          .eq("user_id", userData.id)
          .eq("is_active", true)
          .limit(1);

        if (roleError) {
          console.error("Error fetching mercure role:", roleError);
          setData({ mercureRole: null, isLoading: false, error: null });
          return;
        }

        setData({
          mercureRole: rolesData?.[0] || null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error in useUserProfile:", error);
        setData({
          mercureRole: null,
          isLoading: false,
          error: null,
        });
      }
    }

    fetchUserProfile();
  }, [clerkUser, isLoaded]);

  return {
    ...data,
    role,
    email: userEmail,
    isSuperAdmin: isSuper,
    can,
    canAccessRoute: canAccessRouteFn,
    accessibleModules,
  };
}

// Labels para roles
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  owner: "Propietario",
  member: "Miembro",
  viewer: "Visor",
  editor: "Editor",
  auxiliar_deposito: "Auxiliar Depósito",
  administrativo: "Administrativo",
  chofer: "Chofer",
  atencion_cliente: "Atención al Cliente",
  contabilidad: "Contabilidad",
};
