"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
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

        <SignUp.Root>
          {/* Step 1: Email */}
          <SignUp.Step name="start">
            <div className="space-y-4">
              <Clerk.Field name="emailAddress">
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

              <SignUp.Action submit asChild>
                <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                  Continuar
                </Button>
              </SignUp.Action>

              <Clerk.GlobalError className="text-red-500 text-xs text-center" />
            </div>
          </SignUp.Step>

          {/* Step 2: Código OTP */}
          <SignUp.Step name="verifications">
            <SignUp.Strategy name="email_code">
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

                <SignUp.Action submit asChild>
                  <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                    Verificar
                  </Button>
                </SignUp.Action>

                <SignUp.Action resend asChild>
                  <button type="button" className="w-full text-xs text-neutral-500 hover:text-neutral-900">
                    ¿No recibiste el código? Reenviar
                  </button>
                </SignUp.Action>

                <Clerk.GlobalError className="text-red-500 text-xs text-center" />
              </div>
            </SignUp.Strategy>
          </SignUp.Step>

          {/* Step 3: Datos (si Clerk lo requiere) */}
          <SignUp.Step name="continue">
            <div className="space-y-4">
              <p className="text-neutral-900 font-medium text-sm text-center">Completá tus datos</p>

              <Clerk.Field name="firstName">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-xs font-medium">Nombre</Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    placeholder="Tu nombre"
                    className="mt-1 h-10 text-sm border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <Clerk.Field name="lastName">
                <Clerk.Label asChild>
                  <Label className="text-neutral-600 text-xs font-medium">Apellido</Label>
                </Clerk.Label>
                <Clerk.Input asChild>
                  <Input
                    placeholder="Tu apellido"
                    className="mt-1 h-10 text-sm border-neutral-200 focus:border-neutral-400 focus:ring-0"
                  />
                </Clerk.Input>
                <Clerk.FieldError className="text-red-500 text-xs mt-1" />
              </Clerk.Field>

              <SignUp.Action submit asChild>
                <Button className="w-full h-10 text-sm bg-neutral-900 hover:bg-neutral-800 text-white">
                  Continuar
                </Button>
              </SignUp.Action>

              <Clerk.GlobalError className="text-red-500 text-xs text-center" />
            </div>
          </SignUp.Step>
        </SignUp.Root>

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
