"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Search, MinusCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface FacturaAsociable {
  id: number;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  client_name: string;
  client_cuit: string;
  neto: number;
  iva: number;
  total: number;
  point_of_sale: number;
}

export default function NuevaNotaCreditoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Búsqueda de factura
  const [searchQuery, setSearchQuery] = useState("");
  const [facturas, setFacturas] = useState<FacturaAsociable[]>([]);
  const [selectedFactura, setSelectedFactura] = useState<FacturaAsociable | null>(null);
  
  // Datos de la NC
  const [ncType, setNcType] = useState<'NC_A' | 'NC_B' | 'NC_C'>('NC_A');
  const [motivo, setMotivo] = useState("");
  const [montoNeto, setMontoNeto] = useState<number>(0);
  const [montoIva, setMontoIva] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [ncTotal, setNcTotal] = useState(false); // NC por el total de la factura

  // Buscar facturas
  const searchFacturas = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .schema('mercure')
        .from('invoices')
        .select('*')
        .or(`invoice_number.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%,client_cuit.ilike.%${searchQuery}%`)
        .is('voucher_type', null) // Solo facturas, no NC
        .order('issue_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setFacturas(data || []);
    } catch (err) {
      console.error("Error buscando facturas:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Seleccionar factura
  const selectFactura = (factura: FacturaAsociable) => {
    setSelectedFactura(factura);
    setFacturas([]);
    setSearchQuery("");
    
    // Determinar tipo de NC según tipo de factura
    if (factura.invoice_type === 'A') setNcType('NC_A');
    else if (factura.invoice_type === 'B') setNcType('NC_B');
    else setNcType('NC_C');
    
    // Por defecto, NC por el total
    setNcTotal(true);
    setMontoNeto(Number(factura.neto));
    setMontoIva(Number(factura.iva));
    setMontoTotal(Number(factura.total));
  };

  // Actualizar montos cuando cambia ncTotal
  useEffect(() => {
    if (selectedFactura && ncTotal) {
      setMontoNeto(Number(selectedFactura.neto));
      setMontoIva(Number(selectedFactura.iva));
      setMontoTotal(Number(selectedFactura.total));
    }
  }, [ncTotal, selectedFactura]);

  // Calcular IVA y total cuando cambia neto (para NC parcial)
  useEffect(() => {
    if (!ncTotal) {
      const iva = montoNeto * 0.21;
      setMontoIva(Math.round(iva * 100) / 100);
      setMontoTotal(Math.round((montoNeto + iva) * 100) / 100);
    }
  }, [montoNeto, ncTotal]);

  // Emitir NC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFactura) {
      setError("Seleccioná una factura para asociar la nota de crédito");
      return;
    }

    if (montoTotal <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    if (montoTotal > Number(selectedFactura.total)) {
      setError("El monto de la NC no puede superar el total de la factura");
      return;
    }

    setIsLoading(true);

    try {
      // Parsear número de factura para obtener punto de venta y número
      const [pos, num] = selectedFactura.invoice_number.split('-').map(s => parseInt(s, 10));
      
      const response = await fetch("/api/afip/nota-credito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_cuit: selectedFactura.client_cuit,
          cliente_nombre: selectedFactura.client_name,
          credit_note_type: ncType,
          point_of_sale: selectedFactura.point_of_sale || pos,
          // Factura asociada
          associated_invoice_type: selectedFactura.invoice_type === 'A' ? 1 : selectedFactura.invoice_type === 'B' ? 6 : 11,
          associated_invoice_pos: pos,
          associated_invoice_number: num,
          // Montos
          concepto: "servicios",
          neto: montoNeto,
          iva: montoIva,
          total: montoTotal,
          motivo: motivo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al emitir la nota de crédito");
      }

      setSuccess(`Nota de Crédito ${result.creditNoteNumber} emitida correctamente. CAE: ${result.cae}`);
      
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
              <MinusCircle className="h-5 w-5 text-red-500" />
              <h1 className="text-lg font-medium text-neutral-900">
                Nueva Nota de Crédito
              </h1>
            </div>
          </div>

          {success ? (
            <div className="p-6 border border-green-200 rounded bg-green-50 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-700 font-medium">{success}</p>
              <p className="text-sm text-green-600 mt-2">Redirigiendo...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Buscar factura */}
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    1. Factura a creditar
                  </span>
                </div>
                <div className="p-3">
                  {selectedFactura ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            F{selectedFactura.invoice_type}
                          </span>
                          <span className="font-mono font-medium">{selectedFactura.invoice_number}</span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{selectedFactura.client_name}</p>
                        <p className="text-sm font-medium text-neutral-900 mt-1">
                          Total: ${Number(selectedFactura.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFactura(null)}
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
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchFacturas())}
                          className="h-8 text-sm flex-1"
                          placeholder="Buscar por número, cliente o CUIT..."
                        />
                        <Button
                          type="button"
                          onClick={searchFacturas}
                          disabled={isSearching}
                          className="h-8 px-3 text-sm bg-neutral-900 hover:bg-neutral-800 text-white"
                        >
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {facturas.length > 0 && (
                        <div className="border border-neutral-200 rounded divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                          {facturas.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => selectFactura(f)}
                              className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-sm">{f.invoice_number}</span>
                                  <span className="mx-2 text-neutral-400">·</span>
                                  <span className="text-sm text-neutral-600">{f.client_name}</span>
                                </div>
                                <span className="text-sm font-medium">
                                  ${Number(f.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo y monto */}
              {selectedFactura && (
                <>
                  <div className="border border-neutral-200 rounded overflow-hidden">
                    <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        2. Tipo de Nota de Crédito
                      </span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={ncTotal}
                            onChange={() => setNcTotal(true)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Total (anular factura completa)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!ncTotal}
                            onChange={() => setNcTotal(false)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Parcial</span>
                        </label>
                      </div>
                      
                      <div className="p-2 bg-neutral-50 rounded text-xs text-neutral-600">
                        Tipo de comprobante: <strong>Nota de Crédito {ncType.replace('NC_', '')}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded overflow-hidden">
                    <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        3. Montos
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
                            disabled={ncTotal}
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

                  <div className="border border-neutral-200 rounded overflow-hidden">
                    <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        4. Motivo (opcional)
                      </span>
                    </div>
                    <div className="p-3">
                      <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                        placeholder="Ej: Devolución de mercadería, error de facturación, descuento acordado..."
                      />
                    </div>
                  </div>
                </>
              )}

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
                  disabled={isLoading || !selectedFactura}
                  className="h-8 px-4 text-sm bg-red-500 hover:bg-red-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Emitiendo...
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-4 w-4 mr-2" />
                      Emitir Nota de Crédito
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

