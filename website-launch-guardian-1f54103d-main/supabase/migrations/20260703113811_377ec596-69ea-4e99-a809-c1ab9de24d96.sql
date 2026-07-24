
CREATE TABLE public.wp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  site_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_connections TO authenticated;
GRANT ALL ON public.wp_connections TO service_role;

ALTER TABLE public.wp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wp_connections"
  ON public.wp_connections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wp_connections_updated_at
  BEFORE UPDATE ON public.wp_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
