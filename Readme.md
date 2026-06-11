# Documentación completa del proyecto Andes 24 – Sistema de Gestión

## Resumen del proyecto
Andes 24 es un sistema de gestión de pólizas/RCV (Responsabilidad Civil Vehicular) construido como SPA (Single Page Application) con React + TypeScript, TailwindCSS para UI y Supabase como backend (Postgres + Storage + Auth). Permite emitir, guardar, consultar, imprimir y descargar documentos de pólizas, además de gestionar clientes, vehículos, planes, documentos generados, seguimientos CRM y reportes financieros.

## Stack tecnológico

### Frontend
- React 18 con TypeScript (estricto)
- Vite como bundler y dev server
- TailwindCSS para estilos (modo dark/claro)
- Lucide React para iconos
- date-fns para fechas
- react-hook-form + zod + @hookform/resolvers para formularios y validación
- @supabase/supabase-js como cliente del backend
- pdf-lib para generación de PDFs programática
- react-to-print para impresión de reportes

### Backend
- Supabase (Postgres + Storage + Auth)
- Bucket documents para archivos PDF generados
- Edge Functions: issue-policy, generate-automatic-followups, update-expired-policies
- Tablas: clients, vehicles, plans, contracts, documents, financial_transactions, seguimientos, document_overlays

### DevOps/Config
- ESLint con TypeScript y React Hooks/Refresh
- PostCSS + Autoprefixer
- TypeScript con tsconfig.app.json y tsconfig.node.json
- Git con .gitignore estándar
- Vercel para despliegue (vercel.json con SPA rewrite rules)
## Estructura de archivos y carpetas
```
/
├── public/                     # Archivos estáticos (index.html, favicon)
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── ActionButton.tsx
│   │   ├── ActivityItem.tsx
│   │   ├── Header.tsx
│   │   ├── PolicyDocument.tsx   # Render de documento para imprimir
│   │   ├── PolicySuccessModal.tsx # Modal de éxito tras emisión
│   │   ├── SearchBar.tsx         # Barra de búsqueda global
│   │   ├── Sidebar.tsx
│   │   └── StatCard.tsx
│   ├── context/               # Contextos globales
│   │   ├── AuthContext.tsx        # Autenticación de usuarios
│   │   ├── ExchangeRateContext.tsx # Tasas de cambio BCV
│   │   ├── RealtimeProvider.tsx    # Actualizaciones en tiempo real
│   │   └── ThemeContext.tsx        # Dark/light mode
│   ├── hooks/                 # Custom hooks
│   │   ├── useDashboardStats.ts   # Estadísticas del dashboard
│   │   ├── useDebounce.ts          # Debounce para búsquedas
│   │   ├── useFullContracts.ts    # Contratos con relaciones
│   │   ├── usePolicyStatus.ts      # Estado de pólizas
│   │   ├── useRecentActivity.ts    # Actividad reciente
│   │   └── useReminders.ts         # Recordatorios/seguimientos
│   ├── lib/                   # Utilidades y clientes
│   │   ├── exchangeRates.ts       # Cliente de tasas BCV
│   │   ├── pdfGenerator.ts         # Generador de PDFs con pdf-lib
│   │   ├── salesHelper.ts          # Helpers de ventas
│   │   └── supabaseClient.ts       # Cliente Supabase
│   ├── pages/                 # Páginas principales
│   │   ├── Archive/           # Formularios de catálogo
│   │   ├── Billing.tsx        # Emisión de pólizas
│   │   ├── Clients.tsx        # Gestión de clientes/vehículos
│   │   ├── CRM.tsx            # Gestión de renovaciones y recordatorios
│   │   ├── Dashboard.tsx      # Dashboard principal
│   │   ├── Documents.tsx      # Lista de documentos emitidos
│   │   ├── Login.tsx          # Página de login
│   │   ├── PrintPolicy.tsx    # Vista de impresión
│   │   ├── QRCodes.tsx        # Galería de códigos QR
│   │   ├── Reports.tsx        # Informes financieros
│   │   ├── Settings.tsx       # Configuración de planes
│   │   ├── Verification.tsx   # Verificación pública por ID
│   │   ├── Verify.tsx         # Verificación pública de póliza
│   │   └── Vehicles.tsx       # Gestión de vehículos
│   ├── services/             # Servicios de negocio
│   │   └── createRCVSale.ts       # RPC para crear ventas RCV
│   ├── types/                 # Tipos globales
│   │   ├── database.ts           # Tipos de base de datos
│   │   └── index.ts
│   ├── App.tsx                # Router y layout principal
│   ├── main.tsx               # Entry point
│   └── index.css              # TailwindCSS
├── supabase/                  # Configuración y Edge Functions
│   ├── config.toml            # Configuración de Supabase CLI
│   └── functions/             # Edge Functions
│       ├── generate-automatic-followups/
│       ├── issue-policy/
│       └── update-expired-policies/
├── PLANTILLA/                 # Archivos base para documentos
│   └── PLANTILLA PAPELERIA.pdf
├── .env                       # Variables de entorno (no versionado)
├── .gitignore
├── package.json
├── tailwind.config.js
├── vercel.json                # Configuración de despliegue en Vercel
├── vite.config.ts
└── tsconfig.*.json
```
## Flujo de negocio y páginas clave

### 1) Login (/login)
Página de autenticación con Supabase Auth.
Requiere email y contraseña.
Redirige a /dashboard tras login exitoso.
Protegido por AuthContext - todas las páginas internas requieren sesión activa.

### 2) Dashboard (/dashboard)
Vista principal con estadísticas en tiempo real.
Muestra:
- Total de clientes
- Total de vehículos
- Pólizas activas
- Renovaciones pendientes (30 días)
- Actividad reciente
- Recordatorios pendientes
Se actualiza automáticamente vía RealtimeProvider.

### 3) Clients (/clients)
Lista de clientes con búsqueda y paginación.
Al seleccionar un cliente, muestra sus vehículos.
Botones por vehículo:
- Emitir RCV → navega a /billing?clientId=X&vehicleId=Y
- Ver póliza → navega a /documents?clientId=X&vehicleId=Y

### 4) Billing (/billing)
Recibe clientId y vehicleId por query params.
Carga cliente, vehículo y planes disponibles (con tasas de cambio BCV).
Formulario de emisión:
- Selección de plan
- Fechas de inicio/fin (auto +1 año)
- Método de pago
Al emitir:
- Usa RPC create_rcv_sale para crear contrato, venta y transacción financiera
- Genera PDF con pdf-lib
- Guarda PDF en Supabase Storage
- Muestra PolicySuccessModal con opciones:
  - Imprimir ahora → abre diálogo de impresión
  - Descargar PDF → descarga archivo generado
  - Cerrar → navega a /documents

### 5) Documents (/documents)
Lista de contratos con join a cliente y vehículo.
Búsqueda rápida por placa, cédula, número de póliza o nombre.
Filtros por query params: clientId, vehicleId, contractId.
Estados:
- Si existe PDF: Descargar | Imprimir | Eliminar
- Si no existe PDF: Generar → regenera PDF con pdf-lib

### 6) QRCodes (/qrcodes)
Galería de códigos QR para todas las pólizas emitidas.
Búsqueda por placa, cédula, póliza o nombre.
Muestra tarjetas con:
- Número de póliza y placa
- Datos del cliente (nombre, cédula)
- Código QR (enlace a verificación)
- Estado (Activa/Inactiva)
- Acciones: Ver PDF, Descargar (si existe)

### 7) CRM (/crm)
Gestión de renovaciones y recordatorios.
Muestra pólizas vencidas o por vencer en próximos 15 días.
Indicadores visuales por estado:
- Vencida (rojo)
- Por vencer ≤7 días (ámbar)
- Por vencer >7 días (amarillo)
Botón de recordatorio WhatsApp:
- Genera mensaje personalizado
- Abre WhatsApp Web con mensaje prellenado
- Formatea número de teléfono para Venezuela (+58)

### 8) Reports (/reports)
Informes financieros con tabla financial_transactions.
Filtros:
- Por tipo (ingresos/egresos/todos)
- Por rango de fechas
Muestra:
- Ingresos totales
- Gastos totales
- Utilidad neta
- Detalle de operaciones
Funcionalidades:
- Registrar gastos administrativos
- Imprimir reporte (react-to-print)

### 9) Settings (/settings)
CRUD de planes (nombre, precios, coberturas).
Gestión de tasas de cambio (ExchangeRateContext).
Configuración general del sistema.

### 10) Verify (/verify)
Página pública para verificar póliza por número.
Muestra datos básicos si encuentra contrato activo.

### 11) Verification (/verificar/:contractId)
Página pública para verificar póliza por ID de contrato.
Muestra detalles completos:
- Estado de la póliza (Activa/Vencida)
- Datos del titular
- Datos del vehículo
- Plan y vigencia
- Contactos de Andes 24

### 12) PrintPolicy (/print)
Vista de impresión de póliza (legacy - reemplazado por generación PDF directa).
## Componentes clave

### PolicyDocument
Renderiza el documento para impresión usando un iframe con el PDF base.
Superpone datos dinámicos con position: absolute.
Genera QR de verificación inline.
**Nota**: Esta implementación es legacy. La generación actual usa pdf-lib.

### PolicySuccessModal
Modal que se muestra tras emitir una póliza exitosamente.
Opciones:
- Imprimir PDF generado
- Descargar PDF
- Cerrar y navegar a documentos

### SearchBar
Barra de búsqueda reutilizable con debounce.
Utilizada en varias páginas para filtrado rápido.

### Sidebar + Header
Navegación principal con iconos de Lucide.
Header incluye toggle de tema.
Sidebar muestra todas las páginas del sistema.

## Contextos y Hooks

### AuthContext
Maneja autenticación con Supabase Auth.
Proporciona:
- session: Sesión actual del usuario
- loading: Estado de carga
- signOut: Función para cerrar sesión
Redirecciones automáticas según estado de autenticación.

### ExchangeRateContext
Gestiona tasas de cambio del BCV (USD/EUR).
Actualización automática cada 24 horas.
Cache local para evitar llamadas innecesarias.
Proporciona:
- rates: Tasas actuales (usd, eur en Bs)
- isLoadingRates: Estado de carga
- ratesError: Error si existe
- refreshRates: Función para refrescar manualmente

### RealtimeProvider
Suscripción a cambios en tiempo real de Supabase.
Escucha cambios en: clients, vehicles, contracts, seguimientos, plans, documents, document_overlays.
Proporciona signals que trigger re-fetch de datos en hooks.

### Custom Hooks
- **useDashboardStats**: Estadísticas del dashboard (clientes, vehículos, pólizas activas, renovaciones)
- **useDebounce**: Debounce para inputs de búsqueda
- **useFullContracts**: Contratos con relaciones (client, vehicle) cargadas
- **usePolicyStatus**: Estado de póliza (activa, vencida, por vencer)
- **useRecentActivity**: Actividad reciente del sistema
- **useReminders**: Recordatorios y seguimientos pendientes
## Backend (Supabase)

### Tablas principales
- **clients**: datos del cliente (nombre, cédula, teléfono, dirección, email)
- **vehicles**: datos del vehículo (placa, marca, modelo, año, seriales)
- **plans**: planes/precios/coberturas (price_usd, price_eur, coverage_details)
- **contracts**: pólizas emitidas (policy_number, fechas, status, pdf_url)
- **documents**: metadatos de archivos guardados en Storage
- **financial_transactions**: transacciones financieras (ingresos/egresos)
- **seguimientos**: recordatorios y seguimientos CRM
- **document_overlays**: overlays personalizados para documentos PDF

### Storage
- **Bucket documents**: para guardar PDFs generados

### Relaciones
- contracts.client_id → clients.id
- contracts.vehicle_id → vehicles.id
- contracts.plan_id → plans.id
- documents.contract_id → contracts.id
- financial_transactions.contract_id → contracts.id
- seguimientos.cliente_id → clients.id
- seguimientos.contract_id → contracts.id
- document_overlays.contract_id → contracts.id

### Edge Functions
- **issue-policy**: Generación de pólizas programada
- **generate-automatic-followups**: Genera seguimientos automáticos para renovaciones
- **update-expired-policies**: Actualiza estado de pólizas vencidas

### RPC Functions
- **create_rcv_sale**: Crea venta RCV completa (contrato + venta + transacción financiera) de forma atómica
## Variables de entorno (.env)
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Scripts de desarrollo
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Lint con ESLint
```

## Generación de PDFs

### pdf-lib (Implementación actual)
El sistema usa pdf-lib para generar PDFs programáticos:
- Carga plantilla base (PLANTILLA PAPELERIA.pdf)
- Superpone datos dinámicos usando coordenadas precisas
- Genera QR codes inline con api.qrserver.com
- Renderiza: header, cliente, vehículo, coberturas, carnet (front/back)
- Guarda PDF generado en Supabase Storage

### Servicios relacionados
- **pdfGenerator.ts**: Motor de generación de PDFs con TemplateEngine
- **createRCVSale.ts**: RPC para crear ventas completas con generación de PDF

## Notas técnicas

### Routing
Router manual con window.history.pushState y window.location.pathname.
Manejo de rutas dinámicas (/verificar/:contractId).

### Estado y Datos
- Uso de useMemo y useEffect para carga de datos y query params
- Formularios controlados con estado local
- Tipado estricto con TypeScript; tipos centralizados en types/database.ts
- Manejo de relaciones con helper para normalizar arrays de Supabase
- Realtime updates vía RealtimeProvider para sincronización automática

### Autenticación
- Supabase Auth con AuthContext
- Protección de rutas internas
- Redirecciones automáticas según estado de sesión

### PDFs e Impresión
- Generación programática con pdf-lib (no más snapshots JSON)
- Impresión vía window.print() y react-to-print para reportes
- Storage en Supabase para PDFs generados

### Tasas de Cambio
- Integración con BCV (Banco Central de Venezuela)
- Actualización automática cada 24 horas
- Cache local para optimizar rendimiento

### Despliegue
- Configurado para Vercel con SPA rewrite rules (vercel.json)
- Build optimizado con Vite

## Próximos pasos recomendados

### Funcionalidades pendientes
- Implementar paginación en listas grandes (Documents, QRCodes)
- Agregar filtros de fechas avanzados en Documents
- Completar Archive para gestión de usuarios y monedas
- Mejorar buscador global del Header
- Implementar sistema de notificaciones para seguimientos

### Mejoras técnicas
- Agregar tests unitarios/integración
- Implementar error boundaries
- Optimizar carga de PDFs (lazy loading)
- Agregar sistema de logging centralizado
- Implementar PWA para offline support

### CRM y Automatización
- Configurar Edge Functions para ejecución automática
- Implementar sistema de email marketing
- Agregar analytics de conversiones
- Dashboard de métricas de renovación

---
Este documento servirá como referencia mientras continuas el desarrollo y para facilitar el onboarding de nuevos desarrolladores.