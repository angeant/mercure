import { NextRequest, NextResponse } from 'next/server';
import { createCreditNote } from '@/lib/afip/wsfe';
import { CONCEPT_CODES, DOC_TYPE_CODES, CreditNoteType, VOUCHER_TYPE_CODES } from '@/lib/afip/types';
import { supabaseAdmin } from "@/lib/supabase";

interface NotaCreditoRequest {
  // Datos del cliente
  cliente_id?: number;
  cliente_cuit: string;
  cliente_nombre: string;
  
  // Tipo de NC
  credit_note_type: CreditNoteType; // 'NC_A' | 'NC_B' | 'NC_C'
  point_of_sale: number;
  
  // Comprobante asociado (factura original)
  associated_invoice_type: number; // 1=FA, 6=FB, 11=FC
  associated_invoice_pos: number;  // Punto de venta
  associated_invoice_number: number; // Número
  associated_invoice_date?: string; // YYYYMMDD (opcional)
  
  // Montos
  concepto: string;
  neto: number;
  iva: number;
  total: number;
  
  // Para servicios
  periodo_desde?: string;
  periodo_hasta?: string;
  
  // Motivo
  motivo?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotaCreditoRequest = await request.json();
    
    // Validaciones
    if (!body.cliente_cuit || !body.cliente_nombre) {
      return NextResponse.json(
        { error: 'Faltan datos del cliente (CUIT y nombre son obligatorios)' },
        { status: 400 }
      );
    }
    
    if (!body.associated_invoice_type || !body.associated_invoice_pos || !body.associated_invoice_number) {
      return NextResponse.json(
        { error: 'Debe indicar el comprobante asociado (factura original a la que aplica la NC)' },
        { status: 400 }
      );
    }
    
    if (!body.neto || !body.total) {
      return NextResponse.json(
        { error: 'Montos inválidos' },
        { status: 400 }
      );
    }
    
    const today = new Date();
    const invoiceDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Determinar concepto
    let concept: number = CONCEPT_CODES.SERVICIOS;
    if (body.concepto === 'productos') {
      concept = CONCEPT_CODES.PRODUCTOS;
    } else if (body.concepto === 'productos_y_servicios') {
      concept = CONCEPT_CODES.PRODUCTOS_Y_SERVICIOS;
    }
    
    // Parsear CUIT
    const cuitClean = body.cliente_cuit.replace(/-/g, '');
    
    // Crear NC con AFIP
    const result = await createCreditNote({
      creditNoteType: body.credit_note_type,
      pointOfSale: body.point_of_sale,
      concept,
      docType: DOC_TYPE_CODES.CUIT,
      docNumber: cuitClean,
      invoiceDate,
      totalAmount: body.total,
      netAmount: body.neto,
      ivaAmount: body.iva,
      serviceFrom: body.periodo_desde,
      serviceTo: body.periodo_hasta,
      paymentDueDate: body.periodo_hasta,
      associatedVoucher: {
        type: body.associated_invoice_type,
        pointOfSale: body.associated_invoice_pos,
        number: body.associated_invoice_number,
        date: body.associated_invoice_date,
      },
    });
    
    if (!result.success) {
      console.error('Error AFIP NC:', result.errors);
      return NextResponse.json({
        success: false,
        error: result.errors?.[0]?.message || 'Error al generar la nota de crédito',
        errors: result.errors,
        observations: result.observations,
      }, { status: 400 });
    }
    
    // Formatear número de comprobante
    const ncNumber = `${body.point_of_sale.toString().padStart(5, '0')}-${result.invoiceNumber?.toString().padStart(8, '0')}`;
    
    // Formatear vencimiento CAE
    const caeExp = result.caeExpiration;
    const caeExpirationFormatted = caeExp 
      ? `${caeExp.slice(0, 4)}-${caeExp.slice(4, 6)}-${caeExp.slice(6, 8)}` 
      : null;

    // Guardar en la base de datos
    if (supabaseAdmin) {
      await supabaseAdmin
        .schema('mercure').from('invoices')
        .insert({
          invoice_number: ncNumber,
          invoice_type: body.credit_note_type.replace('NC_', ''), // Guardar solo A, B o C
          voucher_type: body.credit_note_type, // NC_A, NC_B, NC_C
          point_of_sale: body.point_of_sale,
          issue_date: today.toISOString().slice(0, 10),
          client_entity_id: body.cliente_id || null,
          client_cuit: body.cliente_cuit,
          client_name: body.cliente_nombre,
          client_iva_condition: 'IVA Responsable Inscripto',
          neto: body.neto,
          iva: body.iva,
          total: body.total,
          cae: result.cae,
          cae_expiration: caeExpirationFormatted,
          afip_response: result.rawResponse,
          // Referencia al comprobante asociado
          associated_voucher_type: body.associated_invoice_type,
          associated_voucher_pos: body.associated_invoice_pos,
          associated_voucher_number: body.associated_invoice_number,
          notes: body.motivo || null,
        });
    }

    return NextResponse.json({
      success: true,
      cae: result.cae,
      caeExpiration: caeExpirationFormatted,
      creditNoteNumber: ncNumber,
      invoiceNumber: result.invoiceNumber,
      message: `Nota de Crédito ${body.credit_note_type.replace('NC_', '')} emitida correctamente`,
    });

  } catch (error) {
    console.error('Error en POST /api/afip/nota-credito:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

