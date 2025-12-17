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

### FCE - Factura de Crédito Electrónica MiPyMEs (implementado ✅)
| Tipo | Código AFIP | Descripción |
|------|-------------|-------------|
| FCE_A | 201 | Factura de Crédito Electrónica A |
| FCE_B | 206 | Factura de Crédito Electrónica B |
| FCE_C | 211 | Factura de Crédito Electrónica C |
| NC_FCE_A | 203 | Nota de Crédito FCE A (pendiente UI) |
| NC_FCE_B | 208 | Nota de Crédito FCE B (pendiente UI) |
| NC_FCE_C | 213 | Nota de Crédito FCE C (pendiente UI) |
| ND_FCE_A | 202 | Nota de Débito FCE A (pendiente UI) |
| ND_FCE_B | 207 | Nota de Débito FCE B (pendiente UI) |
| ND_FCE_C | 212 | Nota de Débito FCE C (pendiente UI) |

## Archivos del Sistema

### Core AFIP
- `src/lib/afip/types.ts` - Tipos TypeScript y códigos de comprobante
- `src/lib/afip/wsaa.ts` - Autenticación WSAA (Token + Sign)
- `src/lib/afip/wsfe.ts` - Cliente WSFE para emisión de comprobantes

### Endpoints API
- `POST /api/afip/factura-directa` - Emitir factura directa
- `POST /api/afip/factura-nueva` - Emitir factura desde liquidación
- `POST /api/afip/nota-credito` - Emitir nota de crédito
- `POST /api/afip/fce` - Emitir FCE MiPyME
- `GET /api/afip/invoice` - Obtener datos de factura

### Páginas UI
- `/facturas` - Listado de comprobantes (facturas, NC, FCE)
- `/facturas/nueva` - Emitir nueva factura
- `/facturas/nueva-nc` - Emitir nota de crédito
- `/facturas/nueva-fce` - Emitir FCE MiPyME

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

## FCE - Factura de Crédito Electrónica MiPyMEs

### ¿Qué es una FCE?
Comprobante regulado por la Ley 27.440 para PyMEs que venden a grandes empresas.
El receptor tiene 30 días para aceptar o rechazar. Puede ser cedida a entidades financieras.

### Campos específicos FCE (Opcionales AFIP)
| Código | Campo | Descripción |
|--------|-------|-------------|
| 2101   | CBU Emisor | CBU para cobro (22 dígitos) - **Obligatorio** |
| 2102   | Alias Emisor | Alias del CBU emisor (opcional) |
| 27     | CBU Receptor | CBU del receptor para pago directo (opcional) |
| 2103   | SCA | Sistema Circulación Abierta: S=transferible, N=no |

### Request SOAP para FCE
```xml
<ar:Opcionales>
  <ar:Opcional>
    <ar:Id>2101</ar:Id>
    <ar:Valor>{cbu_emisor}</ar:Valor>
  </ar:Opcional>
  <ar:Opcional>
    <ar:Id>2103</ar:Id>
    <ar:Valor>S</ar:Valor>
  </ar:Opcional>
</ar:Opcionales>
```

### Requisitos para emitir FCE
1. El emisor debe estar registrado como MiPyME en AFIP
2. El receptor debe ser una "Gran Empresa" según AFIP
3. El punto de venta debe estar habilitado para FCE
4. Se requiere CBU válido de 22 dígitos

---

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

