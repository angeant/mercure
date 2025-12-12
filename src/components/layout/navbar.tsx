"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { UserMenu } from "./user-menu";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  href: string;
  label: string;
  description: string;
}

interface MenuArea {
  label: string;
  items: MenuItem[];
}

const menuAreas: MenuArea[] = [
  {
    label: "Operaciones",
    items: [
      { href: "/", label: "Dashboard", description: "Vista general" },
      { href: "/operaciones/centros", label: "Centros 3D", description: "Vista en tiempo real" },
      { href: "/recepcion", label: "Recepción", description: "Ingreso de mercadería" },
      { href: "/consolidacion", label: "Consolidación", description: "Asignar a viajes" },
      { href: "/envios", label: "Envíos", description: "En tránsito" },
      { href: "/arribo", label: "Arribo", description: "Descarga y disponibles" },
      { href: "/reparto", label: "Reparto", description: "Última milla" },
      { href: "/viajes", label: "Viajes", description: "Planificación" },
      { href: "/vehiculos", label: "Vehículos", description: "Flota de transporte" },
      { href: "/procesos", label: "Procesos", description: "Documentación operativa" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/entidades", label: "Entidades", description: "Clientes y proveedores" },
      { href: "/tarifas", label: "Tarifas", description: "Precios y cotizaciones" },
      { href: "/facturas", label: "Facturas", description: "Facturación y emisión" },
      { href: "/cobranzas", label: "Cobranzas", description: "Gestión de cobros" },
      { href: "/cuentas-corrientes", label: "Cuentas Corrientes", description: "Liquidaciones CC" },
      { href: "/pagos", label: "Pagos", description: "Pagos a proveedores" },
      { href: "/contabilidad", label: "Contabilidad", description: "Asientos y conciliaciones" },
    ],
  },
  {
    label: "RRHH",
    items: [
      { href: "/personal", label: "Personal", description: "Empleados y choferes" },
      { href: "/asistencia", label: "Asistencia", description: "Control de asistencia" },
      { href: "/vacaciones", label: "Vacaciones", description: "Licencias y ausencias" },
      { href: "/liquidaciones", label: "Liquidaciones", description: "Sueldos y recibos" },
      { href: "/legajos", label: "Legajos", description: "Documentación personal" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/whatsapp", label: "WhatsApp", description: "Mensajes automáticos" },
      { href: "/campanas", label: "Campañas", description: "Campañas de comunicación" },
      { href: "/redes", label: "Redes Sociales", description: "Publicaciones y métricas" },
      { href: "/agenda", label: "Agenda", description: "Contactos y seguimiento" },
      { href: "/reportes-mkt", label: "Reportes", description: "Métricas de marketing" },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { canAccessRoute, isLoading } = useUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActiveArea = (items: MenuItem[]) => {
    return items.some(item => 
      pathname === item.href || 
      (item.href !== "/" && pathname.startsWith(item.href))
    );
  };

  // Filtrar items accesibles de cada área
  const getAccessibleItems = (items: MenuItem[]): MenuItem[] => {
    if (isLoading) return items; // Mientras carga, mostrar todos
    return items.filter(item => canAccessRoute(item.href));
  };

  // Obtener áreas con items accesibles
  const accessibleAreas = menuAreas
    .map(area => ({
      ...area,
      items: getAccessibleItems(area.items),
    }))
    .filter(area => area.items.length > 0);

  return (
    <>
      <nav className="h-12 bg-zinc-900 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50" suppressHydrationWarning>
        {/* Mobile: Hamburger left */}
        <button 
          className="md:hidden flex items-center justify-center h-8 w-8 text-white"
          onClick={() => setMobileMenuOpen(true)}
          suppressHydrationWarning
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop: Logo left */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/kalia_logos/kalia_logo_white.svg"
              alt="Kalia"
              width={70}
              height={20}
              priority
            />
          </Link>
          
          <div className="flex items-center gap-1">
            {accessibleAreas.map((area) => (
              <DropdownMenu key={area.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    suppressHydrationWarning
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded transition-colors outline-none ${
                      isActiveArea(area.items)
                        ? "text-white font-medium"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {area.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-56 bg-white border-neutral-200"
                >
                  <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wide">
                    {area.label}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {area.items.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex flex-col items-start gap-0 cursor-pointer ${
                            isActive ? "bg-neutral-50" : ""
                          }`}
                        >
                          <span className={`text-sm ${isActive ? "font-medium text-orange-500" : "text-neutral-900"}`}>
                            {item.label}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {item.description}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </div>

        {/* Mobile: Logo center */}
        <Link href="/" className="md:hidden flex items-center absolute left-1/2 -translate-x-1/2" suppressHydrationWarning>
          <Image
            src="/kalia_logos/kalia_logo_white.svg"
            alt="Kalia"
            width={70}
            height={20}
            priority
          />
        </Link>
        
        <UserMenu />
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          suppressHydrationWarning
        />
      )}

      {/* Mobile menu drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 z-50 transform transition-transform duration-200 ease-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        suppressHydrationWarning
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <Image
            src="/kalia_logos/kalia_logo_white.svg"
            alt="Kalia"
            width={70}
            height={20}
            priority
          />
          <button 
            className="text-white p-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)] py-2" suppressHydrationWarning>
          {accessibleAreas.map((area) => (
            <div key={area.label} className="mb-2">
              <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {area.label}
              </div>
              {area.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 ${isActive ? "bg-zinc-800 text-orange-500" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"}`}
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{item.description}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
