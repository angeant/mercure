// Tipos para integración con AFIP

// Facturas
export type InvoiceType = 'A' | 'B' | 'C';
// Notas de Crédito
export type CreditNoteType = 'NC_A' | 'NC_B' | 'NC_C';
// Notas de Débito
export type DebitNoteType = 'ND_A' | 'ND_B' | 'ND_C';
// FCE - Factura de Crédito Electrónica MiPyMEs
export type FCEType = 'FCE_A' | 'FCE_B' | 'FCE_C';
// NC FCE
export type NCFCEType = 'NC_FCE_A' | 'NC_FCE_B' | 'NC_FCE_C';
// ND FCE
export type NDFCEType = 'ND_FCE_A' | 'ND_FCE_B' | 'ND_FCE_C';

// Todos los tipos de comprobante
export type VoucherType = InvoiceType | CreditNoteType | DebitNoteType | FCEType | NCFCEType | NDFCEType;

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
  // FCE - Factura de Crédito Electrónica MiPyMEs
  'FCE_A': 201,
  'FCE_B': 206,
  'FCE_C': 211,
  // NC FCE
  'NC_FCE_A': 203,
  'NC_FCE_B': 208,
  'NC_FCE_C': 213,
  // ND FCE
  'ND_FCE_A': 202,
  'ND_FCE_B': 207,
  'ND_FCE_C': 212,
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
  'FCE_A': 'FCE MiPyME A',
  'FCE_B': 'FCE MiPyME B',
  'FCE_C': 'FCE MiPyME C',
  'NC_FCE_A': 'NC FCE A',
  'NC_FCE_B': 'NC FCE B',
  'NC_FCE_C': 'NC FCE C',
  'ND_FCE_A': 'ND FCE A',
  'ND_FCE_B': 'ND FCE B',
  'ND_FCE_C': 'ND FCE C',
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

// FCE - Factura de Crédito Electrónica MiPyMEs
export interface CreateFCERequest {
  fceType: FCEType;
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
  // Campos específicos FCE
  cbuEmisor: string;           // CBU del emisor (22 dígitos)
  aliasEmisor?: string;        // Alias del CBU emisor (opcional)
  cbuReceptor?: string;        // CBU del receptor (opcional)
  aliasReceptor?: string;      // Alias del CBU receptor (opcional)
  sca?: 'S' | 'N';             // Sistema de Circulación Abierta (S=transferible, N=no)
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

