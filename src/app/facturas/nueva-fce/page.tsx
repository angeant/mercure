"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Search, CreditCard, CheckCircle, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string;
  entity_type: string;
}

export default function NuevaFCEPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Búsqueda de cliente
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Entity[]>([]);
  const [selectedClient, setSelectedClient] = useState<Entity | null>(null);
  
  // Datos de la FCE
  const [fceType, setFceType] = useState<'FCE_A' | 'FCE_B' | 'FCE_C'>('FCE_A');
  const [pointOfSale, setPointOfSale] = useState<number>(1);
  const [concepto, setConcepto] = useState<'servicios' | 'productos' | 'productos_y_servicios'>('servicios');
  const [descripcion, setDescripcion] = useState("");
  
  // Montos
  const [montoNeto, setMontoNeto] = useState<number>(0);
  const [montoIva, setMontoIva] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  
  // Campos específicos FCE
  const [cbuEmisor, setCbuEmisor] = useState("");
  const [aliasEmisor, setAliasEmisor] = useState("");
  const [sca, setSca] = useState<'S' | 'N'>('S');

  // Buscar clientes
  const searchClients = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .schema('mercure')
        .from('entities')
        .select('id, legal_name, tax_id, entity_type')
        .or(`legal_name.ilike.%${searchQuery}%,tax_id.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Error buscando clientes:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Seleccionar cliente
  const selectClient = (client: Entity) => {
    setSelectedClient(client);
    setClients([]);
    setSearchQuery("");
  };

  // Calcular IVA y total cuando cambia neto
  useEffect(() => {
    const iva = montoNeto * 0.21;
    setMontoIva(Math.round(iva * 100) / 100);
    setMontoTotal(Math.round((montoNeto + iva) * 100) / 100);
  }, [montoNeto]);

  // Emitir FCE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedClient) {
      setError("Seleccioná un cliente");
      return;
    }

    if (!cbuEmisor || cbuEmisor.length !== 22) {
      setError("El CBU del emisor debe tener 22 dígitos");
      return;
    }

    if (montoTotal <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/afip/fce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: selectedClient.id,
          cliente_cuit: selectedClient.tax_id,
          cliente_nombre: selectedClient.legal_name,
          fce_type: fceType,
          point_of_sale: pointOfSale,
          concepto,
          neto: montoNeto,
          iva: montoIva,
          total: montoTotal,
          cbu_emisor: cbuEmisor,
          alias_emisor: aliasEmisor || undefined,
          sca,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al emitir la FCE");
      }

      setSuccess(`FCE ${result.fceNumber} emitida correctamente. CAE: ${result.cae}`);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/facturas");
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/facturas">
              <Button variant="ghost" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h1 className="text-lg font-medium text-neutral-900">
                Nueva FCE MiPyME
              </h1>
            </div>
          </div>

          {/* Info FCE */}
          <div className="p-3 bg-green-50 border border-green-200 rounded mb-4 text-sm">
            <p className="text-green-800 font-medium">Factura de Crédito Electrónica MiPyMEs</p>
            <p className="text-green-700 text-xs mt-1">
              Comprobante regulado por Ley 27.440. El receptor tiene 30 días para aceptar o rechazar.
              Puede ser cedida a entidades financieras.
            </p>
          </div>

          {success ? (
            <div className="p-6 border border-green-200 rounded bg-green-50 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-700 font-medium">{success}</p>
              <p className="text-sm text-green-600 mt-2">Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cliente */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    1. Cliente (Receptor)
                  </span>
                </div>
                <div className="p-3">
                  {selectedClient ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{selectedClient.legal_name}</p>
                          <p className="text-sm text-neutral-600">CUIT: {selectedClient.tax_id}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClient(null)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchClients())}
                          className="h-8 text-sm flex-1"
                          placeholder="Buscar por nombre o CUIT..."
                        />
                        <Button
                          type="button"
                          onClick={searchClients}
                          disabled={isSearching}
                          className="h-8 px-3 text-sm bg-neutral-900 hover:bg-neutral-800 text-white"
                        >
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {clients.length > 0 && (
                        <div className="border border-neutral-200 rounded divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                          {clients.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectClient(c)}
                              className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors"
                            >
                              <span className="font-medium">{c.legal_name}</span>
                              <span className="mx-2 text-neutral-400">·</span>
                              <span className="text-sm text-neutral-600">{c.tax_id}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo FCE y Punto de Venta */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    2. Tipo y Punto de Venta
                  </span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Tipo FCE</Label>
                    <select
                      value={fceType}
                      onChange={(e) => setFceType(e.target.value as 'FCE_A' | 'FCE_B' | 'FCE_C')}
                      className="w-full h-8 text-sm border border-neutral-200 rounded px-2"
                    >
                      <option value="FCE_A">FCE A (Resp. Inscripto)</option>
                      <option value="FCE_B">FCE B (Consumidor Final)</option>
                      <option value="FCE_C">FCE C (Monotributo)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Punto de Venta</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pointOfSale}
                      onChange={(e) => setPointOfSale(parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CBU - Campos específicos FCE */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    3. CBU para Cobro (obligatorio)
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">CBU del Emisor *</Label>
                    <Input
                      value={cbuEmisor}
                      onChange={(e) => setCbuEmisor(e.target.value.replace(/\D/g, '').slice(0, 22))}
                      className="h-8 text-sm font-mono"
                      placeholder="0000000000000000000000 (22 dígitos)"
                      maxLength={22}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      {cbuEmisor.length}/22 dígitos
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Alias CBU (opcional)</Label>
                    <Input
                      value={aliasEmisor}
                      onChange={(e) => setAliasEmisor(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Ej: mercure.pagos"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Sistema Circulación Abierta</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={sca === 'S'}
                          onChange={() => setSca('S')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Transferible (puede cederse)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={sca === 'N'}
                          onChange={() => setSca('N')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">No transferible</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Concepto y descripción */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    4. Concepto
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Tipo de concepto</Label>
                    <select
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value as 'servicios' | 'productos' | 'productos_y_servicios')}
                      className="w-full h-8 text-sm border border-neutral-200 rounded px-2"
                    >
                      <option value="servicios">Servicios</option>
                      <option value="productos">Productos</option>
                      <option value="productos_y_servicios">Productos y Servicios</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Descripción (opcional)</Label>
                    <Input
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Servicios de flete..."
                    />
                  </div>
                </div>
              </div>

              {/* Montos */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    5. Montos
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Neto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={montoNeto}
                        onChange={(e) => setMontoNeto(parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">IVA 21%</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={montoIva}
                        disabled
                        className="h-8 text-sm font-mono bg-neutral-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={montoTotal}
                        disabled
                        className="h-8 text-sm font-mono bg-neutral-50 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Link href="/facturas">
                  <Button type="button" variant="outline" className="h-8 px-3 text-sm">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading || !selectedClient || !cbuEmisor}
                  className="h-8 px-4 text-sm bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Emitiendo...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Emitir FCE MiPyME
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

