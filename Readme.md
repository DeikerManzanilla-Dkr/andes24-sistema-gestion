Documentación completa del proyecto Andes 24 – Sistema de Gestión
Resumen del proyecto
Andes 24 es un sistema de gestión de pólizas/RCV (Responsabilidad Civil Vehicular) construido como SPA (Single Page Application) con React + TypeScript, TailwindCSS para UI y Supabase como backend (Postgres + Storage). Permite emitir, guardar, consultar, imprimir y descargar documentos de pólizas, además de gestionar clientes, vehículos, planes y documentos generados.

Stack tecnológico
Frontend
React 18 con TypeScript (estricto)
Vite como bundler y dev server
TailwindCSS para estilos (modo dark/claro)
Lucide React para iconos
date-fns para fechas
react-hook-form + zod + @hookform/resolvers para formularios y validación
@supabase/supabase-js como cliente del backend
Backend
Supabase (Postgres + Storage + Auth)
Bucket documents para archivos JSON/PDF generados
Tablas: clients, vehicles, plans, contracts, documents
DevOps/Config
ESLint con TypeScript y React Hooks/Refresh
PostCSS + Autoprefixer
TypeScript con tsconfig.app.json y tsconfig.node.json
Git con .gitignore estándar
Estructura de archivos y carpetas
/
├── public/                     # Archivos estáticos (index.html, favicon)
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── ActionButton.tsx
│   │   ├── ActivityItem.tsx
│   │   ├── Header.tsx
│   │   ├── PolicyDocument.tsx   # Render de documento para imprimir
│   │   ├── Sidebar.tsx
│   │   └── StatCard.tsx
│   ├── context/               # Contextos globales
│   │   └── ThemeContext.tsx      # Dark/light mode
│   ├── lib/                   # Utilidades y clientes
│   │   └── supabaseClient.ts     # Cliente Supabase
│   ├── pages/                 # Páginas principales
│   │   ├── Archive/           # Formularios de catálogo
│   │   ├── Billing.tsx        # Emisión de pólizas
│   │   ├── Clients.tsx        # Gestión de clientes/vehículos
│   │   ├── Dashboard.tsx      # Dashboard principal
│   │   ├── Documents.tsx      # Lista de documentos emitidos
│   │   ├── PrintPolicy.tsx    # Vista de impresión
│   │   ├── Settings.tsx       # Configuración de planes
│   │   └── Verify.tsx         # Verificación pública de póliza
│   ├── types/                 # Tipos globales
│   │   └── index.ts
│   ├── App.tsx                # Router y layout principal
│   ├── main.tsx               # Entry point
│   └── index.css              # TailwindCSS
├── PLANTILLA/                 # Archivos base para documentos
│   ├── FORMATO PAPELERI.docx
│   └── FORMATO PAPELERIA .pdf
├── .env.local                 # Variables de entorno (no versionado)
├── .gitignore
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.*.json
Flujo de negocio y páginas clave
1) Clients (/clients)
Lista de clientes con búsqueda y paginación.
Al seleccionar un cliente, muestra sus vehículos.
Botones por vehículo:
Emitir RCV → navega a /billing?clientId=X&vehicleId=Y
Ver póliza → navega a /documents?clientId=X&vehicleId=Y
2) Billing (/billing)
Recibe clientId y vehicleId por query params.
Carga cliente, vehículo y planes disponibles.
Formulario de emisión:
Selección de plan
Fechas de inicio/fin (auto +1 año)
Al emitir:
Inserta en contracts
Guarda snapshot JSON en Supabase Storage (documents)
Inserta registro en tabla documents
Muestra modal con opciones:
Imprimir ahora → abre /print?contractId=X&autoprint=true
Solo descargar → descarga snapshot JSON
Cerrar → navega a /documents
3) PrintPolicy (/print)
Recibe contractId y opcional autoprint.
Carga contrato + cliente + vehículo + plan.
Muestra loading mientras carga.
Si autoprint=true, abre diálogo de impresión automáticamente.
Si no encuentra contrato, redirige a /.
4) Documents (/documents)
Lista de contratos con join a cliente y vehículo.
Búsqueda rápida por placa, cédula, número de póliza o nombre.
Filtros por query params: clientId, vehicleId, contractId.
Estados:
Si existe archivo: Descargar | Imprimir | Eliminar
Si no existe archivo: Generar → abre modal para crear snapshot y guardarlo.
5) Verify (/verify)
Página pública para verificar póliza por número.
Muestra datos básicos si encuentra contrato activo.
6) Settings (/settings)
CRUD de planes (nombre, precios, coberturas).
No requiere catálogo de usuarios/monedas en esta versión.
Componentes clave
PolicyDocument
Renderiza el documento para impresión usando un iframe con el PDF base.
Superpone datos dinámicos con position: absolute.
Genera QR de verificación inline.
Sidebar + Header
Navegación principal con iconos de Lucide.
Header incluye toggle de tema y buscador (aún no funcional).
ThemeContext
Maneja dark/light mode con localStorage y prefers-color-scheme.
Backend (Supabase)
Tablas principales
clients: datos del cliente
vehicles: datos del vehículo
plans: planes/precios/coberturas
contracts: pólizas emitidas
documents: metadatos de archivos guardados en Storage
Storage
Bucket documents para guardar snapshots JSON y futuros PDFs.
Relaciones
contracts.client_id → clients.id
contracts.vehicle_id → vehicles.id
documents.contract_id → contracts.id
Variables de entorno (.env.local)
env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
Scripts de desarrollo
bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Lint con ESLint
Notas técnicas
Router manual con window.history.pushState y window.location.pathname.
Uso de useMemo y useEffect para carga de datos y query params.
Formularios controlados con estado local.
Tipado estricto con TypeScript; alias ClientRow para evitar inferencia a never.
Manejo de relaciones con helper firstOrSelf para normalizar arrays de Supabase.
Guardado de snapshots en formato JSON en Supabase Storage.
Impresión vía window.print() y window.open para nueva pestaña.
Próximos pasos recomendados
Implementar paginación en listas grandes.
Agregar filtros de fechas en Documents.
Completar Archive para gestión de usuarios y monedas.
Mejorar buscador global del Header.
Considerar generación de PDF real con PDF-lib o similar.
Agregar tests unitarios/integración.
Este documento servirá como referencia mientras continuas el desarrollo y para facilitar el onboarding de nuevos desarrolladores...