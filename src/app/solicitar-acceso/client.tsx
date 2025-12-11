"use client";

import Image from "next/image";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function SolicitarAccesoClient({ email }: { email: string }) {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/sign-in" });
  };

  const handleRefresh = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/kalia_logos/kalia_logo_black.svg"
            alt="Kalia"
            width={100}
            height={32}
            priority
          />
        </div>

        {/* Ícono */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Mensaje */}
        <h1 className="text-lg font-medium text-neutral-900 mb-2">
          Acceso pendiente
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Tu cuenta <span className="font-medium text-neutral-700">{email}</span> no tiene acceso a Mercure todavía.
        </p>

        {/* Instrucciones */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-medium text-neutral-700 mb-2">Para solicitar acceso:</p>
          <ul className="text-xs text-neutral-500 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">1.</span>
              Contactá al administrador de tu empresa
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">2.</span>
              Indicá tu email: <span className="font-mono text-neutral-600">{email}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">3.</span>
              Esperá la confirmación de acceso
            </li>
          </ul>
        </div>

        {/* Contacto */}
        <div className="border border-neutral-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-neutral-500 mb-3">Contacto del administrador:</p>
          <div className="space-y-2">
            <a 
              href={`mailto:admin@mercure.com.ar?subject=Solicitud de acceso a Kalia - Mercure&body=Hola, solicito acceso al sistema.%0A%0AMi email es: ${email}%0A%0AGracias.`}
              className="flex items-center justify-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              admin@mercure.com.ar
            </a>
            <a 
              href={`https://wa.me/5491112345678?text=Hola, solicito acceso al sistema Kalia - Mercure. Mi email es: ${email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full h-10 text-sm border-neutral-200"
            onClick={handleRefresh}
          >
            Ya tengo acceso, verificar
          </Button>
          <button 
            type="button"
            onClick={handleSignOut}
            className="w-full text-xs text-neutral-400 hover:text-neutral-600"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">
            Powered by <span className="font-medium text-neutral-500">Kalia</span>
          </p>
        </div>
      </div>
    </div>
  );
}
