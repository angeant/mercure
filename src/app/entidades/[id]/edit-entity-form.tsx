"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  entity_type: string | null;
  payment_terms: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  contact_name: string | null;
  notes: string | null;
}

const ENTITY_TYPES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'transportista', label: 'Transportista' },
  { value: 'otro', label: 'Otro' },
];

const PAYMENT_TERMS = [
  { value: 'contado', label: 'Contado' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'transferencia', label: 'Transferencia' },
];

export function EditEntityForm({ entity }: { entity: Entity }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    legal_name: entity.legal_name || '',
    tax_id: entity.tax_id || '',
    entity_type: entity.entity_type || '',
    payment_terms: entity.payment_terms || '',
    email: entity.email || '',
    phone: entity.phone || '',
    address: entity.address || '',
    city: entity.city || '',
    province: entity.province || '',
    postal_code: entity.postal_code || '',
    contact_name: entity.contact_name || '',
    notes: entity.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('mercure_entities')
        .update({
          legal_name: formData.legal_name,
          tax_id: formData.tax_id || null,
          entity_type: formData.entity_type || null,
          payment_terms: formData.payment_terms || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          province: formData.province || null,
          postal_code: formData.postal_code || null,
          contact_name: formData.contact_name || null,
          notes: formData.notes || null,
        })
        .eq('id', entity.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push('/entidades');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Razón Social *
          </label>
          <input
            type="text"
            name="legal_name"
            value={formData.legal_name}
            onChange={handleChange}
            required
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            CUIT
          </label>
          <input
            type="text"
            name="tax_id"
            value={formData.tax_id}
            onChange={handleChange}
            placeholder="30-12345678-9"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Tipo
          </label>
          <select
            name="entity_type"
            value={formData.entity_type}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Condición de Pago
          </label>
          <select
            name="payment_terms"
            value={formData.payment_terms}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {PAYMENT_TERMS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Teléfono
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Contacto
          </label>
          <input
            type="text"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Dirección
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Ciudad
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Provincia
          </label>
          <input
            type="text"
            name="province"
            value={formData.province}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Código Postal
          </label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Link
          href="/entidades"
          className="flex-1 h-10 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white font-medium rounded flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </form>
  );
}

