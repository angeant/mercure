"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/mercure_logos/logo_remito2.png"
            alt="Mercure"
            width={280}
            height={80}
            priority
            className="mb-2"
          />
        </div>

        <SignIn.Root>
          {/* Step 1: Solo email */}
          <SignIn.Step name="start">
            <div className="space-y-5">
              <Clerk.Field name="identifier">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-sm font-medium">
                    Email
                  </Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                  Enviar código
                </Button>
              </SignIn.Action>

              <Clerk.GlobalError className="text-red-500 text-sm text-center" />
            </div>
          </SignIn.Step>

          {/* Step 2: Verificación con código OTP */}
          <SignIn.Step name="verifications">
            <SignIn.Strategy name="email_code">
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-neutral-900 font-medium">
                    Revisá tu email
                  </p>
                  <p className="text-neutral-500 text-sm mt-1">
                    Te enviamos un código de verificación
                  </p>
                </div>

                <Clerk.Field name="code">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-sm font-medium">
                      Código de verificación
                    </Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      placeholder="123456"
                      className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0 text-center tracking-widest text-lg"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                    Verificar
                  </Button>
                </SignIn.Action>

                <SignIn.Action resend asChild>
                  <button
                    type="button"
                    className="w-full text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    ¿No recibiste el código? Reenviar
                  </button>
                </SignIn.Action>

                <Clerk.GlobalError className="text-red-500 text-sm text-center" />
              </div>
            </SignIn.Strategy>

            {/* Fallback para password si está habilitado en Clerk */}
            <SignIn.Strategy name="password">
              <div className="space-y-5">
                <Clerk.Field name="password">
                  <Clerk.Label asChild>
                    <Label className="text-neutral-600 text-sm font-medium">
                      Contraseña
                    </Label>
                  </Clerk.Label>
                  <Clerk.Input asChild>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="mt-1.5 h-11 border-neutral-200 focus:border-neutral-400 focus:ring-0"
                    />
                  </Clerk.Input>
                  <Clerk.FieldError className="text-red-500 text-xs mt-1" />
                </Clerk.Field>

                <SignIn.Action submit asChild>
                  <Button className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                    Continuar
                  </Button>
                </SignIn.Action>
              </div>
            </SignIn.Strategy>
          </SignIn.Step>

          {/* Step para elegir método si hay varios disponibles */}
          <SignIn.Step name="choose-strategy">
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-neutral-900 font-medium">
                  ¿Cómo querés continuar?
                </p>
              </div>

              <SignIn.SupportedStrategy name="email_code" asChild>
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-neutral-200 hover:bg-neutral-50"
                >
                  Enviar código por email
                </Button>
              </SignIn.SupportedStrategy>

              <SignIn.SupportedStrategy name="password" asChild>
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-neutral-200 hover:bg-neutral-50"
                >
                  Usar contraseña
                </Button>
              </SignIn.SupportedStrategy>

              <SignIn.Action navigate="start" asChild>
                <button
                  type="button"
                  className="w-full text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  ← Volver
                </button>
              </SignIn.Action>
            </div>
          </SignIn.Step>
        </SignIn.Root>

        <p className="mt-8 text-center text-sm text-neutral-500">
          ¿No tenés cuenta?{" "}
          <Link
            href="/sign-up"
            className="text-neutral-900 font-medium hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

