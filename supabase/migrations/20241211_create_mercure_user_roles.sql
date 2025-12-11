-- Crear enum para roles de Mercure
CREATE TYPE mercure.mercure_role AS ENUM (
  'admin',
  'administrativo',
  'auxiliar_deposito',
  'chofer',
  'atencion_cliente',
  'contabilidad'
);

-- Crear tabla de roles de Mercure
CREATE TABLE mercure.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role mercure.mercure_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_mercure_user_roles_user_id ON mercure.user_roles(user_id);
CREATE INDEX idx_mercure_user_roles_role ON mercure.user_roles(role);

-- Trigger para updated_at
CREATE TRIGGER set_mercure_user_roles_updated_at
  BEFORE UPDATE ON mercure.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION mercure.set_updated_at();

-- Crear VIEW en public para acceso desde la API de Supabase
CREATE OR REPLACE VIEW public.mercure_user_roles AS
SELECT * FROM mercure.user_roles;

-- Permisos para la view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercure_user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercure_user_roles TO service_role;

-- Habilitar RLS
ALTER TABLE mercure.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: service_role tiene acceso total
CREATE POLICY "Service role has full access to user_roles"
  ON mercure.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: usuarios autenticados pueden ver su propio rol
CREATE POLICY "Users can view their own role"
  ON mercure.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE mercure.user_roles IS 'Roles específicos de Mercure para cada usuario';
COMMENT ON COLUMN mercure.user_roles.role IS 'Rol del usuario en Mercure (admin, administrativo, auxiliar_deposito, chofer, atencion_cliente, contabilidad)';

