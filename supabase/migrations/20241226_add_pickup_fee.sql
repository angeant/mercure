-- =============================================================================
-- MIGRACIÓN: Agregar campo retiro/pickup_fee
-- Fecha: 2024-12-26
-- Objetivo: Permitir agregar costo de retiro variable a envíos y cotizaciones
-- =============================================================================

-- 1. Agregar pickup_fee a quotations (donde se guarda el desglose de costos)
ALTER TABLE mercure.quotations 
  ADD COLUMN IF NOT EXISTS pickup_fee DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN mercure.quotations.pickup_fee IS 'Costo de retiro/recolección en origen';

-- 2. Agregar pickup_fee a shipments (opcional, para referencia rápida)
ALTER TABLE mercure.shipments 
  ADD COLUMN IF NOT EXISTS pickup_fee DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN mercure.shipments.pickup_fee IS 'Costo de retiro/recolección en origen';

