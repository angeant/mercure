import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function Home() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      
      <main className="pt-14">
        <div className="px-6 py-12">
          {/* Header */}
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Bienvenido, {user?.firstName || "Usuario"}
            </h1>
            <p className="mt-1 text-neutral-500">
              Sistema de gestión logística
            </p>
          </div>

          {/* Stats Grid */}
          <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              label="Envíos activos"
              value="24"
              accent
            />
            <StatCard 
              label="Completados hoy"
              value="12"
            />
            <StatCard 
              label="Pendientes"
              value="8"
            />
          </div>

          {/* Quick Actions */}
          <div className="max-w-6xl mx-auto mt-12">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-4">
              Acciones rápidas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ActionCard label="Nuevo envío" href="/envios/nuevo" />
              <ActionCard label="Ver remitos" href="/remitos" />
              <ActionCard label="Clientes" href="/clientes" />
              <ActionCard label="Reportes" href="/reportes" />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="max-w-6xl mx-auto mt-12">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-4">
              Actividad reciente
            </h2>
            <div className="bg-white rounded-lg border border-neutral-200">
              <ActivityItem 
                title="Envío #2847 entregado"
                subtitle="Cliente: Distribuidora Norte"
                time="Hace 15 min"
              />
              <ActivityItem 
                title="Nuevo remito generado"
                subtitle="Remito #R-1293"
                time="Hace 32 min"
              />
              <ActivityItem 
                title="Envío #2846 en tránsito"
                subtitle="Destino: CABA"
                time="Hace 1 hora"
              />
              <ActivityItem 
                title="Cliente registrado"
                subtitle="Logística Express SA"
                time="Hace 2 horas"
                isLast
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  accent = false 
}: { 
  label: string; 
  value: string; 
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${accent ? "text-orange-500" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ActionCard({ label, href }: { label: string; href: string }) {
  return (
    <a 
      href={href}
      className="bg-white rounded-lg border border-neutral-200 p-4 text-center text-sm font-medium text-neutral-700 hover:border-neutral-400 transition-colors"
    >
      {label}
    </a>
  );
}

function ActivityItem({ 
  title, 
  subtitle, 
  time,
  isLast = false 
}: { 
  title: string; 
  subtitle: string; 
  time: string;
  isLast?: boolean;
}) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${!isLast ? "border-b border-neutral-100" : ""}`}>
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-500">{subtitle}</p>
      </div>
      <span className="text-xs text-neutral-400">{time}</span>
    </div>
  );
}
