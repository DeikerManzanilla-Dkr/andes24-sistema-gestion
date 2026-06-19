-- ============================================
-- POLÍTICAS RLS PARA BÚSQUEDA GLOBAL MULTIUSUARIO
-- Sistema de Gestión Andes 24
-- ============================================
-- Este script modifica las políticas de Row Level Security (RLS)
-- para permitir que cualquier usuario autenticado pueda leer
-- clientes, vehículos y documentos registrados por otros usuarios.
-- Esto permite la búsqueda global y el reciclaje de clientes
-- entre diferentes vendedores/sucursales.
-- ============================================

-- 1. POLÍTICAS PARA LA TABLA CLIENTS
-- ============================================

-- Eliminar políticas existentes de SELECT en clients
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
DROP POLICY IF EXISTS "clients_select_all" ON public.clients;

-- Crear política para permitir SELECT a cualquier usuario autenticado
CREATE POLICY "clients_select_global" ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. POLÍTICAS PARA LA TABLA VEHICLES
-- ============================================

-- Eliminar políticas existentes de SELECT en vehicles
DROP POLICY IF EXISTS "vehicles_select_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select_all" ON public.vehicles;

-- Crear política para permitir SELECT a cualquier usuario autenticado
CREATE POLICY "vehicles_select_global" ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. POLÍTICAS PARA LA TABLA DOCUMENTS
-- ============================================

-- Eliminar políticas existentes de SELECT en documents
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
DROP POLICY IF EXISTS "documents_select_all" ON public.documents;

-- Crear política para permitir SELECT a cualquier usuario autenticado
CREATE POLICY "documents_select_global" ON public.documents
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. POLÍTICAS PARA LA TABLA CONTRACTS (necesario para relaciones)
-- ============================================

-- Eliminar políticas existentes de SELECT en contracts
DROP POLICY IF EXISTS "contracts_select_own" ON public.contracts;
DROP POLICY IF EXISTS "contracts_select_all" ON public.contracts;

-- Crear política para permitir SELECT a cualquier usuario autenticado
CREATE POLICY "contracts_select_global" ON public.contracts
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VERIFICACIÓN DE POLÍTICAS
-- ============================================

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('clients', 'vehicles', 'documents', 'contracts')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Estas políticas permiten LECTURA (SELECT) global para usuarios autenticados
-- 2. Las políticas de INSERT, UPDATE y DELETE deben mantenerse restringidas
--    para que cada usuario solo pueda modificar sus propios registros
-- 3. Esto permite que un vendedor pueda buscar clientes registrados por otros
--    vendedores y "reciclarlos" para nuevas ventas sin generar duplicados
-- 4. Para mayor seguridad, puedes agregar restricciones adicionales basadas en
--    roles o sucursales si tu sistema lo requiere
-- ============================================
