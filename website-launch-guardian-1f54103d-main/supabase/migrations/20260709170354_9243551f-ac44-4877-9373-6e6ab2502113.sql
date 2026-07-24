
-- Settings (single row)
CREATE TABLE public.affiliate_settings (
  id INT PRIMARY KEY DEFAULT 1,
  commission_pct NUMERIC(6,2) NOT NULL DEFAULT 5,
  cookie_days INT NOT NULL DEFAULT 30,
  min_payout NUMERIC(12,2) NOT NULL DEFAULT 500,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  terms TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.affiliate_settings (id) VALUES (1);
GRANT SELECT ON public.affiliate_settings TO anon, authenticated;
GRANT ALL ON public.affiliate_settings TO service_role;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.affiliate_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.affiliate_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Affiliates
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  commission_pct NUMERIC(6,2),
  payout_method TEXT,
  payout_details TEXT,
  total_clicks INT NOT NULL DEFAULT 0,
  total_signups INT NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff self read" ON public.affiliates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "aff self insert" ON public.affiliates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "aff self update basic" ON public.affiliates FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "aff admin all" ON public.affiliates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Public lookup by code (for click tracking without exposing user data)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_code(_code TEXT)
RETURNS TABLE(id UUID, code TEXT, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, status FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
$$;

-- Clicks
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  landing_path TEXT,
  referer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.affiliate_clicks(affiliate_id, created_at DESC);
GRANT SELECT, INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "click insert public" ON public.affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "click read own/admin" ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Referrals (which user signed up via which affiliate)
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref self insert" ON public.affiliate_referrals FOR INSERT TO authenticated
  WITH CHECK (referred_user_id = auth.uid());
CREATE POLICY "ref admin/aff read" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Commissions
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_total NUMERIC(12,2) NOT NULL,
  commission_pct NUMERIC(6,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.affiliate_commissions(affiliate_id, created_at DESC);
GRANT SELECT, INSERT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com read own/admin" ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "com admin write" ON public.affiliate_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Payouts
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected')),
  txn_ref TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout self insert" ON public.affiliate_payouts FOR INSERT TO authenticated
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid() AND status = 'approved'));
CREATE POLICY "payout read own/admin" ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "payout admin write" ON public.affiliate_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Attach affiliate_id to orders (nullable)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

-- updated_at trigger
CREATE TRIGGER trg_aff_updated BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_aff_com_updated BEFORE UPDATE ON public.affiliate_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_aff_payout_updated BEFORE UPDATE ON public.affiliate_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Track click via RPC (returns void; increments counter)
CREATE OR REPLACE FUNCTION public.track_affiliate_click(_code TEXT, _path TEXT DEFAULT NULL, _ref TEXT DEFAULT NULL, _ua TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE aff_id UUID;
BEGIN
  SELECT id INTO aff_id FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
  IF aff_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.affiliate_clicks (affiliate_id, landing_path, referer, user_agent)
    VALUES (aff_id, _path, _ref, _ua);
  UPDATE public.affiliates SET total_clicks = total_clicks + 1 WHERE id = aff_id;
  RETURN aff_id;
END; $$;

-- Attribute order to affiliate + create commission
CREATE OR REPLACE FUNCTION public.attribute_order_to_affiliate(_order_id UUID, _code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE aff public.affiliates%ROWTYPE; s public.affiliate_settings%ROWTYPE; o public.orders%ROWTYPE; pct NUMERIC; amt NUMERIC;
BEGIN
  SELECT * INTO s FROM public.affiliate_settings WHERE id = 1;
  IF NOT s.is_enabled THEN RETURN; END IF;
  SELECT * INTO aff FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN; END IF;
  pct := COALESCE(aff.commission_pct, s.commission_pct);
  amt := ROUND((o.total * pct) / 100, 2);
  UPDATE public.orders SET affiliate_id = aff.id, affiliate_code = _code WHERE id = _order_id;
  INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_total, commission_pct, amount)
    VALUES (aff.id, _order_id, o.total, pct, amt);
  UPDATE public.affiliates SET total_orders = total_orders + 1 WHERE id = aff.id;
END; $$;

-- When commission approved, add to affiliate.total_earned
CREATE OR REPLACE FUNCTION public.sync_commission_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
    UPDATE public.affiliates SET total_earned = total_earned + NEW.amount WHERE id = NEW.affiliate_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved') THEN
    UPDATE public.affiliates SET total_earned = total_earned - OLD.amount WHERE id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_commission_totals AFTER UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_commission_totals();

-- Payout paid -> add to total_paid
CREATE OR REPLACE FUNCTION public.sync_payout_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status <> 'paid') THEN
    UPDATE public.affiliates SET total_paid = total_paid + NEW.amount WHERE id = NEW.affiliate_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid') THEN
    UPDATE public.affiliates SET total_paid = total_paid - OLD.amount WHERE id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_payout_totals AFTER UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.sync_payout_totals();
