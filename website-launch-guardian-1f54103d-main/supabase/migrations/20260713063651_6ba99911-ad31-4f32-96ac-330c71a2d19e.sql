
-- ============================================================
-- Dropshippers table
-- ============================================================
CREATE TABLE public.dropshippers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  store_name text NOT NULL,
  store_slug text NOT NULL UNIQUE,
  bio text,
  phone text NOT NULL,
  whatsapp text,
  payout_method text NOT NULL DEFAULT 'bkash',
  payout_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  logo_url text,
  banner_url text,
  total_orders integer NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.dropshippers TO authenticated;
GRANT SELECT ON public.dropshippers TO anon;
GRANT ALL ON public.dropshippers TO service_role;

ALTER TABLE public.dropshippers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view approved dropshippers"
  ON public.dropshippers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "owner can view own dropshipper"
  ON public.dropshippers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin can view all dropshippers"
  ON public.dropshippers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user can apply as dropshipper"
  ON public.dropshippers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "owner can update own dropshipper (non-status)"
  ON public.dropshippers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin can update any dropshipper"
  ON public.dropshippers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin can delete dropshippers"
  ON public.dropshippers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prevent dropshippers from escalating their own status/totals
CREATE OR REPLACE FUNCTION public.prevent_dropshipper_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only admins can change dropshipper status';
  END IF;
  IF NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
    RAISE EXCEPTION 'Only admins can change total_earned';
  END IF;
  IF NEW.total_paid IS DISTINCT FROM OLD.total_paid THEN
    RAISE EXCEPTION 'Only admins can change total_paid';
  END IF;
  IF NEW.total_orders IS DISTINCT FROM OLD.total_orders THEN
    RAISE EXCEPTION 'Only admins can change total_orders';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change dropshipper owner';
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'Cannot change dropshipper code';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_dropshipper_escalation
  BEFORE UPDATE ON public.dropshippers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dropshipper_escalation();

CREATE TRIGGER trg_dropshippers_updated_at
  BEFORE UPDATE ON public.dropshippers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grant dropshipper role on approval
CREATE OR REPLACE FUNCTION public.grant_dropshipper_role_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'dropshipper'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_dropshipper_role
  AFTER UPDATE OF status ON public.dropshippers
  FOR EACH ROW EXECUTE FUNCTION public.grant_dropshipper_role_on_approve();

-- ============================================================
-- Dropshipper products (imported catalog)
-- ============================================================
CREATE TABLE public.dropshipper_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dropshipper_id uuid NOT NULL REFERENCES public.dropshippers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  retail_price numeric NOT NULL CHECK (retail_price >= 0),
  custom_title text,
  custom_description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dropshipper_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_products TO authenticated;
GRANT SELECT ON public.dropshipper_products TO anon;
GRANT ALL ON public.dropshipper_products TO service_role;

ALTER TABLE public.dropshipper_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view active imported products of approved stores"
  ON public.dropshipper_products FOR SELECT
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.dropshippers d
      WHERE d.id = dropshipper_id AND d.status = 'approved'
    )
  );

CREATE POLICY "owner can manage own imported products"
  ON public.dropshipper_products FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid())
  );

CREATE POLICY "admin can manage all imported products"
  ON public.dropshipper_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dropshipper_products_updated_at
  BEFORE UPDATE ON public.dropshipper_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Dropshipper earnings (profit ledger)
-- ============================================================
CREATE TABLE public.dropshipper_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dropshipper_id uuid NOT NULL REFERENCES public.dropshippers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text,
  base_price numeric NOT NULL DEFAULT 0,
  retail_price numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  profit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dropshipper_earnings TO authenticated;
GRANT ALL ON public.dropshipper_earnings TO service_role;

ALTER TABLE public.dropshipper_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can view own earnings"
  ON public.dropshipper_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid())
  );

CREATE POLICY "admin can view all earnings"
  ON public.dropshipper_earnings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin can update earnings"
  ON public.dropshipper_earnings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dropshipper_earnings_updated_at
  BEFORE UPDATE ON public.dropshipper_earnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ds_earnings_dropshipper ON public.dropshipper_earnings(dropshipper_id);
CREATE INDEX idx_ds_earnings_order ON public.dropshipper_earnings(order_id);

-- Keep dropshipper totals in sync with earnings
CREATE OR REPLACE FUNCTION public.sync_dropshipper_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
    UPDATE public.dropshippers SET total_earned = total_earned + NEW.profit WHERE id = NEW.dropshipper_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved') THEN
    UPDATE public.dropshippers SET total_earned = total_earned - OLD.profit WHERE id = NEW.dropshipper_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_dropshipper_totals
  AFTER UPDATE ON public.dropshipper_earnings
  FOR EACH ROW EXECUTE FUNCTION public.sync_dropshipper_totals();

-- ============================================================
-- Dropshipper payouts
-- ============================================================
CREATE TABLE public.dropshipper_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dropshipper_id uuid NOT NULL REFERENCES public.dropshippers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  account text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  admin_note text,
  txn_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT, INSERT ON public.dropshipper_payouts TO authenticated;
GRANT ALL ON public.dropshipper_payouts TO service_role;

ALTER TABLE public.dropshipper_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can view own payouts"
  ON public.dropshipper_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid())
  );

CREATE POLICY "owner can request payout"
  ON public.dropshipper_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid() AND d.status = 'approved')
    AND status = 'requested'
  );

CREATE POLICY "admin can view payouts"
  ON public.dropshipper_payouts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin can update payouts"
  ON public.dropshipper_payouts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dropshipper_payouts_updated_at
  BEFORE UPDATE ON public.dropshipper_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync total_paid
CREATE OR REPLACE FUNCTION public.sync_dropshipper_payouts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status <> 'paid') THEN
    UPDATE public.dropshippers SET total_paid = total_paid + NEW.amount WHERE id = NEW.dropshipper_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid') THEN
    UPDATE public.dropshippers SET total_paid = total_paid - OLD.amount WHERE id = NEW.dropshipper_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_dropshipper_payouts
  AFTER UPDATE ON public.dropshipper_payouts
  FOR EACH ROW EXECUTE FUNCTION public.sync_dropshipper_payouts();

-- ============================================================
-- Dropshipper clicks (analytics)
-- ============================================================
CREATE TABLE public.dropshipper_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dropshipper_id uuid NOT NULL REFERENCES public.dropshippers(id) ON DELETE CASCADE,
  landing_path text,
  referer text,
  user_agent text,
  product_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dropshipper_clicks TO authenticated;
GRANT ALL ON public.dropshipper_clicks TO service_role;

ALTER TABLE public.dropshipper_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can view own clicks"
  ON public.dropshipper_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid())
  );

CREATE POLICY "admin can view clicks"
  ON public.dropshipper_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ds_clicks_dropshipper ON public.dropshipper_clicks(dropshipper_id);

-- Public RPC to record a click
CREATE OR REPLACE FUNCTION public.track_dropshipper_click(
  _code text,
  _path text DEFAULT NULL,
  _ref text DEFAULT NULL,
  _ua text DEFAULT NULL,
  _product_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ds_id uuid;
BEGIN
  SELECT id INTO ds_id FROM public.dropshippers WHERE code = _code AND status = 'approved' LIMIT 1;
  IF ds_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.dropshipper_clicks (dropshipper_id, landing_path, referer, user_agent, product_id)
    VALUES (ds_id, _path, _ref, _ua, _product_id);
  RETURN ds_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_dropshipper_click(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_dropshipper_click(text, text, text, text, text) TO anon, authenticated;

-- ============================================================
-- Order attribution columns
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dropshipper_id uuid REFERENCES public.dropshippers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropshipper_code text;

CREATE INDEX IF NOT EXISTS idx_orders_dropshipper ON public.orders(dropshipper_id);

-- Attribution RPC: called from checkout after order created
CREATE OR REPLACE FUNCTION public.attribute_order_to_dropshipper(
  _order_id uuid,
  _code text,
  _lines jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ds public.dropshippers%ROWTYPE;
  o public.orders%ROWTYPE;
  line jsonb;
  base numeric;
  retail numeric;
  q integer;
  p numeric;
BEGIN
  SELECT * INTO ds FROM public.dropshippers WHERE code = _code AND status = 'approved' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.orders SET dropshipper_id = ds.id, dropshipper_code = _code WHERE id = _order_id;

  IF jsonb_typeof(_lines) = 'array' THEN
    FOR line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
      base := COALESCE((line->>'base_price')::numeric, 0);
      retail := COALESCE((line->>'retail_price')::numeric, 0);
      q := COALESCE((line->>'qty')::integer, 1);
      p := GREATEST(retail - base, 0) * q;
      INSERT INTO public.dropshipper_earnings (dropshipper_id, order_id, product_id, base_price, retail_price, qty, profit, status)
        VALUES (ds.id, _order_id, line->>'product_id', base, retail, q, p, 'pending');
    END LOOP;
  END IF;

  UPDATE public.dropshippers SET total_orders = total_orders + 1 WHERE id = ds.id;
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_order_to_dropshipper(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribute_order_to_dropshipper(uuid, text, jsonb) TO authenticated, anon;

-- Auto approve/reject earnings when order status changes (mirrors affiliate logic)
CREATE OR REPLACE FUNCTION public.dropshipper_earnings_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(NEW.status) = 'delivered' THEN
      UPDATE public.dropshipper_earnings SET status = 'approved'
        WHERE order_id = NEW.id AND status = 'pending';
    ELSIF lower(NEW.status) IN ('cancelled','canceled','refunded','returned') THEN
      UPDATE public.dropshipper_earnings SET status = 'rejected'
        WHERE order_id = NEW.id AND status IN ('pending','approved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dropshipper_earnings_on_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.dropshipper_earnings_on_order_status();
