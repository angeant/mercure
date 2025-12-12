"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  PERMISSION_CATEGORIES, 
  PERMISSION_LABELS,
  Permission,
  ROLE_PERMISSIONS,
  Role,
  ROLES
} from "@/lib/permissions";
import { updateUserPermissions, addUserToOrg } from "./actions";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  is_kalia: boolean;
}

interface AddUserFormProps {
  availableUsers: User[];
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

export function AddUserForm({ availableUsers }: AddUserFormProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Aplicar preset de rol
  const applyRolePreset = (role: Role) => {
    const rolePerms = ROLE_PERMISSIONS[role];
    const newPermissions: Record<string, boolean> = {};
    rolePerms.forEach(p => {
      newPermissions[p] = true;
    });
    setPermissions(newPermissions);
  };

  // Toggle individual
  const togglePermission = (permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  // Toggle toda la categoría
  const toggleCategory = (categoryPermissions: readonly string[]) => {
    const allEnabled = categoryPermissions.every(p => permissions[p]);
    const newPermissions = { ...permissions };
    categoryPermissions.forEach(p => {
      newPermissions[p] = !allEnabled;
    });
    setPermissions(newPermissions);
  };

  // Guardar
  const handleSave = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      // Primero agregar a la org
      const addResult = await addUserToOrg(selectedUser.id);
      if (addResult.error) {
        setMessage({ type: "error", text: addResult.error });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Luego guardar permisos
      const result = await updateUserPermissions(selectedUser.id, permissions);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Permisos asignados a ${selectedUser.email}` });
        setSelectedUser(null);
        setPermissions({});
        setShowForm(false);
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  // Contar permisos activos
  const activeCount = Object.values(permissions).filter(Boolean).length;

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
      >
        + Agregar usuario
      </Button>
    );
  }

  return (
    <div className="border border-orange-200 rounded p-4 bg-orange-50/30 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Agregar usuario al equipo</h3>
        <button
          onClick={() => {
            setShowForm(false);
            setSelectedUser(null);
            setPermissions({});
          }}
          className="text-neutral-400 hover:text-neutral-600"
        >
          ✕
        </button>
      </div>

      {/* Mensaje */}
      {message && (
        <div className={`p-2 rounded text-xs ${
          message.type === "success" 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Selector de usuario */}
      <div>
        <label className="text-xs font-medium text-neutral-600 mb-1 block">
          Seleccionar usuario
        </label>
        <select
          value={selectedUser?.id || ""}
          onChange={(e) => {
            const user = availableUsers.find(u => u.id === e.target.value);
            setSelectedUser(user || null);
            setPermissions({});
          }}
          className="w-full h-8 px-3 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
        >
          <option value="">Seleccionar...</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email?.split("@")[0]} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <>
          {/* Presets rápidos */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-2 block">
              Aplicar preset (opcional)
            </label>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(ROLES) as [Role, string][])
                .filter(([key]) => key !== "super_admin")
                .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => applyRolePreset(key)}
                  className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-100 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Matriz de permisos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-600">
                Permisos individuales
              </label>
              <Badge variant="info" className="text-[10px]">
                {activeCount} seleccionados
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => {
                const allEnabled = category.permissions.every(p => permissions[p]);
                const someEnabled = category.permissions.some(p => permissions[p]);
                
                return (
                  <div 
                    key={catKey}
                    className="border border-neutral-200 rounded p-2 bg-white"
                  >
                    {/* Header de categoría */}
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-neutral-100">
                      <span className="text-xs font-medium text-neutral-700">
                        {category.label}
                      </span>
                      <button
                        onClick={() => toggleCategory(category.permissions)}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          allEnabled 
                            ? "bg-orange-100 text-orange-700" 
                            : someEnabled
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-neutral-50 text-neutral-400"
                        }`}
                      >
                        {allEnabled ? "Quitar todos" : "Todos"}
                      </button>
                    </div>
                    
                    {/* Permisos */}
                    <div className="space-y-1">
                      {category.permissions.map((permission) => (
                        <div 
                          key={permission}
                          className="flex items-center justify-between py-0.5"
                        >
                          <span className="text-xs text-neutral-600">
                            {PERMISSION_LABELS[permission]}
                          </span>
                          <Checkbox
                            checked={permissions[permission] || false}
                            onCheckedChange={() => togglePermission(permission)}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
            <Button
              onClick={() => {
                setShowForm(false);
                setSelectedUser(null);
                setPermissions({});
              }}
              variant="outline"
              className="h-8 px-3 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || activeCount === 0}
              className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar permisos"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

