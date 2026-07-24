-- Settings singleton
CREATE TABLE IF NOT EXISTS public.dropshipping_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  default_commission_pct numeric NOT NULL DEFAULT 0,
  min_payout numeric NOT NULL DEFAULT 500,
  cookie_days integer NOT NULL DEFAULT 30,
  auto_approve_apps boolean NOT NULL DEFAULT false,
  auto_approve_earnings boolean NOT NULL DEFAULT true,
  allowed_payout_methods text[] NOT NULL DEFAULT ARRAY['bkash','nagad','rocket','bank'],
  terms_md text,
  hero_title text,
  hero_subtitle text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dropshipping_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.dropshipping_settings TO anon, authenticated;
GRANT ALL ON public.dropshipping_settings TO service_role;
ALTER TABLE public.dropshipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read dropshipping settings" ON public.dropshipping_settings;
CREATE POLICY "Anyone can read dropshipping settings" ON public.dropshipping_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update dropshipping settings" ON public.dropshipping_settings;
CREATE POLICY "Admins can update dropshipping settings" ON public.dropshipping_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can insert dropshipping settings" ON public.dropshipping_settings;
CREATE POLICY "Admins can insert dropshipping settings" ON public.dropshipping_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.dropshipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Announcements
CREATE TABLE IF NOT EXISTS public.dropshipping_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_md text,
  tone text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dropshipping_announcements TO authenticated;
GRANT ALL ON public.dropshipping_announcements TO service_role;
ALTER TABLE public.dropshipping_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read active announcements" ON public.dropshipping_announcements;
CREATE POLICY "Authenticated can read active announcements" ON public.dropshipping_announcements
  FOR SELECT TO authenticated USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "Admins manage announcements" ON public.dropshipping_announcements;
CREATE POLICY "Admins manage announcements" ON public.dropshipping_announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_ds_announcements_updated ON public.dropshipping_announcements;
CREATE TRIGGER trg_ds_announcements_updated BEFORE UPDATE ON public.dropshipping_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New optional columns
ALTER TABLE public.dropshippers
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pixel_id text,
  ADD COLUMN IF NOT EXISTS ga_id text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS dropshipping_enabled boolean NOT NULL DEFAULT true;

-- Payout request RPC (dropshipper-facing, enforces balance + settings)
CREATE OR REPLACE FUNCTION public.request_dropshipper_payout(_amount numeric, _method text, _account text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ds public.dropshippers%ROWTYPE;
  s public.dropshipping_settings%ROWTYPE;
  approved_total numeric;
  paid_total numeric;
  requested_total numeric;
  available numeric;
  payout_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO ds FROM public.dropshippers WHERE user_id = auth.uid() AND status = 'approved' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No approved dropshipper profile'; END IF;
  SELECT * INTO s FROM public.dropshipping_settings WHERE id = 1;
  IF NOT COALESCE(s.is_enabled, true) THEN RAISE EXCEPTION 'Dropshipping program is paused'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter a valid amount'; END IF;
  IF _amount < COALESCE(s.min_payout, 500) THEN
    RAISE EXCEPTION 'Minimum payout is ৳%', COALESCE(s.min_payout, 500);
  END IF;
  IF s.allowed_payout_methods IS NOT NULL AND array_length(s.allowed_payout_methods, 1) > 0
     AND NOT (_method = ANY (s.allowed_payout_methods)) THEN
    RAISE EXCEPTION 'Payment method % is not allowed', _method;
  END IF;
  IF _account IS NULL OR length(trim(_account)) < 4 THEN RAISE EXCEPTION 'Enter a valid account/number'; END IF;

  SELECT COALESCE(SUM(profit), 0) INTO approved_total FROM public.dropshipper_earnings
    WHERE dropshipper_id = ds.id AND status IN ('approved','paid');
  SELECT COALESCE(SUM(amount), 0) INTO paid_total FROM public.dropshipper_payouts
    WHERE dropshipper_id = ds.id AND status = 'paid';
  SELECT COALESCE(SUM(amount), 0) INTO requested_total FROM public.dropshipper_payouts
    WHERE dropshipper_id = ds.id AND status IN ('requested','processing');
  available := approved_total - paid_total - requested_total;
  IF _amount > available THEN
    RAISE EXCEPTION 'Requested amount exceeds available balance (৳%)', available;
  END IF;

  INSERT INTO public.dropshipper_payouts (dropshipper_id, amount, method, account, status)
    VALUES (ds.id, _amount, _method, _account, 'requested')
    RETURNING id INTO payout_id;
  RETURN payout_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_dropshipper_payout(numeric, text, text) TO authenticated;

-- Admin: adjust an earning row
CREATE OR REPLACE FUNCTION public.admin_adjust_dropshipper_earning(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _status NOT IN ('pending','approved','rejected','paid') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.dropshipper_earnings SET status = _status WHERE id = _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_dropshipper_earning(uuid, text) TO authenticated;

-- Admin: mark payout paid with reference
CREATE OR REPLACE FUNCTION public.mark_dropshipper_payout_paid(_id uuid, _txn_reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.dropshipper_payouts
    SET status = 'paid', txn_reference = _txn_reference, paid_at = now()
    WHERE id = _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.mark_dropshipper_payout_paid(uuid, text) TO authenticated;