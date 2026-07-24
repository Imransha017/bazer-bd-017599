
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('phone','email')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  new_password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','used','expired')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  requester_ip TEXT,
  requester_ua TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prr_status ON public.password_reset_requests(status, created_at DESC);
CREATE INDEX idx_prr_identifier ON public.password_reset_requests(identifier);

GRANT ALL ON public.password_reset_requests TO service_role;
GRANT SELECT, UPDATE ON public.password_reset_requests TO authenticated;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages resets"
  ON public.password_reset_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_prr_updated
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
