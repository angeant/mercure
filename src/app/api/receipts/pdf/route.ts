import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateReceiptPdf } from '@/lib/receipt-pdf';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('id');

    if (!receiptId) {
      return NextResponse.json({ error: 'Receipt ID required' }, { status: 400 });
    }

    // Obtener recibo con relaciones
    const { data: receipt, error } = await supabaseAdmin!
      .schema('mercure')
      .from('receipts')
      .select(`
        *,
        payment_items:receipt_payment_items(*),
        cancelled_invoices:receipt_cancelled_invoices(*)
      `)
      .eq('id', parseInt(receiptId))
      .single();

    if (error || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Preparar datos para el PDF
    const pdfParams = {
      receiptNumber: receipt.receipt_number,
      receiptDate: receipt.receipt_date,
      clientName: receipt.client_name,
      clientCuit: receipt.client_cuit || '',
      clientDomicilio: receipt.client_address,
      clientCbu: receipt.client_cbu,
      currency: receipt.currency as 'ARS' | 'USD',
      exchangeRate: Number(receipt.exchange_rate) || 1,
      paymentItems: (receipt.payment_items || []).map((item: {
        payment_type: string;
        description?: string;
        amount: number;
      }) => ({
        cuenta: item.payment_type,
        descripcion: item.description || '',
        importe: Number(item.amount) || 0,
      })),
      cancelledInvoices: (receipt.cancelled_invoices || []).map((inv: {
        invoice_date?: string;
        invoice_number: string;
        amount_applied: number;
      }) => ({
        date: inv.invoice_date || '',
        invoiceNumber: inv.invoice_number,
        amount: Number(inv.amount_applied) || 0,
      })),
      observations: receipt.observations,
      total: Number(receipt.total) || 0,
    };

    const pdfBuffer = await generateReceiptPdf(pdfParams);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recibo-${receipt.receipt_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    return NextResponse.json({ error: 'Error generating PDF' }, { status: 500 });
  }
}

