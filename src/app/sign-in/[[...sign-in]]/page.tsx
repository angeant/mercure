"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/kalia_logos/kalia_logo_black.svg"
            alt="Kalia"
            width={100}
            height={32}
            priority
            className="mb-6"
          />
          <h1 className="text-lg font-medium text-neutral-900">Acceder a Kalia</h1>
          <p className="text-sm text-neutral-500 mt-1">Ingresá tu email para continuar</p>
        </div>

        <SignIn.Root>
          {/* Step 1: Email */}
          <SignIn.Step name="start">
            <div className="space-y-4">
              <Clerk.Field name="identifier">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-xs font-medium">Email</Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    className="mt-1 h-10 text-sm border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                  Continuar
                </Button>
              </SignIn.Action>

              <Clerk.GlobalError className="text-red-500 text-xs text-center" />
            </div>
          </SignIn.Step>

          {/* Step 2: Código OTP */}
          <SignIn.Step name="verifications">
            <SignIn.Strategy name="email_code">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-neutral-900 font-medium text-sm">Revisá tu email</p>
                  <p className="text-neutral-500 text-xs mt-1">Te enviamos un código de verificación</p>
                </div>

                <Clerk.Field name="code">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-xs font-medium">Código</Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      placeholder="123456"
                      className="mt-1 h-10 text-sm border-neutral-200 focus:border-neutral-400 focus:ring-0 text-center tracking-widest"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                    Verificar
                  </Button>
                </SignIn.Action>

                <SignIn.Action resend asChild>
                  <button type="button" className="w-full text-xs text-neutral-500 hover:text-neutral-900">
                    ¿No recibiste el código? Reenviar
                  </button>
                </SignIn.Action>

                <SignIn.Action navigate="start" asChild>
                  <button type="button" className="w-full text-xs text-neutral-400 hover:text-neutral-600">
                    ← Cambiar email
                  </button>
                </SignIn.Action>

                <Clerk.GlobalError className="text-red-500 text-xs text-center" />
              </div>
            </SignIn.Strategy>

            {/* Fallback password */}
            <SignIn.Strategy name="password">
              <div className="space-y-4">
                <Clerk.Field name="password">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-xs font-medium">Contraseña</Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="mt-1 h-10 text-sm border-neutral-200 focus:border-neutral-400 focus:ring-0"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                    Continuar
                  </Button>
                </SignIn.Action>
              </div>
            </SignIn.Strategy>
          </SignIn.Step>

          {/* Elegir método */}
          <SignIn.Step name="choose-strategy">
            <div className="space-y-4">
              <p className="text-neutral-900 font-medium text-sm text-center">¿Cómo querés continuar?</p>

              <SignIn.SupportedStrategy name="email_code" asChild>
                <Button variant="outline" className="w-full h-10 text-sm border-neutral-200 hover:bg-neutral-50">
                  Enviar código por email
                </Button>
              </SignIn.SupportedStrategy>

              <SignIn.SupportedStrategy name="password" asChild>
                <Button variant="outline" className="w-full h-10 text-sm border-neutral-200 hover:bg-neutral-50">
                  Usar contraseña
                </Button>
              </SignIn.SupportedStrategy>

              <SignIn.Action navigate="start" asChild>
                <button type="button" className="w-full text-xs text-neutral-400 hover:text-neutral-600">
                  ← Volver
                </button>
              </SignIn.Action>
            </div>
          </SignIn.Step>
        </SignIn.Root>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-400">
            Powered by <span className="font-medium text-neutral-500">Kalia</span>
          </p>
        </div>
      </div>
    </div>
  );
}
