-- ============================================
-- ESQUEMA PARA SISTEMA DE FACTURACIÓN
-- Sistema de Gestión Andes 24
-- ============================================
-- Este script crea las tablas necesarias para el sistema
-- de facturación digital y modifica la tabla documents
-- para soportar facturas.
-- ============================================

-- 1. CREAR TABLA INVOICES (CABECERA DE FACTURA)
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 2. CREAR TABLA INVOICE_ITEMS (DETALLE DE FACTURA)
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- 3. MODIFICAR TABLA DOCUMENTS PARA SOPORTAR FACTURAS
-- ============================================

-- Agregar columna invoice_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Crear índice para invoice_id en documents
CREATE INDEX IF NOT EXISTS idx_documents_invoice_id ON public.documents(invoice_id);

-- 4. HABILITAR RLS EN LAS NUEVAS TABLAS
-- ============================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA INVOICES
-- ============================================

-- Política para INSERT: Solo el usuario que crea puede insertar
CREATE POLICY "invoices_insert_own" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para SELECT: Usuarios pueden ver sus propias facturas
CREATE POLICY "invoices_select_own" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para UPDATE: Solo el dueño puede actualizar
CREATE POLICY "invoices_update_own" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: Solo el dueño puede eliminar
CREATE POLICY "invoices_delete_own" ON public.invoices
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. POLÍTICAS RLS PARA INVOICE_ITEMS
-- ============================================

-- Política para INSERT: Solo si el usuario es dueño de la factura
CREATE POLICY "invoice_items_insert_via_invoice" ON public.invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Política para SELECT: Solo si el usuario es dueño de la factura
CREATE POLICY "invoice_items_select_via_invoice" ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Política para UPDATE: Solo si el usuario es dueño de la factura
CREATE POLICY "invoice_items_update_via_invoice" ON public.invoice_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Política para DELETE: Solo si el usuario es dueño de la factura
CREATE POLICY "invoice_items_delete_via_invoice" ON public.invoice_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- 7. TRIGGER PARA ACTUALIZAR updated_at EN INVOICES
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. VERIFICACIÓN DE ESTRUCTURA
-- ============================================

-- Verificar tablas creadas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('invoices', 'invoice_items')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verificar políticas RLS
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
WHERE tablename IN ('invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Este script crea las tablas necesarias para el sistema de facturación
-- 2. Las políticas RLS aseguran que cada usuario solo pueda acceder a sus propias facturas
-- 3. La tabla documents ahora soporta tanto contracts como invoices
-- 4. Los índices mejoran el rendimiento de las consultas
-- 5. El trigger actualiza automáticamente el campo updated_at
-- ============================================
