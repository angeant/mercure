"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, RefreshCw, Calculator } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

interface ShipmentData {
  id: number;
  delivery_note_number: string | null;
  sender_id: number | null;
  recipient_id: number | null;
  recipient_address: string | null;
  package_quantity: number;
  weight_kg: number;
  volume_m3: number | null;
  declared_value: number;
  load_description: string | null;
  paid_by: string | null;
  payment_terms: string | null;
  notes: string | null;
  quotation_id: string | null;
  sender?: Entity | null;
  recipient?: Entity | null;
}

interface QuotationData {
  total_price: number;
  base_price: number;
  insurance_cost: number;
}

interface EditShipmentFormProps {
  shipment: ShipmentData;
  entities: Entity[];
}

export function EditShipmentForm({ shipment, entities }: EditShipmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [newQuotation, setNewQuotation] = useState<{ price: number; breakdown: Record<string, number> } | null>(null);
  
  // Cargar cotización existente
  useEffect(() => {
    async function loadQuotation() {
      if (shipment.quotation_id) {
        const { data } = await supabase
          .from('mercure_quotations')
          .select('total_price, base_price, insurance_cost')
          .eq('id', shipment.quotation_id)
          .single();
        if (data) {
          setQuotation({
            total_price: Number(data.total_price),
            base_price: Number(data.base_price),
            insurance_cost: Number(data.insurance_cost),
          });
        }
      }
    }
    loadQuotation();
  }, [shipment.quotation_id]);
  
  const [formData, setFormData] = useState({
    delivery_note_number: shipment.delivery_note_number || '',
    sender_id: shipment.sender_id?.toString() || '',
    recipient_id: shipment.recipient_id?.toString() || '',
    recipient_address: shipment.recipient_address || '',
    package_quantity: shipment.package_quantity?.toString() || '',
    weight_kg: shipment.weight_kg?.toString() || '',
    volume_m3: shipment.volume_m3?.toString() || '',
    declared_value: shipment.declared_value?.toString() || '',
    load_description: shipment.load_description || '',
    paid_by: shipment.paid_by || 'destino',
    payment_terms: shipment.payment_terms || 'contado',
    notes: shipment.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar cotización nueva si cambian datos relevantes
    if (['weight_kg', 'volume_m3', 'declared_value', 'recipient_id'].includes(name)) {
      setNewQuotation(null);
    }
  };

  const handleRecotizar = async () => {
    setIsQuoting(true);
    setMessage(null);
    setNewQuotation(null);

    try {
      const response = await fetch('/api/detect-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.recipient_id ? parseInt(formData.recipient_id) : null,
          cargo: {
            weightKg: formData.weight_kg ? parseFloat(formData.weight_kg) : 0,
            volumeM3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
            declaredValue: formData.declared_value ? parseFloat(formData.declared_value) : null,
          },
          origin: 'Buenos Aires',
          destination: 'Jujuy',
        }),
      });

      if (!response.ok) throw new Error('Error en cotizador');

      const result = await response.json();
      
      if (result.pricing?.price > 0) {
        setNewQuotation({
          price: result.pricing.price,
          breakdown: result.pricing.breakdown || {},
        });
        setMessage({ type: 'success', text: `Nuevo precio: $${result.pricing.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` });
      } else {
        setMessage({ type: 'error', text: 'No se pudo calcular el precio. Verificá peso/volumen.' });
      }
    } catch (error) {
      console.error('Error recotizando:', error);
      setMessage({ type: 'error', text: 'Error al recotizar' });
    } finally {
      setIsQuoting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const updateData: Record<string, unknown> = {
        delivery_note_number: formData.delivery_note_number || null,
        sender_id: formData.sender_id ? parseInt(formData.sender_id) : null,
        recipient_id: formData.recipient_id ? parseInt(formData.recipient_id) : null,
        recipient_address: formData.recipient_address || null,
        package_quantity: formData.package_quantity ? parseInt(formData.package_quantity) : 0,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : 0,
        volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
        declared_value: formData.declared_value ? parseFloat(formData.declared_value) : 0,
        load_description: formData.load_description || null,
        paid_by: formData.paid_by || null,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
      };

      // Si hay nueva cotización, guardarla
      if (newQuotation) {
        const recipient = entities.find(e => e.id.toString() === formData.recipient_id);
        
        // Crear nueva cotización
        const { data: newQuot, error: quotError } = await supabase
          .from('mercure_quotations')
          .insert({
            shipment_id: shipment.id,
            entity_id: formData.recipient_id ? parseInt(formData.recipient_id) : null,
            customer_name: recipient?.legal_name || 'Desconocido',
            customer_cuit: recipient?.tax_id || null,
            origin: 'Buenos Aires',
            destination: 'Jujuy',
            weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : 0,
            volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : 0,
            volumetric_weight_kg: newQuotation.breakdown?.peso_volumetrico || null,
            chargeable_weight_kg: newQuotation.breakdown?.peso_cobrado || null,
            insurance_value: formData.declared_value ? parseFloat(formData.declared_value) : 0,
            base_price: newQuotation.breakdown?.flete_final || newQuotation.price,
            insurance_cost: newQuotation.breakdown?.seguro || 0,
            total_price: newQuotation.price,
            includes_iva: false,
            status: 'confirmed',
            source: 'recotizacion',
          })
          .select('id')
          .single();

        if (quotError) {
          console.error('Error creando cotización:', quotError);
        } else if (newQuot) {
          updateData.quotation_id = newQuot.id;
        }
      }

      const { error } = await supabase
        .from('mercure_shipments')
        .update(updateData)
        .eq('id', shipment.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Envío actualizado correctamente' });
      
      // Redirigir después de 1 segundo
      setTimeout(() => {
        router.push('/recepcion');
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error('Error updating shipment:', error);
      setMessage({ type: 'error', text: 'Error al actualizar el envío' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remitoNumber = shipment.delivery_note_number || `#${shipment.id}`;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/recepcion"
            className="p-2 hover:bg-neutral-100 rounded text-neutral-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-neutral-900">Editar Envío</h1>
            <p className="text-xs text-neutral-500">Remito {remitoNumber}</p>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <div className={`mb-4 px-3 py-2 rounded text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Remitente y Destinatario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Remitente</label>
            <select
              name="sender_id"
              value={formData.sender_id}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="">Seleccionar...</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.legal_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Destinatario</label>
            <select
              name="recipient_id"
              value={formData.recipient_id}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="">Seleccionar...</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.legal_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dirección de entrega */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Dirección de Entrega</label>
          <input
            type="text"
            name="recipient_address"
            value={formData.recipient_address}
            onChange={handleChange}
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            placeholder="Dirección completa"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Bultos</label>
            <input
              type="number"
              name="package_quantity"
              value={formData.package_quantity}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Peso (kg)</label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              step="0.01"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Volumen (m³)</label>
            <input
              type="number"
              name="volume_m3"
              value={formData.volume_m3}
              onChange={handleChange}
              step="0.001"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Valor Declarado ($)</label>
            <input
              type="number"
              name="declared_value"
              value={formData.declared_value}
              onChange={handleChange}
              step="0.01"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
        </div>

        {/* Cotización */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-neutral-500 uppercase">Cotización</label>
            <button
              type="button"
              onClick={handleRecotizar}
              disabled={isQuoting}
              className="h-7 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1.5 disabled:opacity-50"
            >
              {isQuoting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Calculator className="w-3 h-3" />
              )}
              {isQuoting ? 'Calculando...' : 'Recotizar'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Precio actual:</span>
              <p className={`font-medium ${quotation ? 'text-neutral-900' : 'text-amber-600'}`}>
                {quotation ? `$${quotation.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin cotizar'}
              </p>
              {quotation && (
                <p className="text-xs text-neutral-400">
                  Flete: ${quotation.base_price.toLocaleString('es-AR')} + Seguro: ${quotation.insurance_cost.toLocaleString('es-AR')}
                </p>
              )}
            </div>
            {newQuotation && (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <span className="text-green-700 text-xs">Nuevo precio:</span>
                <p className="font-bold text-green-800">
                  ${newQuotation.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600">Se guardará al confirmar</p>
              </div>
            )}
          </div>
        </div>

        {/* Pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Paga</label>
            <select
              name="paid_by"
              value={formData.paid_by}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="destino">Destinatario</option>
              <option value="origen">Remitente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Condición de Pago</label>
            <select
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="contado">Contado</option>
              <option value="cuenta_corriente">Cuenta Corriente</option>
            </select>
          </div>
        </div>

        {/* Descripción de carga */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Descripción de la Carga</label>
          <textarea
            name="load_description"
            value={formData.load_description}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 resize-none"
            placeholder="Detalle del contenido..."
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Observaciones</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 resize-none"
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200">
          <Link 
            href="/recepcion"
            className="h-9 px-4 text-sm border border-neutral-200 hover:bg-neutral-50 rounded flex items-center gap-2"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Cambios
          </button>
        </div>
      </form>
    </>
  );
}

