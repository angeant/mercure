-- Tabla de recibos de cobranza
CREATE TABLE IF NOT EXISTS mercure.receipts (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(20) NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cliente
  client_entity_id INTEGER REFERENCES mercure.entities(id),
  client_name VARCHAR(255) NOT NULL,
  client_cuit VARCHAR(20),
  client_address TEXT,
  client_cbu VARCHAR(30),
  
  -- Moneda
  currency VARCHAR(3) NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1,
  
  -- Totales
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  -- Observaciones
  observations TEXT,
  
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent', 'cancelled')),
  
  -- Auditoría
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de pago del recibo (efectivo, transferencia, cheque, etc.)
CREATE TABLE IF NOT EXISTS mercure.receipt_payment_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES mercure.receipts(id) ON DELETE CASCADE,
  
  payment_type VARCHAR(50) NOT NULL, -- 'efectivo', 'transferencia', 'cheque', 'retenciones', etc.
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  -- Para cheques
  cheque_number VARCHAR(50),
  cheque_bank VARCHAR(100),
  cheque_date DATE,
  
  -- Para transferencias
  transfer_reference VARCHAR(100),
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprobantes cancelados por el recibo
CREATE TABLE IF NOT EXISTS mercure.receipt_cancelled_invoices (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES mercure.receipts(id) ON DELETE CASCADE,
  
  invoice_id INTEGER REFERENCES mercure.invoices(id),
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE,
  invoice_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_applied NUMERIC(14,2) NOT NULL DEFAULT 0, -- Monto aplicado (puede ser parcial)
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_receipts_client ON mercure.receipts(client_entity_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON mercure.receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON mercure.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON mercure.receipt_payment_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_cancelled_receipt ON mercure.receipt_cancelled_invoices(receipt_id);

-- RLS
ALTER TABLE mercure.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mercure.receipt_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mercure.receipt_cancelled_invoices ENABLE ROW LEVEL SECURITY;

-- Secuencia para número de recibo
CREATE SEQUENCE IF NOT EXISTS mercure.receipt_number_seq START 1;

-- Función para generar número de recibo automático
CREATE OR REPLACE FUNCTION mercure.generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'R-' || LPAD(nextval('mercure.receipt_number_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número automáticamente
DROP TRIGGER IF EXISTS trg_generate_receipt_number ON mercure.receipts;
CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON mercure.receipts
  FOR EACH ROW
  EXECUTE FUNCTION mercure.generate_receipt_number();

-- Comentarios
COMMENT ON TABLE mercure.receipts IS 'Recibos de cobranza emitidos a clientes';
COMMENT ON TABLE mercure.receipt_payment_items IS 'Detalle de medios de pago del recibo';
COMMENT ON TABLE mercure.receipt_cancelled_invoices IS 'Comprobantes cancelados por el recibo';

-- Agregar columnas de pago a facturas (para tracking)
ALTER TABLE mercure.invoices 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
ADD COLUMN IF NOT EXISTS receipt_id INTEGER REFERENCES mercure.receipts(id),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) DEFAULT 0;

COMMENT ON COLUMN mercure.invoices.payment_status IS 'Estado de cobro: pending, partial, paid';
COMMENT ON COLUMN mercure.invoices.receipt_id IS 'Recibo que canceló esta factura';
COMMENT ON COLUMN mercure.invoices.paid_at IS 'Fecha de pago';
COMMENT ON COLUMN mercure.invoices.paid_amount IS 'Monto cobrado';

