import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Verificar si tiene acceso (rol asignado)
  const userHasAccess = await hasAccess(userId);
  if (!userHasAccess) {
    redirect("/solicitar-acceso");
  }

  return <>{children}</>;
}

