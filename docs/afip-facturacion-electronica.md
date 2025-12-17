# Facturación Electrónica AFIP - Documentación Técnica

## Webservice utilizado

**wsfev1** - Web Service de Facturación Electrónica V1
- Documentación oficial: https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
- Manual del desarrollador: https://www.afip.gob.ar/fe/ayuda/documentos/wsfev1-COMPG.pdf

## Tipos de Comprobante Implementados

### Facturas (implementado ✅)
| Tipo | Código AFIP | Descripción |
|------|-------------|-------------|
| A    | 1           | Factura A   |
| B    | 6           | Factura B   |
| C    | 11          | Factura C   |

### Notas de Crédito (implementado ✅)
| Tipo | Código AFIP | Descripción |
|------|-------------|-------------|
| NC_A | 3           | Nota de Crédito A |
| NC_B | 8           | Nota de Crédito B |
| NC_C | 13          | Nota de Crédito C |

### Notas de Débito (tipos definidos, pendiente UI)
| Tipo | Código AFIP | Descripción |
|------|-------------|-------------|
| ND_A | 2           | Nota de Débito A |
| ND_B | 7           | Nota de Débito B |
| ND_C | 12          | Nota de Débito C |

### FCE - Factura de Crédito Electrónica MiPyMEs (no implementado ❌)
| Tipo | Código AFIP | Descripción |
|------|-------------|-------------|
| FCE_A | 201 | Factura de Crédito Electrónica A |
| FCE_B | 206 | Factura de Crédito Electrónica B |
| FCE_C | 211 | Factura de Crédito Electrónica C |
| NC_FCE_A | 203 | Nota de Crédito FCE A |
| NC_FCE_B | 208 | Nota de Crédito FCE B |
| NC_FCE_C | 213 | Nota de Crédito FCE C |
| ND_FCE_A | 202 | Nota de Débito FCE A |
| ND_FCE_B | 207 | Nota de Débito FCE B |
| ND_FCE_C | 212 | Nota de Débito FCE C |

## Archivos del Sistema

### Core AFIP
- `src/lib/afip/types.ts` - Tipos TypeScript y códigos de comprobante
- `src/lib/afip/wsaa.ts` - Autenticación WSAA (Token + Sign)
- `src/lib/afip/wsfe.ts` - Cliente WSFE para emisión de comprobantes

### Endpoints API
- `POST /api/afip/factura-directa` - Emitir factura directa
- `POST /api/afip/factura-nueva` - Emitir factura desde liquidación
- `POST /api/afip/nota-credito` - Emitir nota de crédito
- `GET /api/afip/invoice` - Obtener datos de factura

### Páginas UI
- `/facturas` - Listado de comprobantes (facturas y NC)
- `/facturas/nueva` - Emitir nueva factura
- `/facturas/nueva-nc` - Emitir nota de crédito

## Estructura de Datos

### Tabla `mercure.invoices`
```sql
-- Campos principales
id                    SERIAL PRIMARY KEY
invoice_number        TEXT NOT NULL        -- Ej: "00001-00000123"
invoice_type          CHAR(1) NOT NULL     -- A, B, C
voucher_type          TEXT                 -- NC_A, NC_B, NC_C para NC
point_of_sale         INTEGER NOT NULL
issue_date            DATE NOT NULL
client_entity_id      INTEGER              -- FK a entities
client_cuit           TEXT
client_name           TEXT NOT NULL
neto                  NUMERIC NOT NULL
iva                   NUMERIC NOT NULL
total                 NUMERIC NOT NULL
cae                   TEXT NOT NULL
cae_expiration        DATE

-- Campos para NC/ND (comprobante asociado)
associated_voucher_type   INTEGER          -- Código AFIP del original
associated_voucher_pos    INTEGER          -- Punto de venta original
associated_voucher_number INTEGER          -- Número original
```

## Notas de Crédito - Implementación

### Flujo de emisión
1. Usuario busca la factura original a creditar
2. Selecciona NC Total (anula factura) o Parcial
3. Sistema determina tipo de NC según factura (FA→NC_A, FB→NC_B, FC→NC_C)
4. Se envía request a AFIP con `CbtesAsoc` (comprobante asociado)
5. Se guarda en DB con referencia al comprobante original

### Request SOAP para NC
```xml
<ar:CbtesAsoc>
  <ar:CbteAsoc>
    <ar:Tipo>{tipo_factura_original}</ar:Tipo>
    <ar:PtoVta>{punto_venta}</ar:PtoVta>
    <ar:Nro>{numero_factura}</ar:Nro>
  </ar:CbteAsoc>
</ar:CbtesAsoc>
```

## Códigos de Concepto
| Código | Descripción |
|--------|-------------|
| 1      | Productos |
| 2      | Servicios |
| 3      | Productos y Servicios |

## Códigos de Documento
| Código | Descripción |
|--------|-------------|
| 80     | CUIT |
| 86     | CUIL |
| 96     | DNI |
| 99     | Consumidor Final |

## Códigos de IVA
| Código | Alícuota |
|--------|----------|
| 3      | 0% |
| 4      | 10.5% |
| 5      | 21% |
| 6      | 27% |
| 8      | 5% |
| 9      | 2.5% |

## Configuración

### Variables de entorno
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Tabla `mercure.afip_config`
- `cuit` - CUIT del emisor
- `environment` - 'production' o 'testing'
- `certificate` - Certificado digital (PEM)
- `private_key` - Clave privada (PEM)

## URLs AFIP

### Producción
- WSAA: `https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL`
- WSFE: `https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL`

### Homologación (Testing)
- WSAA: `https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL`
- WSFE: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL`

---
*Última actualización: Diciembre 2024*

