// Tipos para integración con AFIP

// Facturas
export type InvoiceType = 'A' | 'B' | 'C';
// Notas de Crédito
export type CreditNoteType = 'NC_A' | 'NC_B' | 'NC_C';
// Notas de Débito
export type DebitNoteType = 'ND_A' | 'ND_B' | 'ND_C';
// Todos los tipos de comprobante
export type VoucherType = InvoiceType | CreditNoteType | DebitNoteType;

export const VOUCHER_TYPE_CODES: Record<VoucherType, number> = {
  // Facturas
  'A': 1,
  'B': 6,
  'C': 11,
  // Notas de Crédito
  'NC_A': 3,
  'NC_B': 8,
  'NC_C': 13,
  // Notas de Débito
  'ND_A': 2,
  'ND_B': 7,
  'ND_C': 12,
};

// Mantener compatibilidad con código existente
export const INVOICE_TYPE_CODES: Record<InvoiceType, number> = {
  'A': 1,
  'B': 6,
  'C': 11,
};

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  'A': 'Factura A',
  'B': 'Factura B',
  'C': 'Factura C',
  'NC_A': 'Nota de Crédito A',
  'NC_B': 'Nota de Crédito B',
  'NC_C': 'Nota de Crédito C',
  'ND_A': 'Nota de Débito A',
  'ND_B': 'Nota de Débito B',
  'ND_C': 'Nota de Débito C',
};

export const CONCEPT_CODES = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export const DOC_TYPE_CODES = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const;

export interface WSAACredentials {
  token: string;
  sign: string;
  expirationTime: Date;
}

export interface CreateInvoiceRequest {
  invoiceType: InvoiceType;
  pointOfSale: number;
  concept: number;
  docType: number;
  docNumber: string;
  invoiceDate: string;
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  serviceFrom?: string;
  serviceTo?: string;
  paymentDueDate?: string;
}

// Comprobante asociado (para NC y ND)
export interface AssociatedVoucher {
  type: number;        // Tipo de comprobante (1=FA, 6=FB, etc)
  pointOfSale: number; // Punto de venta
  number: number;      // Número de comprobante
  cuit?: string;       // CUIT del emisor (opcional, para comprobantes de terceros)
  date?: string;       // Fecha del comprobante asociado (YYYYMMDD)
}

export interface CreateCreditNoteRequest {
  creditNoteType: CreditNoteType;
  pointOfSale: number;
  concept: number;
  docType: number;
  docNumber: string;
  invoiceDate: string;
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  serviceFrom?: string;
  serviceTo?: string;
  paymentDueDate?: string;
  // Comprobante asociado (obligatorio para NC)
  associatedVoucher: AssociatedVoucher;
}

export interface InvoiceResponse {
  success: boolean;
  cae?: string;
  caeExpiration?: string;
  invoiceNumber?: number;
  errors?: AFIPError[];
  observations?: AFIPObservation[];
  rawResponse?: unknown;
}

export interface AFIPError {
  code: number;
  message: string;
}

export interface AFIPObservation {
  code: number;
  message: string;
}

export const AFIP_URLS = {
  production: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
  testing: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
} as const;

