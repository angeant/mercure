import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { canAccessConfig, isSuperAdmin, ROLES, SUPER_ADMIN_DOMAIN } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { RoleForm } from "./role-form";

interface UserDisplay {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  role: string | null;
  created_at: string;
  is_kalia: boolean;
}

// ID de la organización Mercure SRL
const MERCURE_ORG_ID = "620245b9-bac0-434b-b32e-2e07e9428751";

// Obtener usuarios de Mercure (los que tienen rol asignado en user_organizations para Mercure)
async function getMercureUsers(): Promise<UserDisplay[]> {
  try {
    // Traer usuarios con rol asignado para la organización Mercure
    const { data: userOrgs, error: orgError } = await supabase
      .from("user_organizations")
      .select("user_id, role")
      .eq("organization_id", MERCURE_ORG_ID)
      .eq("is_active", true);

    if (orgError) {
      console.error("Error fetching user_organizations:", orgError);
      return [];
    }

    if (!userOrgs || userOrgs.length === 0) {
      return [];
    }

    // Traer datos de usuarios
    const userIds = userOrgs.map(o => o.user_id);
    const { data: usersData } = await supabase
      .from("users")
      .select("id, email, name, avatar_url, created_at")
      .in("id", userIds);

    const users: UserDisplay[] = userOrgs.map(org => {
      const userData = usersData?.find(u => u.id === org.user_id);
      const email = userData?.email || "";
      return {
        id: org.user_id,
        email: email,
        full_name: userData?.name || null,
        image_url: userData?.avatar_url || null,
        role: org.role,
        created_at: userData?.created_at || new Date().toISOString(),
        is_kalia: email.toLowerCase().endsWith(`@${SUPER_ADMIN_DOMAIN}`),
      };
    });

    // Ordenar: primero @kalia.app, luego por nombre
    return users.sort((a, b) => {
      if (a.is_kalia && !b.is_kalia) return -1;
      if (!a.is_kalia && b.is_kalia) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });

  } catch (e) {
    console.error("Error in getMercureUsers:", e);
    return [];
  }
}

// Obtener TODOS los usuarios de Kalia (para Super Admins)
async function getAllUsers(): Promise<UserDisplay[]> {
  try {
    // Traer TODOS los usuarios de public.users
    const { data: usersData, error } = await supabase
      .from("users")
      .select("id, email, name, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    if (!usersData || usersData.length === 0) {
      return [];
    }

    // Traer roles desde user_organizations (solo de Mercure)
    const userIds = usersData.map(u => u.id);
    const { data: userOrgs } = await supabase
      .from("user_organizations")
      .select("user_id, role")
      .eq("organization_id", MERCURE_ORG_ID)
      .in("user_id", userIds);

    const users: UserDisplay[] = usersData.map(u => {
      const email = u.email || "";
      const org = userOrgs?.find(o => o.user_id === u.id);
      return {
        id: u.id,
        email: email,
        full_name: u.name || null,
        image_url: u.avatar_url || null,
        role: org?.role || null,
        created_at: u.created_at || new Date().toISOString(),
        is_kalia: email.toLowerCase().endsWith(`@${SUPER_ADMIN_DOMAIN}`),
      };
    });

    // Ordenar: primero @kalia.app, luego sin rol, luego con rol
    return users.sort((a, b) => {
      if (a.is_kalia && !b.is_kalia) return -1;
      if (!a.is_kalia && b.is_kalia) return 1;
      if (!a.role && b.role) return -1;
      if (a.role && !b.role) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });

  } catch (e) {
    console.error("Error in getAllUsers:", e);
    return [];
  }
}

function getRoleBadgeVariant(role: string | null): "default" | "success" | "warning" | "error" | "info" {
  switch (role) {
    case "super_admin":
    case "admin":
      return "success";
    case "administrativo":
    case "contabilidad":
      return "info";
    case "auxiliar_deposito":
    case "chofer":
      return "warning";
    case "viewer":
      return "default";
    default:
      return "default";
  }
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() || "?";
}

export default async function ConfiguracionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Para super admins, siempre permitir acceso
  const isSuper = isSuperAdmin(userEmail);
  
  if (!isSuper) {
    // Primero buscar el usuario en users por clerk_id
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .limit(1);

    const supabaseUserId = userData?.[0]?.id;

    if (!supabaseUserId) {
      redirect("/");
    }

    // Verificar permisos desde user_organizations
    const { data: currentUserOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", supabaseUserId)
      .eq("organization_id", MERCURE_ORG_ID)
      .eq("is_active", true)
      .limit(1);

    const currentRole = currentUserOrg?.[0]?.role;

    // Solo admins y super admins pueden acceder
    if (!canAccessConfig(currentRole, userEmail)) {
      redirect("/");
    }
  }

  // Traer usuarios de Mercure (solo los que tienen rol o son @kalia.app)
  const mercureUsers = await getMercureUsers();
  
  // Para super admins, traer TODOS los usuarios
  const allUsers = isSuper ? await getAllUsers() : [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Configuración</h1>
              <p className="text-sm text-neutral-500 mt-0.5">Gestión de usuarios y permisos de Mercure</p>
            </div>
          </div>

          {/* Usuarios de Mercure */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Equipo Mercure ({mercureUsers.length})
              </h2>
            </div>

            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Usuario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rol en Mercure</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {mercureUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-neutral-400">
                        No hay usuarios en el equipo de Mercure
                      </td>
                    </tr>
                  ) : (
                    mercureUsers.map((u) => (
                      <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {u.image_url ? (
                              <img 
                                src={u.image_url} 
                                alt={u.full_name || u.email}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                                {getInitials(u.full_name, u.email)}
                              </div>
                            )}
                            <span className="font-medium text-neutral-900">
                              {u.full_name || u.email?.split("@")[0] || "Sin nombre"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {u.email || "-"}
                          {isSuper && u.is_kalia && (
                            <span className="ml-1.5 text-orange-500 text-xs">★</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {u.is_kalia && isSuper ? (
                            <Badge variant="success">Super Admin</Badge>
                          ) : u.role ? (
                            <Badge variant={getRoleBadgeVariant(u.role)}>
                              {ROLES[u.role as keyof typeof ROLES] || u.role}
                            </Badge>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-400 text-xs">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("es-AR") : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roles y permisos */}
          <div>
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Roles y Permisos
            </h2>
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rol</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Accesos</th>
                  </tr>
                </thead>
                <tbody>
                  {isSuper && (
                    <tr className="border-b border-neutral-100">
                      <td className="px-3 py-2 font-medium">Super Admin</td>
                      <td className="px-3 py-2 text-neutral-600">Acceso total al sistema (Kalia)</td>
                      <td className="px-3 py-2"><Badge variant="success">Todo</Badge></td>
                    </tr>
                  )}
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Administrador</td>
                    <td className="px-3 py-2 text-neutral-600">Gestión completa de Mercure</td>
                    <td className="px-3 py-2"><Badge variant="success">Todo</Badge></td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Administrativo</td>
                    <td className="px-3 py-2 text-neutral-600">Operaciones, viajes, tarifas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Recepción, Envíos, Viajes, Vehículos, Entidades, Tarifas</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Auxiliar Depósito</td>
                    <td className="px-3 py-2 text-neutral-600">Control físico de mercadería</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Recepción, Envíos</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Chofer</td>
                    <td className="px-3 py-2 text-neutral-600">Transporte y entregas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Envíos, Viajes</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Atención al Cliente</td>
                    <td className="px-3 py-2 text-neutral-600">Consultas y seguimiento</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Entidades, Dashboard</td>
                  </tr>
                  <tr className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 font-medium">Contabilidad</td>
                    <td className="px-3 py-2 text-neutral-600">Facturación y cobranzas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">CC, Facturas, Cobranzas, Liquidaciones, Pagos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded p-4">
            <p className="text-xs text-neutral-500">
              Los permisos se aplican automáticamente según el rol asignado.
            </p>
          </div>

          {/* Sección exclusiva para Super Admins */}
          {isSuper && (
            <div className="mt-8 pt-6 border-t border-orange-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-orange-500 text-lg">★</span>
                <h2 className="text-sm font-medium text-neutral-900">
                  Panel Super Admin
                </h2>
                <Badge variant="warning" className="text-xs">Solo @kalia.app</Badge>
              </div>
              
              <p className="text-xs text-neutral-500 mb-4">
                Desde aquí podés asignar roles a cualquier usuario de la plataforma.
                Los usuarios sin rol asignado no aparecen en el equipo de Mercure.
              </p>

              <RoleForm 
                users={allUsers.map(u => ({
                  id: u.id,
                  email: u.email,
                  full_name: u.full_name,
                  image_url: u.image_url,
                  role: u.role,
                  is_kalia: u.is_kalia,
                }))} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
