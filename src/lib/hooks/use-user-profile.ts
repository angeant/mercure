"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface MercureUserRole {
  user_id: string;
  role: string;
}

interface UserProfileData {
  mercureRole: MercureUserRole | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUserProfile(): UserProfileData {
  const { user: clerkUser, isLoaded } = useUser();
  const [data, setData] = useState<UserProfileData>({
    mercureRole: null,
    isLoading: true,
    error: null,
  });

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

  return data;
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
