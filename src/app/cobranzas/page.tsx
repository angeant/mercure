import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { CobranzasClient } from "./cobranzas-client";

interface Receipt {
  id: number;
  receipt_number: string;
  receipt_date: string;
  client_entity_id: number | null;
  client_name: string;
  client_cuit: string | null;
  client_address: string | null;
  currency: string;
  exchange_rate: number;
  total: number;
  observations: string | null;
  status: string;
  created_at: string;
  client?: {
    id: number;
    legal_name: string;
    tax_id: string | null;
    email: string | null;
  } | null;
  payment_items: {
    id: number;
    payment_type: string;
    description: string | null;
    amount: number;
  }[];
  cancelled_invoices: {
    id: number;
    invoice_number: string;
    invoice_date: string | null;
    amount_applied: number;
  }[];
}

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
  email: string | null;
}

interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  total: number;
  client_entity_id: number | null;
  client_name: string;
  payment_status: string | null;
  receipt_id: number | null;
  voucher_type: string | null;
}

async function getReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabaseAdmin!
    .schema('mercure')
    .from('receipts')
    .select(`
      *,
      client:entities!client_entity_id(id, legal_name, tax_id, email),
      payment_items:receipt_payment_items(*),
      cancelled_invoices:receipt_cancelled_invoices(*)
    `)
    .order('receipt_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }

  return (data || []) as Receipt[];
}

async function getClients(): Promise<Entity[]> {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('entities')
    .select('id, legal_name, tax_id, address, email')
    .order('legal_name');
  
  return (data || []) as Entity[];
}

async function getPendingInvoices(): Promise<Invoice[]> {
  // Traer facturas pendientes de cobro (no NC ni ND, y no pagadas)
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('invoices')
    .select('id, invoice_number, issue_date, total, client_entity_id, client_name, payment_status, receipt_id, voucher_type')
    .or('payment_status.is.null,payment_status.eq.pending,payment_status.eq.partial')
    .order('issue_date', { ascending: false })
    .limit(500);
  
  // Filtrar solo facturas (no NC ni ND)
  return ((data || []) as Invoice[]).filter(inv => 
    !inv.voucher_type?.startsWith('NC') && !inv.voucher_type?.startsWith('ND')
  );
}

export default async function CobranzasPage() {
  await requireAuth("/cobranzas");

  const [receipts, clients, invoices] = await Promise.all([
    getReceipts(),
    getClients(),
    getPendingInvoices(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <CobranzasClient 
          initialReceipts={receipts} 
          clients={clients}
          invoices={invoices}
        />
      </main>
    </div>
  );
}
