import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const mercure = () => supabaseAdmin!.schema('mercure');

// Tarifas especiales de clientes conocidos
const SPECIAL_TARIFFS = [
  {
    clientNamePattern: '%MUNDO%PLOMERO%',
    name: 'Fórmula Especial',
    description: 'KG*96.8 - M3*48400',
    condition_type: 'cualquiera',
    pricing_type: 'formula_custom',
    pricing_values: { formula: 'kg * 96.8 - m3 * 48400' },
    insurance_rate: 0, // Sin seguro
  },
  // Agregar más clientes aquí si es necesario
];

export async function GET() {
  try {
    const results = [];

    for (const tariff of SPECIAL_TARIFFS) {
      // Buscar el cliente
      const { data: entities, error: entityError } = await mercure()
        .from('entities')
        .select('id, legal_name')
        .ilike('legal_name', tariff.clientNamePattern);

      if (entityError) {
        results.push({ pattern: tariff.clientNamePattern, error: entityError.message });
        continue;
      }

      if (!entities || entities.length === 0) {
        results.push({ pattern: tariff.clientNamePattern, error: 'No entity found' });
        continue;
      }

      for (const entity of entities) {
        // Verificar si ya existe
        const { data: existing } = await mercure()
          .from('client_special_tariffs')
          .select('id')
          .eq('entity_id', entity.id)
          .eq('name', tariff.name)
          .single();

        if (existing) {
          results.push({ 
            entity: entity.legal_name, 
            entity_id: entity.id,
            status: 'already_exists',
            tariff_id: existing.id 
          });
          continue;
        }

        // Insertar tarifa especial
        const { data: inserted, error: insertError } = await mercure()
          .from('client_special_tariffs')
          .insert({
            entity_id: entity.id,
            name: tariff.name,
            description: tariff.description,
            condition_type: tariff.condition_type,
            condition_values: {},
            pricing_type: tariff.pricing_type,
            pricing_values: tariff.pricing_values,
            insurance_rate: tariff.insurance_rate,
            priority: 10,
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) {
          results.push({ 
            entity: entity.legal_name, 
            entity_id: entity.id,
            error: insertError.message 
          });
        } else {
          results.push({ 
            entity: entity.legal_name, 
            entity_id: entity.id,
            status: 'created',
            tariff_id: inserted.id 
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Tarifas especiales procesadas'
    });
  } catch (error) {
    console.error('Error setting up special tariffs:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

