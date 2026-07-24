
CREATE TABLE public.wp_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid REFERENCES public.wp_connections(id) ON DELETE SET NULL,
  site_label text,
  pages int NOT NULL DEFAULT 0,
  fetched int NOT NULL DEFAULT 0,
  inserted int NOT NULL DEFAULT 0,
  updated int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wp_sync_logs TO authenticated;
GRANT ALL ON public.wp_sync_logs TO service_role;

ALTER TABLE public.wp_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.wp_sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX wp_sync_logs_created_at_idx ON public.wp_sync_logs (created_at DESC);
