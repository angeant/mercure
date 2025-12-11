"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ID de la organización Mercure SRL
const MERCURE_ORG_ID = "620245b9-bac0-434b-b32e-2e07e9428751";

interface UserOrganization {
  user_id: string;
  role: string;
}

interface UserProfileData {
  organization: UserOrganization | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUserProfile(): UserProfileData {
  const { user: clerkUser, isLoaded } = useUser();
  const [data, setData] = useState<UserProfileData>({
    organization: null,
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
          setData({ organization: null, isLoading: false, error: null });
          return;
        }

        const userData = usersData?.[0];
        if (!userData) {
          // Usuario no existe en la tabla users - no es error, solo no tiene perfil
          setData({ organization: null, isLoading: false, error: null });
          return;
        }

        // Buscar el rol en user_organizations para Mercure
        const { data: orgsData, error: orgError } = await supabase
          .from("user_organizations")
          .select("user_id, role")
          .eq("user_id", userData.id)
          .eq("organization_id", MERCURE_ORG_ID)
          .eq("is_active", true)
          .limit(1);

        if (orgError) {
          console.error("Error fetching org:", orgError);
          setData({ organization: null, isLoading: false, error: null });
          return;
        }

        setData({
          organization: orgsData?.[0] || null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error in useUserProfile:", error);
        setData({
          organization: null,
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
