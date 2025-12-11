import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/auth";
import { SolicitarAccesoClient } from "./client";

export default async function SolicitarAccesoPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Si ya tiene acceso, redirigir al dashboard
  const userHasAccess = await hasAccess(userId);
  if (userHasAccess) {
    redirect("/");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";

  return <SolicitarAccesoClient email={email} />;
}
