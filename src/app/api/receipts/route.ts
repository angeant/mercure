import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar recibos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin!
      .schema('mercure')
      .from('receipts')
      .select(`
        *,
        client:entities!client_entity_id(id, legal_name, tax_id, email),
        payment_items:receipt_payment_items(*),
        cancelled_invoices:receipt_cancelled_invoices(*)
      `)
      .order('receipt_date', { ascending: false })
      .limit(limit);

    if (clientId) {
      query = query.eq('client_entity_id', parseInt(clientId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/receipts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Crear recibo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      receipt_date,
      client_entity_id,
      client_name,
      client_cuit,
      client_address,
      client_cbu,
      currency,
      exchange_rate,
      observations,
      payment_items,
      cancelled_invoices,
      created_by,
    } = body;

    // Calcular total
    const total = (payment_items || []).reduce(
      (sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0),
      0
    );

    // Crear recibo
    const { data: receipt, error: receiptError } = await supabaseAdmin!
      .schema('mercure')
      .from('receipts')
      .insert({
        receipt_number: '', // Se genera automáticamente por trigger
        receipt_date: receipt_date || new Date().toISOString().split('T')[0],
        client_entity_id,
        client_name,
        client_cuit,
        client_address,
        client_cbu,
        currency: currency || 'ARS',
        exchange_rate: exchange_rate || 1,
        total,
        observations,
        status: 'confirmed',
        created_by,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      return NextResponse.json({ error: receiptError.message }, { status: 500 });
    }

    // Insertar ítems de pago
    if (payment_items && payment_items.length > 0) {
      const itemsToInsert = payment_items.map((item: {
        payment_type: string;
        description?: string;
        amount: number;
        cheque_number?: string;
        cheque_bank?: string;
        cheque_date?: string;
        transfer_reference?: string;
      }, idx: number) => ({
        receipt_id: receipt.id,
        payment_type: item.payment_type,
        description: item.description,
        amount: Number(item.amount) || 0,
        cheque_number: item.cheque_number,
        cheque_bank: item.cheque_bank,
        cheque_date: item.cheque_date,
        transfer_reference: item.transfer_reference,
        sort_order: idx,
      }));

      const { error: itemsError } = await supabaseAdmin!
        .schema('mercure')
        .from('receipt_payment_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error inserting payment items:', itemsError);
      }
    }

    // Insertar comprobantes cancelados y marcar facturas como pagadas
    if (cancelled_invoices && cancelled_invoices.length > 0) {
      const invoicesToInsert = cancelled_invoices.map((inv: {
        invoice_id?: number;
        invoice_number: string;
        invoice_date?: string;
        invoice_amount: number;
        amount_applied: number;
      }, idx: number) => ({
        receipt_id: receipt.id,
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        invoice_amount: Number(inv.invoice_amount) || 0,
        amount_applied: Number(inv.amount_applied) || Number(inv.invoice_amount) || 0,
        sort_order: idx,
      }));

      const { error: invoicesError } = await supabaseAdmin!
        .schema('mercure')
        .from('receipt_cancelled_invoices')
        .insert(invoicesToInsert);

      if (invoicesError) {
        console.error('Error inserting cancelled invoices:', invoicesError);
      }

      // Marcar las facturas como pagadas
      for (const inv of cancelled_invoices) {
        if (inv.invoice_id) {
          const amountApplied = Number(inv.amount_applied) || Number(inv.invoice_amount) || 0;
          const invoiceTotal = Number(inv.invoice_amount) || 0;
          
          // Determinar si es pago total o parcial
          const paymentStatus = amountApplied >= invoiceTotal ? 'paid' : 'partial';
          
          const { error: updateError } = await supabaseAdmin!
            .schema('mercure')
            .from('invoices')
            .update({
              payment_status: paymentStatus,
              receipt_id: receipt.id,
              paid_at: new Date().toISOString(),
              paid_amount: amountApplied,
            })
            .eq('id', inv.invoice_id);

          if (updateError) {
            console.error('Error updating invoice payment status:', updateError);
          }
        }
      }
    }

    // Obtener recibo completo con relaciones
    const { data: fullReceipt, error: fetchError } = await supabaseAdmin!
      .schema('mercure')
      .from('receipts')
      .select(`
        *,
        client:entities!client_entity_id(id, legal_name, tax_id, email),
        payment_items:receipt_payment_items(*),
        cancelled_invoices:receipt_cancelled_invoices(*)
      `)
      .eq('id', receipt.id)
      .single();

    if (fetchError) {
      console.error('Error fetching full receipt:', fetchError);
      return NextResponse.json({ data: receipt });
    }

    return NextResponse.json({ data: fullReceipt });
  } catch (error) {
    console.error('Error in POST /api/receipts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
