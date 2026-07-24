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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;
GRANT SELECT ON public.dropshippers TO anon;
GRANT ALL ON public.dropshippers TO service_role;
ALTER TABLE public.dropshippers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can view approved dropshippers" ON public.dropshippers FOR SELECT USING (status = 'approved');
CREATE POLICY "owner can view own dropshipper" ON public.dropshippers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin can view all dropshippers" ON public.dropshippers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user can apply as dropshipper" ON public.dropshippers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "owner can update own dropshipper" ON public.dropshippers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin can update any dropshipper" ON public.dropshippers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin can delete dropshippers" ON public.dropshippers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_dropshippers_updated_at BEFORE UPDATE ON public.dropshippers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
CREATE POLICY "public view active imported" ON public.dropshipper_products FOR SELECT USING (
  is_active AND EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.status = 'approved'));
CREATE POLICY "owner manages own imported" ON public.dropshipper_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid()));
CREATE POLICY "admin manages all imported" ON public.dropshipper_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ds_products_updated_at BEFORE UPDATE ON public.dropshipper_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_earnings TO authenticated;
GRANT ALL ON public.dropshipper_earnings TO service_role;
ALTER TABLE public.dropshipper_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner view own earnings" ON public.dropshipper_earnings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid()));
CREATE POLICY "admin view all earnings" ON public.dropshipper_earnings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update earnings" ON public.dropshipper_earnings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ds_earnings_updated_at BEFORE UPDATE ON public.dropshipper_earnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_ds_earnings_dropshipper ON public.dropshipper_earnings(dropshipper_id);
CREATE INDEX idx_ds_earnings_order ON public.dropshipper_earnings(order_id);

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_payouts TO authenticated;
GRANT ALL ON public.dropshipper_payouts TO service_role;
ALTER TABLE public.dropshipper_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner view own payouts" ON public.dropshipper_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid()));
CREATE POLICY "owner request payout" ON public.dropshipper_payouts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid() AND d.status = 'approved') AND status = 'requested');
CREATE POLICY "admin view payouts" ON public.dropshipper_payouts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update payouts" ON public.dropshipper_payouts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ds_payouts_updated_at BEFORE UPDATE ON public.dropshipper_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dropshipper_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dropshipper_id uuid NOT NULL REFERENCES public.dropshippers(id) ON DELETE CASCADE,
  landing_path text,
  referer text,
  user_agent text,
  product_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dropshipper_clicks TO authenticated, anon;
GRANT ALL ON public.dropshipper_clicks TO service_role;
ALTER TABLE public.dropshipper_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner view own clicks" ON public.dropshipper_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dropshippers d WHERE d.id = dropshipper_id AND d.user_id = auth.uid()));
CREATE POLICY "admin view clicks" ON public.dropshipper_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ds_clicks_dropshipper ON public.dropshipper_clicks(dropshipper_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dropshipper_id uuid REFERENCES public.dropshippers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropshipper_code text;
CREATE INDEX IF NOT EXISTS idx_orders_dropshipper ON public.orders(dropshipper_id);

-- dropshipper_price on products (referenced by vendor.products page)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropshipper_price numeric;

-- addresses: code + phone columns referenced in some views (from later migration)
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS code text, ADD COLUMN IF NOT EXISTS store_name text, ADD COLUMN IF NOT EXISTS store_slug text;

-- admin_get_user_email RPC used in admin order details
CREATE OR REPLACE FUNCTION public.admin_get_user_email(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE em text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN NULL; END IF;
  SELECT email INTO em FROM auth.users WHERE id = _user_id;
  RETURN em;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;
