-- ============================================================
-- BAZAR BD - Complete Database Setup Script (Combined)
-- Generated from all migration files
-- Total files: 87
-- ============================================================

-- File: 20260628135351_a6964049-a723-426f-bac8-6728ddf451a6.sql

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'emransha952@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10,2),
  image TEXT NOT NULL DEFAULT '',
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_slug TEXT,
  subcategory_slug TEXT,
  brand TEXT,
  stock INT NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  sold_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_products_category ON public.products(category_slug);
CREATE INDEX idx_products_active ON public.products(is_active);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('BZ-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT NOT NULL,
  district TEXT,
  thana TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_type TEXT,
  txn_id TEXT,
  sender_phone TEXT,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- File: 20260628135422_06b2ce6c-060d-4868-aedc-24f58038168d.sql

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));


-- File: 20260628152135_f0fa9c9b-48f9-4eaa-86a0-55b4986043b6.sql

-- 1. wishlists
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "user insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update reviews" ON public.reviews FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  date_of_birth date,
  gender text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup; extend existing user-roles trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'emransha952@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. addresses
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  district text NOT NULL,
  thana text NOT NULL,
  address text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent', -- percent | fixed
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  expires_at timestamptz,
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. order_status_history
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read history" ON public.order_status_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage history" ON public.order_status_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Link orders to user (optional, nullable for guest checkouts)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
CREATE POLICY "user view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- File: 20260628153107_b5ce85d5-ac0d-4787-be81-e0fa9e000aba.sql

CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement TEXT NOT NULL DEFAULT 'hero_slider',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  gradient_from TEXT NOT NULL DEFAULT 'from-violet-500',
  gradient_to TEXT NOT NULL DEFAULT 'to-fuchsia-600',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners" ON public.banners
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.banners (placement, title, subtitle, image_url, link_url, sort_order) VALUES
  ('hero_slider', 'Mobile Mega Offer', '', '/src/assets/hero-1.jpg', '/category/electronics', 1),
  ('hero_slider', 'Fashion Bonanza', '', '/src/assets/hero-2.jpg', '/category/fashion-women', 2),
  ('hero_slider', 'Home Essentials', '', '/src/assets/hero-3.jpg', '/category/home', 3);

INSERT INTO public.banners (placement, title, subtitle, link_url, gradient_from, gradient_to, sort_order) VALUES
  ('hero_side', 'Audio Fest', 'From à§³499', '/category/electronic-acc', 'from-violet-500', 'to-fuchsia-600', 1),
  ('hero_side', 'Beauty Week', 'Up to 60% OFF', '/category/beauty', 'from-rose-400', 'to-pink-600', 2);


-- File: 20260628154142_3f031330-f820-4f33-b03e-4d772b5958fc.sql

-- Add vendor role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- Vendors table
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  banner_url text,
  description text,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  commission_pct numeric NOT NULL DEFAULT 10,
  total_sales numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Vendor can view own row" ON public.vendors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all vendors" ON public.vendors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User can create own vendor application" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Vendor can update own row" ON public.vendors
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','approved','rejected','suspended'));
CREATE POLICY "Admin can manage vendors" ON public.vendors
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vendor payouts
CREATE TABLE public.vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  period_start date,
  period_end date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payouts TO authenticated;
GRANT ALL ON public.vendor_payouts TO service_role;

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor reads own payouts" ON public.vendor_payouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  );
CREATE POLICY "Admin manages payouts" ON public.vendor_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vendor_payouts_updated_at BEFORE UPDATE ON public.vendor_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add vendor_id to products & orders
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);

-- Helper: current user's vendor id
CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1 $$;

-- Vendor product policies (additive â€” existing admin/public policies stay)
CREATE POLICY "Vendor manages own products" ON public.products
  FOR ALL TO authenticated USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());

-- Vendor order policies
CREATE POLICY "Vendor reads own orders" ON public.orders
  FOR SELECT TO authenticated USING (vendor_id = public.get_my_vendor_id());
CREATE POLICY "Vendor updates own order status" ON public.orders
  FOR UPDATE TO authenticated USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());


-- File: 20260628154203_8f1d0b31-6a56-42c4-8909-77e195021ef1.sql

REVOKE EXECUTE ON FUNCTION public.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated;


-- File: 20260628155514_94921ed4-f9b4-467f-9745-8c9f66b66f3f.sql
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS rejection_reason text;

-- File: 20260628161611_0860b507-7aee-42ba-96f8-f180e5d29671.sql
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS nid_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- File: 20260628163207_3e48d0e0-e5a9-4fcb-a2fe-7aad1f1027e7.sql

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS offer_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS warranty TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS return_days INT DEFAULT 7;


-- File: 20260630173524_ec939bc4-4e24-49d3-9a3a-10ec2f2d4d98.sql
-- Ensure application roles exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'vendor');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'vendor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendor';
  END IF;
END $$;

-- Correct Data API access grants used by the app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

GRANT SELECT ON public.order_status_history TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.vendor_payouts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vendor_payouts TO authenticated;
GRANT ALL ON public.vendor_payouts TO service_role;

GRANT SELECT ON public.vendors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

-- Keep RLS enabled on all app tables
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Helper function privileges: public/anonymous users should not call these directly
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO service_role;

-- Allow a signed-in user to add their own basic user/vendor role only; admin role is never self-granted
DROP POLICY IF EXISTS "Users can add own safe roles" ON public.user_roles;
CREATE POLICY "Users can add own safe roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role IN ('user', 'vendor'));

-- Public order placement should have a real customer phone and at least one item
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  customer_name IS NOT NULL
  AND customer_phone IS NOT NULL
  AND address IS NOT NULL
  AND jsonb_array_length(items) > 0
  AND total >= 0
);

-- Keep updated_at fresh on app tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'addresses','banners','categories','coupons','orders','products','profiles','reviews','vendor_payouts','vendors'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', tbl, tbl);
  END LOOP;
END $$;

-- Admin account safety: ensure the known owner remains admin if the account exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'emransha952@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- File: 20260630173725_aefe2688-c35e-4cb6-a86b-fc1dc8c90e7e.sql
-- Move internal RLS helper functions out of the public API schema
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app_private.get_my_vendor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_my_vendor_id() TO authenticated, service_role;

-- Update all RLS policies to use the private helper functions
DROP POLICY IF EXISTS "Admins manage banners" ON public.banners;
CREATE POLICY "Admins manage banners" ON public.banners
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
CREATE POLICY "Public can view active banners" ON public.banners
FOR SELECT
TO anon, authenticated
USING (active = true OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage coupons" ON public.coupons;
CREATE POLICY "admin manage coupons" ON public.coupons
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
CREATE POLICY "public read active coupons" ON public.coupons
FOR SELECT
TO anon, authenticated
USING (is_active = true OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage history" ON public.order_status_history;
CREATE POLICY "admin manage history" ON public.order_status_history
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
CREATE POLICY "Admin view all orders" ON public.orders
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
CREATE POLICY "Admin update orders" ON public.orders
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
CREATE POLICY "Admin delete orders" ON public.orders
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Vendor reads own orders" ON public.orders;
CREATE POLICY "Vendor reads own orders" ON public.orders
FOR SELECT
TO authenticated
USING (vendor_id = app_private.get_my_vendor_id());

DROP POLICY IF EXISTS "Vendor updates own order status" ON public.orders;
CREATE POLICY "Vendor updates own order status" ON public.orders
FOR UPDATE
TO authenticated
USING (vendor_id = app_private.get_my_vendor_id())
WITH CHECK (vendor_id = app_private.get_my_vendor_id());

DROP POLICY IF EXISTS "Admin manage products" ON public.products;
CREATE POLICY "Admin manage products" ON public.products
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Vendor manages own products" ON public.products;
CREATE POLICY "Vendor manages own products" ON public.products
FOR ALL
TO authenticated
USING (vendor_id = app_private.get_my_vendor_id())
WITH CHECK (vendor_id = app_private.get_my_vendor_id());

DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin update reviews" ON public.reviews;
CREATE POLICY "admin update reviews" ON public.reviews
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "public read reviews" ON public.reviews;
CREATE POLICY "public read reviews" ON public.reviews
FOR SELECT
TO anon, authenticated
USING (is_approved = true OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user delete own review" ON public.reviews;
CREATE POLICY "user delete own review" ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin manages payouts" ON public.vendor_payouts;
CREATE POLICY "Admin manages payouts" ON public.vendor_payouts
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can manage vendors" ON public.vendors;
CREATE POLICY "Admin can manage vendors" ON public.vendors
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can view all vendors" ON public.vendors;
CREATE POLICY "Admin can view all vendors" ON public.vendors
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

-- Keep public compatibility functions for old code, but remove direct execution from app users
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_vendor_id() FROM PUBLIC, anon, authenticated;

-- File: 20260630173824_5c465fae-d9dd-404e-bc85-3a8218dd2ff5.sql
DROP TRIGGER IF EXISTS addresses_updated ON public.addresses;
DROP TRIGGER IF EXISTS banners_updated_at ON public.banners;
DROP TRIGGER IF EXISTS categories_updated ON public.categories;
DROP TRIGGER IF EXISTS coupons_updated ON public.coupons;
DROP TRIGGER IF EXISTS orders_updated ON public.orders;
DROP TRIGGER IF EXISTS products_updated ON public.products;
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
DROP TRIGGER IF EXISTS reviews_updated ON public.reviews;
DROP TRIGGER IF EXISTS vendor_payouts_updated_at ON public.vendor_payouts;
DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;

-- File: 20260630183425_17eeb196-64cc-4493-8e88-f43af31cf420.sql

-- 1. Coupons: remove anon read
DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
CREATE POLICY "authenticated read active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true OR app_private.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.coupons FROM anon;

-- 2. Order status history: restrict to order owner or admin
DROP POLICY IF EXISTS "public read history" ON public.order_status_history;
CREATE POLICY "owner read history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.user_id = auth.uid()
    )
  );
REVOKE SELECT ON public.order_status_history FROM anon;

-- 3. Vendors: prevent self status escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_vendor_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change vendor status';
  END IF;
  IF NEW.commission_pct IS DISTINCT FROM OLD.commission_pct
     AND NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change commission';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_prevent_status_escalation ON public.vendors;
CREATE TRIGGER vendors_prevent_status_escalation
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_status_escalation();


-- File: 20260630183444_17f0a301-6e35-4bd6-b468-f75b8eb97970.sql
REVOKE EXECUTE ON FUNCTION public.prevent_vendor_status_escalation() FROM PUBLIC, anon, authenticated;

-- File: 20260630185504_bc6c4da0-8385-46c6-84c7-e1a227aa3ef0.sql

-- 1. coupons: allow anon to read active coupons (guest checkout)
CREATE POLICY "anon read active coupons" ON public.coupons
  FOR SELECT TO anon USING (is_active = true);
GRANT SELECT ON public.coupons TO anon;

-- 2. order_status_history: vendor can read history for their orders
CREATE POLICY "vendor read history" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o
            WHERE o.id = order_status_history.order_id
              AND o.vendor_id IS NOT NULL
              AND o.vendor_id = public.get_my_vendor_id())
  );

-- 3. storage: allow vendors to manage images under their own uid folder in 'products' bucket
CREATE POLICY "Vendor upload own product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Vendor update own product images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Vendor delete own product images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'products'
    AND app_private.has_role(auth.uid(), 'vendor'::public.app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. vendors: tighten WITH CHECK so vendors cannot self-set status.
-- The prevent_vendor_status_escalation trigger already blocks status/commission
-- changes by non-admins, but we also harden the policy to only allow status='pending'
-- in the new row image submitted by a vendor (admins use the admin policy).
DROP POLICY IF EXISTS "Vendor can update own row" ON public.vendors;
CREATE POLICY "Vendor can update own row" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'pending'::text);

-- 5. vendors: hide sensitive fields from anon public reads.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;

-- Public-safe view (runs as view owner; bypasses underlying RLS by default).
CREATE OR REPLACE VIEW public.vendors_public AS
  SELECT id, store_name, slug, logo_url, banner_url, description,
         total_sales, total_orders, created_at
  FROM public.vendors
  WHERE status = 'approved';

GRANT SELECT ON public.vendors_public TO anon, authenticated;


-- File: 20260630185538_2690f6fe-3aa0-4b2c-9bc5-fb961cd04ef7.sql

-- Remove the view that triggered the security_definer_view linter warning
DROP VIEW IF EXISTS public.vendors_public;

-- Re-add the public read policy for approved vendors
CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT TO anon USING (status = 'approved'::text);

-- Column-level GRANT: anon may only read non-sensitive columns
GRANT SELECT (
  id, store_name, slug, logo_url, banner_url, description,
  status, total_sales, total_orders, created_at, updated_at
) ON public.vendors TO anon;


-- File: 20260630190700_6b87bac1-cbfa-4c28-890f-a19b21ce4087.sql

-- 1. coupons_public_exposure: remove anon read; only authenticated users (and server admin via service_role) can read codes
DROP POLICY IF EXISTS "anon read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;

-- 2. orders_guest_order_enumeration: harden INSERT so callers cannot spoof user_id;
--    guests must insert user_id IS NULL; authenticated users must insert their own user_id.
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Anyone can create order" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    customer_name IS NOT NULL
    AND customer_phone IS NOT NULL
    AND address IS NOT NULL
    AND jsonb_array_length(items) > 0
    AND total >= 0
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    )
  );

-- 3. user_roles_self_insert_vendor: users may only self-assign the base 'user' role.
--    Vendor role is granted by the server after vendor application approval (admin/service_role).
DROP POLICY IF EXISTS "Users can add own safe roles" ON public.user_roles;
CREATE POLICY "Users can add own user role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'user'::app_role);

-- 4. vendors_sensitive_data_exposure: stop exposing nid/dob/phone/address/rejection_reason publicly.
--    Replace public table policy with a safe view of approved vendors.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;
REVOKE SELECT ON public.vendors FROM anon;

CREATE OR REPLACE VIEW public.public_vendors
WITH (security_invoker = true) AS
SELECT id, user_id, store_name, slug, logo_url, banner_url, description,
       status, commission_pct, total_sales, total_orders, created_at, updated_at
FROM public.vendors
WHERE status = 'approved';

GRANT SELECT ON public.public_vendors TO anon, authenticated;

-- Re-allow authenticated SELECT on vendors table (own row + admin policies already enforce row scope)
-- Add a narrow policy so the public_vendors view (security_invoker) can read approved rows for anon via the view.
CREATE POLICY "Anon read approved vendor public fields via view" ON public.vendors
  FOR SELECT TO anon
  USING (status = 'approved');
-- Note: anon lacks table-level SELECT GRANT, so direct table queries still fail.
-- The view runs with invoker rights; grant SELECT on the underlying columns only to support the view.
GRANT SELECT (id, user_id, store_name, slug, logo_url, banner_url, description,
              status, commission_pct, total_sales, total_orders, created_at, updated_at)
  ON public.vendors TO anon;


-- File: 20260630190717_b4570e2d-5b40-4e9f-82ea-1fe967817da2.sql

CREATE OR REPLACE FUNCTION public.grant_vendor_role_on_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'vendor'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_grant_role ON public.vendors;
CREATE TRIGGER vendors_grant_role
AFTER INSERT ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.grant_vendor_role_on_apply();


-- File: 20260630190730_d89bf403-e20d-43eb-8b7d-270803978516.sql

REVOKE ALL ON FUNCTION public.grant_vendor_role_on_apply() FROM PUBLIC, anon, authenticated;


-- File: 20260630191010_78b36a06-ac32-4a14-bfe1-c9704e0336e6.sql

-- 1. coupons_usage_limit_exposed: remove authenticated direct read; expose a validator function instead.
DROP POLICY IF EXISTS "authenticated read active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
BEGIN
  SELECT * INTO c FROM public.coupons
    WHERE code = upper(trim(_code)) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;
  IF _subtotal < c.min_order THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum order à§³%s required', c.min_order));
  END IF;
  IF c.discount_type = 'percent' THEN
    discount := round((_subtotal * c.discount_value) / 100);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    discount := least(discount, c.max_discount);
  END IF;
  discount := least(discount, _subtotal);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- 2. vendors_anon_sensitive_fields: remove anon's direct table access entirely.
DROP POLICY IF EXISTS "Anon read approved vendor public fields via view" ON public.vendors;
REVOKE SELECT ON public.vendors FROM anon;
REVOKE SELECT (id, user_id, store_name, slug, logo_url, banner_url, description,
               status, commission_pct, total_sales, total_orders, created_at, updated_at)
  ON public.vendors FROM anon;

-- Make the public_vendors view run with definer rights so anon can read it
-- without any direct grant on the underlying vendors table.
DROP VIEW IF EXISTS public.public_vendors;
CREATE VIEW public.public_vendors
WITH (security_invoker = false) AS
SELECT id, user_id, store_name, slug, logo_url, banner_url, description,
       status, commission_pct, total_sales, total_orders, created_at, updated_at
FROM public.vendors
WHERE status = 'approved';

GRANT SELECT ON public.public_vendors TO anon, authenticated;


-- File: 20260630191033_068d81ac-aadc-4fb2-9fe4-882bca2775a4.sql

DROP VIEW IF EXISTS public.public_vendors;

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE (
  id uuid, user_id uuid, store_name text, slug text,
  logo_url text, banner_url text, description text,
  status text, commission_pct numeric,
  total_sales numeric, total_orders integer,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug,
         v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct,
         v.total_sales, v.total_orders,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.slug = _slug AND v.status = 'approved'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_vendor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;


-- File: 20260630191704_c0c22521-5ec7-4261-906a-3a96f8aeb894.sql

-- Lock down SECURITY DEFINER function execution; only expose the RPCs that need it.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Re-grant only the intentional RPCs
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Strengthen vendor self-update trigger to block all financial / status fields.
CREATE OR REPLACE FUNCTION public.prevent_vendor_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change vendor status';
    END IF;
    IF NEW.commission_pct IS DISTINCT FROM OLD.commission_pct THEN
      RAISE EXCEPTION 'Only admins can change commission';
    END IF;
    IF NEW.total_sales IS DISTINCT FROM OLD.total_sales THEN
      RAISE EXCEPTION 'Only admins can change total_sales';
    END IF;
    IF NEW.total_orders IS DISTINCT FROM OLD.total_orders THEN
      RAISE EXCEPTION 'Only admins can change total_orders';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Only admins can change rejection_reason';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change vendor owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS prevent_vendor_status_escalation_trg ON public.vendors;
CREATE TRIGGER prevent_vendor_status_escalation_trg
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_status_escalation();


-- File: 20260702144122_c46ae5c1-d89d-495f-b143-f0a94f93e4d1.sql

-- Fix vendor status escalation via RLS: remove the WITH CHECK that lets a vendor
-- reset their status to 'pending'. Trigger already blocks status changes for non-admins.
DROP POLICY IF EXISTS "Vendor can update own row" ON public.vendors;
CREATE POLICY "Vendor can update own row" ON public.vendors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add explicit admin-only SELECT policy on coupons so intent is clear
-- (validation for end users runs through the validate_coupon SECURITY DEFINER RPC).
DROP POLICY IF EXISTS "Admin can view coupons" ON public.coupons;
CREATE POLICY "Admin can view coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));


-- File: 20260703113811_377ec596-69ea-4e99-a809-c1ab9de24d96.sql

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


-- File: 20260703121858_54b0260e-3589-47bd-9a71-172c1ee5c3e8.sql

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


-- File: 20260703125420_e5221866-9a30-466c-8bed-3c83a1368a9d.sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_name text, ADD COLUMN IF NOT EXISTS subcategory_name text;

-- File: 20260703131354_0d57f96d-98ad-4969-8bd0-38194a2db73f.sql
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

-- File: 20260703131605_afdacdf8-e328-48f3-aa26-8d54ac1d586d.sql
DROP POLICY IF EXISTS "Public read active products" ON public.products;

CREATE POLICY "Public can read active products"
ON public.products
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Signed in users can read active products"
ON public.products
FOR SELECT
TO authenticated
USING (is_active = true);

-- File: 20260709144418_7fb7d5d9-e708-48c4-87f3-7d4e0fc6d6b2.sql
-- Allow authenticated users to upload/manage images under their own uid folder in 'products' bucket
-- (needed for vendor application logo/banner uploads before role is granted, and for profile-like uploads)

CREATE POLICY "Authenticated upload own folder products" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated update own folder products" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated delete own folder products" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read products bucket" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'products');

-- File: 20260709170354_9243551f-ac44-4877-9373-6e6ab2502113.sql

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


-- File: 20260709171057_c6c3c6e5-6d16-4a1e-b3e0-66428dcd83d0.sql

CREATE OR REPLACE FUNCTION public.get_review_authors(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

-- Ensure users can delete their own reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='review self delete') THEN
    CREATE POLICY "review self delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;


-- File: 20260709180838_ccab1ad0-c235-4f9b-bea4-d34deb8833ce.sql

ALTER TABLE public.affiliate_clicks ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS product_id text;

CREATE OR REPLACE FUNCTION public.track_affiliate_click(_code text, _path text DEFAULT NULL, _ref text DEFAULT NULL, _ua text DEFAULT NULL, _product_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE aff_id UUID;
BEGIN
  SELECT id INTO aff_id FROM public.affiliates WHERE code = _code AND status = 'approved' LIMIT 1;
  IF aff_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.affiliate_clicks (affiliate_id, landing_path, referer, user_agent, product_id)
    VALUES (aff_id, _path, _ref, _ua, _product_id);
  UPDATE public.affiliates SET total_clicks = total_clicks + 1 WHERE id = aff_id;
  RETURN aff_id;
END; $$;

CREATE OR REPLACE FUNCTION public.attribute_order_to_affiliate(_order_id uuid, _code text, _product_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_total, commission_pct, amount, product_id, status)
    VALUES (aff.id, _order_id, o.total, pct, amt, _product_id, 'pending');
  UPDATE public.affiliates SET total_orders = total_orders + 1 WHERE id = aff.id;
END; $$;

CREATE OR REPLACE FUNCTION public.affiliate_commissions_on_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF lower(NEW.status) = 'delivered' THEN
      UPDATE public.affiliate_commissions SET status = 'approved'
       WHERE order_id = NEW.id AND status = 'pending';
    ELSIF lower(NEW.status) IN ('cancelled','canceled','refunded','returned') THEN
      UPDATE public.affiliate_commissions SET status = 'rejected'
       WHERE order_id = NEW.id AND status IN ('pending','approved');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_affiliate_commissions_on_order_status ON public.orders;
CREATE TRIGGER trg_affiliate_commissions_on_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.affiliate_commissions_on_order_status();


-- File: 20260709182925_99f872b5-d28f-4f0a-8842-8ce80c6a0200.sql

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric, _product_ids text[] DEFAULT NULL, _product_subtotal numeric DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
  base numeric;
  matched boolean;
BEGIN
  SELECT * INTO c FROM public.coupons
    WHERE code = upper(trim(_code)) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;

  -- If coupon is restricted to specific products, compute base on matching items only
  IF c.product_ids IS NOT NULL AND array_length(c.product_ids, 1) > 0 THEN
    matched := (_product_ids IS NOT NULL AND _product_ids && c.product_ids);
    IF NOT matched THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart');
    END IF;
    base := COALESCE(_product_subtotal, 0);
    IF base <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart');
    END IF;
  ELSE
    base := _subtotal;
  END IF;

  IF _subtotal < c.min_order THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum order à§³%s required', c.min_order));
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round((base * c.discount_value) / 100);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    discount := least(discount, c.max_discount);
  END IF;
  discount := least(discount, base);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END;
$function$;


-- File: 20260709183010_b07af626-c0f7-4829-be06-d50eb95de8d9.sql

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric, _items jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
  base numeric;
  matched_ids text[];
BEGIN
  SELECT * INTO c FROM public.coupons
    WHERE code = upper(trim(_code)) AND is_active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;
  IF _subtotal < c.min_order THEN
    RETURN jsonb_build_object('ok', false, 'error', format('Minimum order à§³%s required', c.min_order));
  END IF;

  IF c.product_ids IS NOT NULL AND array_length(c.product_ids, 1) > 0 THEN
    IF _items IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon only works on specific products');
    END IF;
    SELECT COALESCE(SUM((i->>'price')::numeric * (i->>'qty')::numeric), 0)
      INTO base
      FROM jsonb_array_elements(_items) AS i
     WHERE (i->>'id') = ANY(c.product_ids);
    IF base <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart');
    END IF;
  ELSE
    base := _subtotal;
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round((base * c.discount_value) / 100);
  ELSE
    discount := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    discount := least(discount, c.max_discount);
  END IF;
  discount := least(discount, base);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END;
$function$;

-- Drop the transitional 4-arg variant so there is one canonical signature
DROP FUNCTION IF EXISTS public.validate_coupon(text, numeric, text[], numeric);


-- File: 20260709184336_7f8edf02-76a7-4b3a-a0ef-f7cc2be341f6.sql

-- Courier tracking on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text;

-- Public lookup for guest orders by order_number + phone
CREATE OR REPLACE FUNCTION public.lookup_order(_order_number text, _phone text)
RETURNS SETOF public.orders
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.orders
   WHERE order_number = _order_number
     AND regexp_replace(customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g')
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_order(text, text) TO anon, authenticated;


-- File: 20260709192535_dabdab9a-a7a7-47be-a518-e34a3180a85f.sql
DROP POLICY IF EXISTS "click insert public" ON public.affiliate_clicks;
REVOKE INSERT ON public.affiliate_clicks FROM anon, authenticated;

-- File: 20260709193323_7fcac8d1-bd67-4fc1-8414-8cd0ed6a3305.sql

CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_num text;
  uid uuid := auth.uid();
BEGIN
  IF _payload IS NULL THEN
    RAISE EXCEPTION 'payload required';
  END IF;
  IF COALESCE(_payload->>'customer_name','') = '' OR
     COALESCE(_payload->>'customer_phone','') = '' OR
     COALESCE(_payload->>'address','') = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF jsonb_typeof(_payload->'items') <> 'array' OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;

  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address, district, thana,
    items, subtotal, delivery_fee, total, payment_method, payment_type,
    txn_id, sender_phone, paid_amount, notes, vendor_id, user_id
  ) VALUES (
    _payload->>'customer_name',
    _payload->>'customer_phone',
    NULLIF(_payload->>'customer_email',''),
    _payload->>'address',
    NULLIF(_payload->>'district',''),
    NULLIF(_payload->>'thana',''),
    COALESCE(_payload->'items','[]'::jsonb),
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'delivery_fee')::numeric, 0),
    COALESCE((_payload->>'total')::numeric, 0),
    COALESCE(_payload->>'payment_method','cod'),
    NULLIF(_payload->>'payment_type',''),
    NULLIF(_payload->>'txn_id',''),
    NULLIF(_payload->>'sender_phone',''),
    COALESCE((_payload->>'paid_amount')::numeric, 0),
    NULLIF(_payload->>'notes',''),
    NULLIF(_payload->>'vendor_id','')::uuid,
    uid
  )
  RETURNING orders.id, orders.order_number INTO new_id, new_num;

  id := new_id;
  order_number := new_num;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;


-- File: 20260709193954_61046502-8f83-4dd6-a8e6-8d5229829c63.sql
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- File: 20260710115450_3009bbd8-cc54-4796-8880-cc54b2437833.sql

-- 1. Explicit admin-only INSERT on order_status_history
CREATE POLICY "Admins insert history" ON public.order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

-- 2. Drop overly permissive authenticated-own-folder storage policies
DROP POLICY IF EXISTS "Authenticated upload own folder products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own folder products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own folder products" ON storage.objects;

-- 3. Drop duplicate public-read policy
DROP POLICY IF EXISTS "Public read products bucket" ON storage.objects;


-- File: 20260710121542_f8084e68-3a6e-4cd3-84e3-aaf810eb8b14.sql

-- Wipe existing categories (and any product references to them)
UPDATE public.products SET category_slug = NULL, category_name = NULL, subcategory_slug = NULL, subcategory_name = NULL;
DELETE FROM public.categories;

-- Seed Daraz BD taxonomy
WITH parents(name, slug, icon, sort_order) AS (
  VALUES
  ('à¦®à¦¹à¦¿à¦²à¦¾à¦¦à§‡à¦° à¦«à§à¦¯à¦¾à¦¶à¦¨','womens-fashion','ðŸ‘—',1),
  ('à¦ªà§à¦°à§à¦·à¦¦à§‡à¦° à¦«à§à¦¯à¦¾à¦¶à¦¨','mens-fashion','ðŸ‘”',2),
  ('à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦«à§à¦¯à¦¾à¦¶à¦¨','kids-fashion','ðŸ§’',3),
  ('à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦“ à¦Ÿà§à¦¯à¦¾à¦¬à¦²à§‡à¦Ÿ','mobiles-tablets','ðŸ“±',4),
  ('à¦®à§‹à¦¬à¦¾à¦‡à¦² à¦†à¦¨à§à¦·à¦¾à¦™à§à¦—à¦¿à¦•','mobile-accessories','ðŸŽ§',5),
  ('à¦‡à¦²à§‡à¦•à¦Ÿà§à¦°à¦¨à¦¿à¦• à¦¡à¦¿à¦­à¦¾à¦‡à¦¸','electronic-devices','ðŸ’»',6),
  ('à¦‡à¦²à§‡à¦•à¦Ÿà§à¦°à¦¨à¦¿à¦• à¦à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','electronic-accessories','ðŸ”Œ',7),
  ('à¦Ÿà¦¿à¦­à¦¿ à¦“ à¦¹à§‹à¦® à¦…à§à¦¯à¦¾à¦ªà§à¦²à¦¾à¦¯à¦¼à§‡à¦¨à§à¦¸','tv-home-appliances','ðŸ“º',8),
  ('à¦¸à§à¦¬à¦¾à¦¸à§à¦¥à§à¦¯ à¦“ à¦¸à§Œà¦¨à§à¦¦à¦°à§à¦¯','health-beauty','ðŸ’„',9),
  ('à¦¶à¦¿à¦¶à§ à¦“ à¦–à§‡à¦²à¦¨à¦¾','babies-toys','ðŸ§¸',10),
  ('à¦®à§à¦¦à¦¿ à¦“ à¦ªà§‹à¦·à¦¾ à¦ªà§à¦°à¦¾à¦£à§€','groceries-pets','ðŸ›’',11),
  ('à¦¹à§‹à¦® à¦“ à¦²à¦¾à¦‡à¦«à¦¸à§à¦Ÿà¦¾à¦‡à¦²','home-lifestyle','ðŸ ',12),
  ('à¦–à§‡à¦²à¦¾à¦§à§à¦²à¦¾ à¦“ à¦†à¦‰à¦Ÿà¦¡à§‹à¦°','sports-outdoor','âš½',13),
  ('à¦…à¦Ÿà§‹à¦®à§‹à¦Ÿà¦¿à¦­ à¦“ à¦®à§‹à¦Ÿà¦°à¦¬à¦¾à¦‡à¦•','automotive-motorbike','ðŸï¸',14),
  ('à¦“à¦¯à¦¼à¦¾à¦š, à¦¬à§à¦¯à¦¾à¦— à¦“ à¦—à¦¹à¦¨à¦¾','watches-bags-jewellery','âŒš',15)
)
INSERT INTO public.categories (name, slug, icon, sort_order, parent_id)
SELECT name, slug, icon, sort_order, NULL FROM parents;

-- Subcategories: (parent_slug, name, slug)
WITH subs(parent_slug, name, slug) AS (
  VALUES
  -- Women's Fashion
  ('womens-fashion','à¦®à§à¦¸à¦²à¦¿à¦® à¦“à¦¯à¦¼à§à¦¯à¦¾à¦°','muslim-wear'),
  ('womens-fashion','à¦ªà§‹à¦¶à¦¾à¦•','womens-clothing'),
  ('womens-fashion','à¦œà§à¦¤à¦¾','womens-shoes'),
  ('womens-fashion','à¦¬à§à¦¯à¦¾à¦—','womens-bags'),
  ('womens-fashion','à¦—à¦¹à¦¨à¦¾','womens-jewellery'),
  ('womens-fashion','à¦˜à¦¡à¦¼à¦¿','womens-watches'),
  ('womens-fashion','à¦…à¦¨à§à¦¤à¦°à§à¦¬à¦¾à¦¸ à¦“ à¦˜à§à¦®à§‡à¦° à¦ªà§‹à¦¶à¦¾à¦•','womens-lingerie-sleepwear'),
  ('womens-fashion','à¦…à§à¦¯à¦¾à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','womens-accessories'),

  -- Men's Fashion
  ('mens-fashion','à¦ªà§‹à¦¶à¦¾à¦•','mens-clothing'),
  ('mens-fashion','à¦ªà¦¾à¦žà§à¦œà¦¾à¦¬à¦¿ à¦“ à¦ªà¦¾à¦œà¦¾à¦®à¦¾','mens-panjabi-pajama'),
  ('mens-fashion','à¦œà§à¦¤à¦¾','mens-shoes'),
  ('mens-fashion','à¦˜à¦¡à¦¼à¦¿','mens-watches'),
  ('mens-fashion','à¦¬à§à¦¯à¦¾à¦— à¦“ à¦“à¦¯à¦¼à¦¾à¦²à§‡à¦Ÿ','mens-bags-wallets'),
  ('mens-fashion','à¦…à¦¨à§à¦¤à¦°à§à¦¬à¦¾à¦¸','mens-innerwear'),
  ('mens-fashion','à¦…à§à¦¯à¦¾à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','mens-accessories'),

  -- Kids Fashion
  ('kids-fashion','à¦›à§‡à¦²à§‡ à¦¶à¦¿à¦¶à§à¦° à¦ªà§‹à¦¶à¦¾à¦•','boys-clothing'),
  ('kids-fashion','à¦®à§‡à¦¯à¦¼à§‡ à¦¶à¦¿à¦¶à§à¦° à¦ªà§‹à¦¶à¦¾à¦•','girls-clothing'),
  ('kids-fashion','à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦œà§à¦¤à¦¾','kids-shoes'),
  ('kids-fashion','à¦¶à¦¿à¦¶à§à¦¦à§‡à¦° à¦…à§à¦¯à¦¾à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','kids-accessories'),

  -- Mobiles & Tablets
  ('mobiles-tablets','à¦¸à§à¦®à¦¾à¦°à§à¦Ÿà¦«à§‹à¦¨','smartphones'),
  ('mobiles-tablets','à¦«à¦¿à¦šà¦¾à¦° à¦«à§‹à¦¨','feature-phones'),
  ('mobiles-tablets','à¦Ÿà§à¦¯à¦¾à¦¬à¦²à§‡à¦Ÿ','tablets'),
  ('mobiles-tablets','à¦¸à§à¦®à¦¾à¦°à§à¦Ÿ à¦“à¦¯à¦¼à¦¾à¦š','smart-watches'),
  ('mobiles-tablets','à¦¬à§à¦¯à¦¬à¦¹à§ƒà¦¤ à¦«à§‹à¦¨','used-phones'),

  -- Mobile Accessories
  ('mobile-accessories','à¦ªà¦¾à¦“à¦¯à¦¼à¦¾à¦° à¦¬à§à¦¯à¦¾à¦‚à¦•','power-banks'),
  ('mobile-accessories','à¦šà¦¾à¦°à§à¦œà¦¾à¦° à¦“ à¦•à§à¦¯à¦¾à¦¬à¦²','chargers-cables'),
  ('mobile-accessories','à¦¹à§‡à¦¡à¦«à§‹à¦¨ à¦“ à¦‡à¦¯à¦¼à¦¾à¦°à¦«à§‹à¦¨','headphones-earphones'),
  ('mobile-accessories','à¦¬à§à¦²à§à¦Ÿà§à¦¥ à¦¹à§‡à¦¡à¦¸à§‡à¦Ÿ','bluetooth-headsets'),
  ('mobile-accessories','à¦«à§‹à¦¨ à¦•à§‡à¦¸ à¦“ à¦•à¦­à¦¾à¦°','phone-cases'),
  ('mobile-accessories','à¦¸à§à¦•à§à¦°à¦¿à¦¨ à¦ªà§à¦°à¦Ÿà§‡à¦•à§à¦Ÿà¦°','screen-protectors'),
  ('mobile-accessories','à¦¸à§‡à¦²à¦«à¦¿ à¦¸à§à¦Ÿà¦¿à¦• à¦“ à¦Ÿà§à¦°à¦¾à¦‡à¦ªà¦¡','selfie-sticks-tripods'),
  ('mobile-accessories','à¦¸à§à¦®à¦¾à¦°à§à¦Ÿ à¦¬à§à¦¯à¦¾à¦¨à§à¦¡','fitness-bands'),

  -- Electronic Devices
  ('electronic-devices','à¦²à§à¦¯à¦¾à¦ªà¦Ÿà¦ª','laptops'),
  ('electronic-devices','à¦¡à§‡à¦¸à§à¦•à¦Ÿà¦ª à¦•à¦®à§à¦ªà¦¿à¦‰à¦Ÿà¦¾à¦°','desktops'),
  ('electronic-devices','à¦•à§à¦¯à¦¾à¦®à§‡à¦°à¦¾','cameras'),
  ('electronic-devices','à¦¡à§à¦°à§‹à¦¨','drones'),
  ('electronic-devices','à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿà¦¾à¦°','printers'),
  ('electronic-devices','à¦®à¦¨à¦¿à¦Ÿà¦°','monitors'),
  ('electronic-devices','à¦—à§‡à¦®à¦¿à¦‚ à¦•à¦¨à¦¸à§‹à¦²','gaming-consoles'),

  -- Electronic Accessories
  ('electronic-accessories','à¦®à¦¾à¦‰à¦¸ à¦“ à¦•à§€à¦¬à§‹à¦°à§à¦¡','mouse-keyboards'),
  ('electronic-accessories','à¦²à§à¦¯à¦¾à¦ªà¦Ÿà¦ª à¦¬à§à¦¯à¦¾à¦—','laptop-bags'),
  ('electronic-accessories','à¦¸à§à¦Ÿà§‹à¦°à§‡à¦œ à¦“ à¦ªà§‡à¦¨ à¦¡à§à¦°à¦¾à¦‡à¦­','storage-pen-drives'),
  ('electronic-accessories','à¦¨à§‡à¦Ÿà¦“à¦¯à¦¼à¦¾à¦°à§à¦• à¦¡à¦¿à¦­à¦¾à¦‡à¦¸','networking'),
  ('electronic-accessories','à¦•à¦®à§à¦ªà¦¿à¦‰à¦Ÿà¦¾à¦° à¦à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','computer-accessories'),
  ('electronic-accessories','à¦•à§à¦¯à¦¾à¦®à§‡à¦°à¦¾ à¦à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','camera-accessories'),
  ('electronic-accessories','à¦•à§à¦¯à¦¾à¦¬à¦² à¦“ à¦•à¦¨à¦­à¦¾à¦°à§à¦Ÿà¦¾à¦°','cables-converters'),

  -- TV & Home Appliances
  ('tv-home-appliances','à¦Ÿà§‡à¦²à¦¿à¦­à¦¿à¦¶à¦¨','televisions'),
  ('tv-home-appliances','à¦«à§à¦°à¦¿à¦œ','refrigerators'),
  ('tv-home-appliances','à¦“à¦¯à¦¼à¦¾à¦¶à¦¿à¦‚ à¦®à§‡à¦¶à¦¿à¦¨','washing-machines'),
  ('tv-home-appliances','à¦à¦¯à¦¼à¦¾à¦° à¦•à¦¨à§à¦¡à¦¿à¦¶à¦¨à¦¾à¦°','air-conditioners'),
  ('tv-home-appliances','à¦®à¦¾à¦‡à¦•à§à¦°à§‹à¦“à¦¯à¦¼à§‡à¦­ à¦“à¦­à§‡à¦¨','microwave-ovens'),
  ('tv-home-appliances','à¦¬à§à¦²à§‡à¦¨à§à¦¡à¦¾à¦° à¦“ à¦œà§à¦¸à¦¾à¦°','blenders-juicers'),
  ('tv-home-appliances','à¦°à¦¾à¦‡à¦¸ à¦•à§à¦•à¦¾à¦°','rice-cookers'),
  ('tv-home-appliances','à¦‡à¦²à§‡à¦•à¦Ÿà§à¦°à¦¿à¦• à¦«à§à¦¯à¦¾à¦¨','electric-fans'),
  ('tv-home-appliances','à¦‡à¦²à§‡à¦•à¦Ÿà§à¦°à¦¿à¦• à¦†à¦¯à¦¼à¦°à¦¨','irons'),
  ('tv-home-appliances','à¦“à¦¯à¦¼à¦¾à¦Ÿà¦¾à¦° à¦ªà¦¿à¦‰à¦°à¦¿à¦«à¦¾à¦¯à¦¼à¦¾à¦°','water-purifiers'),

  -- Health & Beauty
  ('health-beauty','à¦®à§‡à¦•à¦†à¦ª','makeup'),
  ('health-beauty','à¦¸à§à¦•à¦¿à¦¨ à¦•à§‡à¦¯à¦¼à¦¾à¦°','skin-care'),
  ('health-beauty','à¦¹à§‡à¦¯à¦¼à¦¾à¦° à¦•à§‡à¦¯à¦¼à¦¾à¦°','hair-care'),
  ('health-beauty','à¦ªà¦¾à¦°à¦«à¦¿à¦‰à¦® à¦“ à¦¸à§à¦—à¦¨à§à¦§à¦¿','perfumes-fragrances'),
  ('health-beauty','à¦ªà¦¾à¦°à§à¦¸à§‹à¦¨à¦¾à¦² à¦•à§‡à¦¯à¦¼à¦¾à¦°','personal-care'),
  ('health-beauty','à¦“à¦°à¦¾à¦² à¦•à§‡à¦¯à¦¼à¦¾à¦°','oral-care'),
  ('health-beauty','à¦®à§‡à¦¡à¦¿à¦•à§‡à¦² à¦¸à¦¾à¦ªà§à¦²à¦¾à¦‡','medical-supplies'),
  ('health-beauty','à¦¸à§‡à¦•à§à¦¸à§à¦¯à¦¼à¦¾à¦² à¦“à¦¯à¦¼à§‡à¦²à¦¨à§‡à¦¸','sexual-wellness'),

  -- Babies & Toys
  ('babies-toys','à¦¡à¦¾à¦¯à¦¼à¦¾à¦ªà¦¾à¦° à¦“ à¦¨à¦¾à¦°à§à¦¸à¦¿à¦‚','diapers-nursing'),
  ('babies-toys','à¦¬à§‡à¦¬à¦¿ à¦«à¦°à§à¦®à§à¦²à¦¾ à¦“ à¦«à§à¦¡','baby-food'),
  ('babies-toys','à¦¬à§‡à¦¬à¦¿ à¦—à¦¿à¦¯à¦¼à¦¾à¦°','baby-gear'),
  ('babies-toys','à¦¬à§‡à¦¬à¦¿ à¦“ à¦Ÿà¦¡à¦²à¦¾à¦° à¦ªà§‹à¦¶à¦¾à¦•','baby-clothing'),
  ('babies-toys','à¦–à§‡à¦²à¦¨à¦¾','toys'),
  ('babies-toys','à¦ªà¦¾à¦œà¦² à¦“ à¦—à§‡à¦®à¦¸','puzzles-games'),

  -- Groceries & Pets
  ('groceries-pets','à¦šà¦¾à¦², à¦¡à¦¾à¦² à¦“ à¦¤à§‡à¦²','rice-dal-oil'),
  ('groceries-pets','à¦®à¦¶à¦²à¦¾ à¦“ à¦¸à¦¿à¦œà¦¨à¦¿à¦‚','spices-seasoning'),
  ('groceries-pets','à¦¸à§à¦¨à§à¦¯à¦¾à¦•à¦¸ à¦“ à¦¬à¦¿à¦¸à§à¦•à§à¦Ÿ','snacks-biscuits'),
  ('groceries-pets','à¦šà¦¾ à¦“ à¦•à¦«à¦¿','tea-coffee'),
  ('groceries-pets','à¦ªà¦¾à¦¨à§€à¦¯à¦¼','beverages'),
  ('groceries-pets','à¦ªà§‹à¦·à¦¾ à¦ªà§à¦°à¦¾à¦£à§€à¦° à¦–à¦¾à¦¬à¦¾à¦°','pet-food'),
  ('groceries-pets','à¦ªà§‹à¦·à¦¾ à¦ªà§à¦°à¦¾à¦£à§€à¦° à¦…à§à¦¯à¦¾à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','pet-accessories'),

  -- Home & Lifestyle
  ('home-lifestyle','à¦¬à§‡à¦¡à¦¿à¦‚ à¦“ à¦¬à¦¾à¦¥','bedding-bath'),
  ('home-lifestyle','à¦¹à§‹à¦® à¦¡à§‡à¦•à¦°','home-decor'),
  ('home-lifestyle','à¦«à¦¾à¦°à§à¦¨à¦¿à¦šà¦¾à¦°','furniture'),
  ('home-lifestyle','à¦•à¦¿à¦šà§‡à¦¨à¦“à¦¯à¦¼à§à¦¯à¦¾à¦°','kitchenware'),
  ('home-lifestyle','à¦¡à¦¾à¦‡à¦¨à¦¿à¦‚ à¦“ à¦¸à¦¾à¦°à§à¦­à¦¿à¦‚','dining-serving'),
  ('home-lifestyle','à¦²à¦¾à¦‡à¦Ÿà¦¿à¦‚','lighting'),
  ('home-lifestyle','à¦Ÿà§à¦²à¦¸ à¦“ à¦¹à¦¾à¦°à§à¦¡à¦“à¦¯à¦¼à§à¦¯à¦¾à¦°','tools-hardware'),
  ('home-lifestyle','à¦—à¦¾à¦°à§à¦¡à§‡à¦¨à¦¿à¦‚','gardening'),
  ('home-lifestyle','à¦¸à§à¦Ÿà§‡à¦¶à¦¨à¦¾à¦°à¦¿ à¦“ à¦•à§à¦°à¦¾à¦«à¦Ÿà¦¸','stationery-crafts'),
  ('home-lifestyle','à¦²à¦¨à§à¦¡à§à¦°à¦¿ à¦“ à¦•à§à¦²à¦¿à¦¨à¦¿à¦‚','laundry-cleaning'),

  -- Sports & Outdoor
  ('sports-outdoor','à¦¸à§à¦ªà§‹à¦°à§à¦Ÿà¦¸ à¦ªà§‹à¦¶à¦¾à¦•','sports-clothing'),
  ('sports-outdoor','à¦¸à§à¦ªà§‹à¦°à§à¦Ÿà¦¸ à¦œà§à¦¤à¦¾','sports-shoes'),
  ('sports-outdoor','à¦«à¦¿à¦Ÿà¦¨à§‡à¦¸ à¦‡à¦•à§à¦‡à¦ªà¦®à§‡à¦¨à§à¦Ÿ','fitness-equipment'),
  ('sports-outdoor','à¦¸à¦¾à¦‡à¦•à§à¦²à¦¿à¦‚','cycling'),
  ('sports-outdoor','à¦†à¦‰à¦Ÿà¦¡à§‹à¦° à¦“ à¦•à§à¦¯à¦¾à¦®à§à¦ªà¦¿à¦‚','outdoor-camping'),
  ('sports-outdoor','à¦Ÿà¦¿à¦® à¦¸à§à¦ªà§‹à¦°à§à¦Ÿà¦¸','team-sports'),

  -- Automotive & Motorbike
  ('automotive-motorbike','à¦®à§‹à¦Ÿà¦°à¦¬à¦¾à¦‡à¦• à¦à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','motorbike-accessories'),
  ('automotive-motorbike','à¦®à§‹à¦Ÿà¦°à¦¬à¦¾à¦‡à¦• à¦ªà¦¾à¦°à§à¦Ÿà¦¸','motorbike-parts'),
  ('automotive-motorbike','à¦¹à§‡à¦²à¦®à§‡à¦Ÿ','helmets'),
  ('automotive-motorbike','à¦•à¦¾à¦° à¦à¦•à§à¦¸à§‡à¦¸à¦°à¦¿à¦œ','car-accessories'),
  ('automotive-motorbike','à¦•à¦¾à¦° à¦‡à¦²à§‡à¦•à¦Ÿà§à¦°à¦¨à¦¿à¦•à§à¦¸','car-electronics'),
  ('automotive-motorbike','à¦•à¦¾à¦° à¦•à§‡à¦¯à¦¼à¦¾à¦°','car-care'),

  -- Watches, Bags & Jewellery
  ('watches-bags-jewellery','à¦ªà§à¦°à§à¦·à¦¦à§‡à¦° à¦˜à¦¡à¦¼à¦¿','mens-watches-cat'),
  ('watches-bags-jewellery','à¦®à¦¹à¦¿à¦²à¦¾à¦¦à§‡à¦° à¦˜à¦¡à¦¼à¦¿','womens-watches-cat'),
  ('watches-bags-jewellery','à¦¸à¦¾à¦¨à¦—à§à¦²à¦¾à¦¸ à¦“ à¦šà¦¶à¦®à¦¾','sunglasses-eyewear'),
  ('watches-bags-jewellery','à¦Ÿà§à¦°à¦¾à¦­à§‡à¦² à¦¬à§à¦¯à¦¾à¦— à¦“ à¦²à¦¾à¦—à§‡à¦œ','travel-bags-luggage'),
  ('watches-bags-jewellery','à¦«à¦¾à¦‡à¦¨ à¦œà§à¦¯à¦¼à§‡à¦²à¦¾à¦°à¦¿','fine-jewellery'),
  ('watches-bags-jewellery','à¦«à§à¦¯à¦¾à¦¶à¦¨ à¦œà§à¦¯à¦¼à§‡à¦²à¦¾à¦°à¦¿','fashion-jewellery')
)
INSERT INTO public.categories (name, slug, sort_order, parent_id)
SELECT s.name, s.slug, row_number() OVER (PARTITION BY s.parent_slug), p.id
FROM subs s JOIN public.categories p ON p.slug = s.parent_slug;


-- File: 20260710123217_d2ef2a32-82dc-4259-8ef4-2e408fe53de2.sql

-- Clear existing categories and product links
UPDATE public.products SET category_slug = NULL, category_name = NULL, subcategory_slug = NULL, subcategory_name = NULL;
DELETE FROM public.categories;

-- Insert 12 top-level parent categories (English only, unique slugs)
INSERT INTO public.categories (name, slug, icon, parent_id, sort_order) VALUES
  ('Women''s Fashion',            'womens-fashion',           'ðŸ‘—', NULL, 1),
  ('Men''s Fashion',              'mens-fashion',             'ðŸ‘”', NULL, 2),
  ('Watches, Bags & Jewellery',   'watches-bags-jewellery',   'âŒš', NULL, 3),
  ('Mother & Baby',               'mother-baby',              'ðŸ¼', NULL, 4),
  ('Home & Lifestyle',            'home-lifestyle',           'ðŸ ', NULL, 5),
  ('Electronic Devices',          'electronic-devices',       'ðŸ’»', NULL, 6),
  ('TV & Home Appliances',        'tv-home-appliances',       'ðŸ“º', NULL, 7),
  ('Electronic Accessories',      'electronic-accessories',   'ðŸŽ§', NULL, 8),
  ('Health & Beauty',             'health-beauty',            'ðŸ’„', NULL, 9),
  ('Groceries & Pets',            'groceries-pets',           'ðŸ›’', NULL, 10),
  ('Sports & Outdoor',            'sports-outdoor',           'âš½', NULL, 11),
  ('Automotive & Motorbike',      'automotive-motorbike',     'ðŸš—', NULL, 12);

-- Insert subcategories via a joined CTE so slugs stay unique (parent-slug prefix)
WITH subs(parent_slug, name, slug, sort_order) AS (
  VALUES
    -- Women's Fashion
    ('womens-fashion','Muslim Wear',            'womens-fashion-muslim-wear',       1),
    ('womens-fashion','Sarees',                 'womens-fashion-sarees',            2),
    ('womens-fashion','Salwar Kameez',          'womens-fashion-salwar-kameez',     3),
    ('womens-fashion','Kurtis & Tunics',        'womens-fashion-kurtis-tunics',     4),
    ('womens-fashion','Tops',                   'womens-fashion-tops',              5),
    ('womens-fashion','Dresses',                'womens-fashion-dresses',           6),
    ('womens-fashion','Traditional Wear',       'womens-fashion-traditional',       7),
    ('womens-fashion','Winter Clothing',        'womens-fashion-winter',            8),
    ('womens-fashion','Lingerie & Sleepwear',   'womens-fashion-lingerie',          9),
    ('womens-fashion','Shoes',                  'womens-fashion-shoes',            10),
    ('womens-fashion','Sandals',                'womens-fashion-sandals',          11),
    ('womens-fashion','Sportswear',             'womens-fashion-sportswear',       12),
    ('womens-fashion','Accessories',            'womens-fashion-accessories',      13),

    -- Men's Fashion
    ('mens-fashion','T-Shirts',                 'mens-fashion-tshirts',             1),
    ('mens-fashion','Polo Shirts',              'mens-fashion-polo',                2),
    ('mens-fashion','Shirts',                   'mens-fashion-shirts',              3),
    ('mens-fashion','Panjabi & Fatua',          'mens-fashion-panjabi',             4),
    ('mens-fashion','Pants',                    'mens-fashion-pants',               5),
    ('mens-fashion','Jeans',                    'mens-fashion-jeans',               6),
    ('mens-fashion','Shorts',                   'mens-fashion-shorts',              7),
    ('mens-fashion','Traditional Wear',         'mens-fashion-traditional',         8),
    ('mens-fashion','Winter Clothing',          'mens-fashion-winter',              9),
    ('mens-fashion','Innerwear & Sleepwear',    'mens-fashion-innerwear',          10),
    ('mens-fashion','Formal Shoes',             'mens-fashion-formal-shoes',       11),
    ('mens-fashion','Sneakers',                 'mens-fashion-sneakers',           12),
    ('mens-fashion','Sandals & Flip-Flops',     'mens-fashion-sandals',            13),
    ('mens-fashion','Sportswear',               'mens-fashion-sportswear',         14),
    ('mens-fashion','Accessories',              'mens-fashion-accessories',        15),

    -- Watches, Bags & Jewellery
    ('watches-bags-jewellery','Men''s Watches',      'wbj-mens-watches',       1),
    ('watches-bags-jewellery','Women''s Watches',    'wbj-womens-watches',     2),
    ('watches-bags-jewellery','Kids Watches',        'wbj-kids-watches',       3),
    ('watches-bags-jewellery','Sunglasses & Eyewear','wbj-eyewear',            4),
    ('watches-bags-jewellery','Women''s Bags',       'wbj-womens-bags',        5),
    ('watches-bags-jewellery','Men''s Bags',         'wbj-mens-bags',          6),
    ('watches-bags-jewellery','Backpacks',           'wbj-backpacks',          7),
    ('watches-bags-jewellery','Luggage',             'wbj-luggage',            8),
    ('watches-bags-jewellery','Fashion Jewellery',   'wbj-fashion-jewellery',  9),
    ('watches-bags-jewellery','Fine Jewellery',      'wbj-fine-jewellery',    10),
    ('watches-bags-jewellery','Wallets',             'wbj-wallets',           11),

    -- Mother & Baby
    ('mother-baby','Diapers & Potty',          'mb-diapers',              1),
    ('mother-baby','Baby Feeding',             'mb-feeding',              2),
    ('mother-baby','Milk Formula',             'mb-milk-formula',         3),
    ('mother-baby','Baby & Toddler Food',      'mb-toddler-food',         4),
    ('mother-baby','Baby Personal Care',       'mb-baby-care',            5),
    ('mother-baby','Baby Clothing',            'mb-baby-clothing',        6),
    ('mother-baby','Baby Gear',                'mb-gear',                 7),
    ('mother-baby','Nursery',                  'mb-nursery',              8),
    ('mother-baby','Maternity Care',           'mb-maternity',            9),
    ('mother-baby','Toys & Games',             'mb-toys-games',          10),
    ('mother-baby','Educational Toys',         'mb-educational-toys',    11),

    -- Home & Lifestyle
    ('home-lifestyle','Bedding & Bath',        'home-bedding-bath',       1),
    ('home-lifestyle','Home Decor',            'home-decor',              2),
    ('home-lifestyle','Kitchenware',           'home-kitchenware',        3),
    ('home-lifestyle','Cookware',              'home-cookware',           4),
    ('home-lifestyle','Dining & Serveware',    'home-dining',             5),
    ('home-lifestyle','Furniture',             'home-furniture',          6),
    ('home-lifestyle','Lighting',              'home-lighting',           7),
    ('home-lifestyle','Tools & DIY',           'home-tools-diy',          8),
    ('home-lifestyle','Laundry & Cleaning',    'home-laundry-cleaning',   9),
    ('home-lifestyle','Storage & Organization','home-storage',           10),
    ('home-lifestyle','Stationery & Crafts',   'home-stationery',        11),
    ('home-lifestyle','Books',                 'home-books',             12),
    ('home-lifestyle','Party Supplies',        'home-party',             13),

    -- Electronic Devices
    ('electronic-devices','Mobiles',                    'ed-mobiles',           1),
    ('electronic-devices','Tablets',                    'ed-tablets',           2),
    ('electronic-devices','Laptops',                    'ed-laptops',           3),
    ('electronic-devices','Desktops',                   'ed-desktops',          4),
    ('electronic-devices','Gaming Consoles',            'ed-gaming-consoles',   5),
    ('electronic-devices','DSLR & Mirrorless Cameras',  'ed-dslr',              6),
    ('electronic-devices','Point & Shoot Cameras',      'ed-cameras',           7),
    ('electronic-devices','Action Cameras',             'ed-action-cams',       8),
    ('electronic-devices','Drones',                     'ed-drones',            9),
    ('electronic-devices','Wearable Tech',              'ed-wearable',         10),
    ('electronic-devices','Smart Watches',              'ed-smartwatch',       11),

    -- TV & Home Appliances
    ('tv-home-appliances','Televisions',        'tvha-tvs',              1),
    ('tv-home-appliances','Home Audio',         'tvha-home-audio',       2),
    ('tv-home-appliances','Projectors',         'tvha-projectors',       3),
    ('tv-home-appliances','Air Conditioners',   'tvha-ac',               4),
    ('tv-home-appliances','Refrigerators',      'tvha-fridge',           5),
    ('tv-home-appliances','Freezers',           'tvha-freezer',          6),
    ('tv-home-appliances','Washing Machines',   'tvha-washing',          7),
    ('tv-home-appliances','Kitchen Appliances', 'tvha-kitchen-app',      8),
    ('tv-home-appliances','Microwaves & Ovens', 'tvha-microwaves',       9),
    ('tv-home-appliances','Water Purifiers',    'tvha-water-purifiers', 10),
    ('tv-home-appliances','Vacuum Cleaners',    'tvha-vacuum',          11),
    ('tv-home-appliances','Fans',               'tvha-fans',            12),
    ('tv-home-appliances','Irons',              'tvha-irons',           13),
    ('tv-home-appliances','Personal Care Appliances','tvha-personal',   14),

    -- Electronic Accessories
    ('electronic-accessories','Mobile Accessories',   'ea-mobile-acc',       1),
    ('electronic-accessories','Phone Cases',          'ea-phone-cases',      2),
    ('electronic-accessories','Screen Protectors',    'ea-screen-prot',      3),
    ('electronic-accessories','Chargers & Cables',    'ea-chargers',         4),
    ('electronic-accessories','Power Banks',          'ea-power-banks',      5),
    ('electronic-accessories','Headphones & Earbuds', 'ea-headphones',       6),
    ('electronic-accessories','Bluetooth Speakers',   'ea-bt-speakers',      7),
    ('electronic-accessories','Wearable Accessories', 'ea-wearable-acc',     8),
    ('electronic-accessories','Camera Accessories',   'ea-camera-acc',       9),
    ('electronic-accessories','Storage & Memory',     'ea-storage',         10),
    ('electronic-accessories','Computer Accessories', 'ea-computer-acc',    11),
    ('electronic-accessories','Printers & Ink',       'ea-printers',        12),
    ('electronic-accessories','Networking Devices',   'ea-networking',      13),
    ('electronic-accessories','Gaming Accessories',   'ea-gaming-acc',      14),

    -- Health & Beauty
    ('health-beauty','Skin Care',           'hb-skincare',          1),
    ('health-beauty','Hair Care',           'hb-haircare',          2),
    ('health-beauty','Makeup',              'hb-makeup',            3),
    ('health-beauty','Fragrances',          'hb-fragrances',        4),
    ('health-beauty','Bath & Body',         'hb-bath-body',         5),
    ('health-beauty','Men''s Grooming',     'hb-mens-grooming',     6),
    ('health-beauty','Beauty Tools',        'hb-beauty-tools',      7),
    ('health-beauty','Personal Care',       'hb-personal-care',     8),
    ('health-beauty','Health Supplements',  'hb-supplements',       9),
    ('health-beauty','Medical Supplies',    'hb-medical',          10),
    ('health-beauty','Sexual Wellness',     'hb-sexual-wellness',  11),
    ('health-beauty','Oral Care',           'hb-oral-care',        12),

    -- Groceries & Pets
    ('groceries-pets','Rice, Pasta & Noodles',  'gp-rice-pasta',      1),
    ('groceries-pets','Cooking Essentials',     'gp-cooking',         2),
    ('groceries-pets','Snacks',                 'gp-snacks',          3),
    ('groceries-pets','Beverages',              'gp-beverages',       4),
    ('groceries-pets','Breakfast Foods',        'gp-breakfast',       5),
    ('groceries-pets','Dairy & Chilled',        'gp-dairy',           6),
    ('groceries-pets','Frozen Foods',           'gp-frozen',          7),
    ('groceries-pets','Baking Needs',           'gp-baking',          8),
    ('groceries-pets','Canned & Jarred',        'gp-canned',          9),
    ('groceries-pets','Dog Food & Supplies',    'gp-dog-supplies',   10),
    ('groceries-pets','Cat Food & Supplies',    'gp-cat-supplies',   11),
    ('groceries-pets','Fish & Aquatics',        'gp-fish-aquatics',  12),
    ('groceries-pets','Bird Supplies',          'gp-bird-supplies',  13),

    -- Sports & Outdoor
    ('sports-outdoor','Exercise & Fitness',     'so-fitness',         1),
    ('sports-outdoor','Cycling',                'so-cycling',         2),
    ('sports-outdoor','Team Sports',            'so-team-sports',     3),
    ('sports-outdoor','Cricket',                'so-cricket',         4),
    ('sports-outdoor','Football',               'so-football',        5),
    ('sports-outdoor','Badminton',              'so-badminton',       6),
    ('sports-outdoor','Racket Sports',          'so-racket',          7),
    ('sports-outdoor','Water Sports',           'so-water-sports',    8),
    ('sports-outdoor','Camping & Hiking',       'so-camping',         9),
    ('sports-outdoor','Fishing',                'so-fishing',        10),
    ('sports-outdoor','Sports Shoes',           'so-shoes',          11),
    ('sports-outdoor','Sports Apparel',         'so-apparel',        12),
    ('sports-outdoor','Sports Accessories',     'so-accessories',    13),

    -- Automotive & Motorbike
    ('automotive-motorbike','Automotive Tools',     'am-tools',           1),
    ('automotive-motorbike','Car Care',             'am-car-care',        2),
    ('automotive-motorbike','Car Electronics',      'am-car-electronics', 3),
    ('automotive-motorbike','Interior Accessories', 'am-interior',        4),
    ('automotive-motorbike','Exterior Accessories', 'am-exterior',        5),
    ('automotive-motorbike','Car Safety',           'am-car-safety',      6),
    ('automotive-motorbike','Auto Oils & Fluids',   'am-oils',            7),
    ('automotive-motorbike','Auto Parts & Spares',  'am-parts',           8),
    ('automotive-motorbike','Motorbike Helmets',    'am-helmets',         9),
    ('automotive-motorbike','Motorbike Riding Gear','am-riding-gear',    10),
    ('automotive-motorbike','Motorbike Accessories','am-moto-acc',       11),
    ('automotive-motorbike','Motorbike Parts',      'am-moto-parts',     12),
    ('automotive-motorbike','Motorbike Tyres',      'am-moto-tyres',     13)
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT s.name, s.slug, p.id, s.sort_order
FROM subs s
JOIN public.categories p ON p.slug = s.parent_slug;


-- File: 20260710123911_dc558a4d-9738-4b88-b552-30b122b8e60b.sql

WITH l3(parent_slug, name, slug, sort_order) AS (
  VALUES
    -- Women's Fashion â†’ Sarees
    ('womens-fashion-sarees','Silk Sarees','wf-sarees-silk',1),
    ('womens-fashion-sarees','Cotton Sarees','wf-sarees-cotton',2),
    ('womens-fashion-sarees','Jamdani','wf-sarees-jamdani',3),
    ('womens-fashion-sarees','Half Silk','wf-sarees-half-silk',4),
    ('womens-fashion-sarees','Georgette','wf-sarees-georgette',5),
    ('womens-fashion-sarees','Party Sarees','wf-sarees-party',6),
    ('womens-fashion-sarees','Wedding Sarees','wf-sarees-wedding',7),
    -- Women's Fashion â†’ Salwar Kameez
    ('womens-fashion-salwar-kameez','Unstitched','wf-sk-unstitched',1),
    ('womens-fashion-salwar-kameez','Stitched','wf-sk-stitched',2),
    ('womens-fashion-salwar-kameez','Pakistani','wf-sk-pakistani',3),
    ('womens-fashion-salwar-kameez','Indian','wf-sk-indian',4),
    ('womens-fashion-salwar-kameez','Party Wear','wf-sk-party',5),
    -- Women's Fashion â†’ Muslim Wear
    ('womens-fashion-muslim-wear','Abayas','wf-mw-abayas',1),
    ('womens-fashion-muslim-wear','Burqas','wf-mw-burqas',2),
    ('womens-fashion-muslim-wear','Hijabs','wf-mw-hijabs',3),
    ('womens-fashion-muslim-wear','Prayer Dresses','wf-mw-prayer',4),
    -- Women's Fashion â†’ Tops
    ('womens-fashion-tops','T-Shirts','wf-tops-tshirts',1),
    ('womens-fashion-tops','Blouses','wf-tops-blouses',2),
    ('womens-fashion-tops','Tank Tops','wf-tops-tanks',3),
    ('womens-fashion-tops','Fatuas','wf-tops-fatuas',4),
    -- Women's Fashion â†’ Shoes
    ('womens-fashion-shoes','Heels','wf-shoes-heels',1),
    ('womens-fashion-shoes','Flats','wf-shoes-flats',2),
    ('womens-fashion-shoes','Boots','wf-shoes-boots',3),
    ('womens-fashion-shoes','Sneakers','wf-shoes-sneakers',4),
    ('womens-fashion-shoes','Loafers','wf-shoes-loafers',5),

    -- Men's Fashion â†’ T-Shirts
    ('mens-fashion-tshirts','Half Sleeve','mf-tshirts-half',1),
    ('mens-fashion-tshirts','Full Sleeve','mf-tshirts-full',2),
    ('mens-fashion-tshirts','Graphic Tees','mf-tshirts-graphic',3),
    ('mens-fashion-tshirts','Plain Tees','mf-tshirts-plain',4),
    -- Men's Fashion â†’ Shirts
    ('mens-fashion-shirts','Formal Shirts','mf-shirts-formal',1),
    ('mens-fashion-shirts','Casual Shirts','mf-shirts-casual',2),
    ('mens-fashion-shirts','Denim Shirts','mf-shirts-denim',3),
    ('mens-fashion-shirts','Printed Shirts','mf-shirts-printed',4),
    -- Men's Fashion â†’ Panjabi
    ('mens-fashion-panjabi','Cotton Panjabi','mf-panjabi-cotton',1),
    ('mens-fashion-panjabi','Silk Panjabi','mf-panjabi-silk',2),
    ('mens-fashion-panjabi','Eid Panjabi','mf-panjabi-eid',3),
    ('mens-fashion-panjabi','Kabli','mf-panjabi-kabli',4),
    -- Men's Fashion â†’ Pants / Jeans
    ('mens-fashion-pants','Formal Pants','mf-pants-formal',1),
    ('mens-fashion-pants','Chinos','mf-pants-chinos',2),
    ('mens-fashion-pants','Cargo Pants','mf-pants-cargo',3),
    ('mens-fashion-pants','Joggers','mf-pants-joggers',4),
    ('mens-fashion-jeans','Slim Fit','mf-jeans-slim',1),
    ('mens-fashion-jeans','Regular Fit','mf-jeans-regular',2),
    ('mens-fashion-jeans','Skinny','mf-jeans-skinny',3),
    ('mens-fashion-jeans','Straight','mf-jeans-straight',4),
    -- Men's Fashion â†’ Formal Shoes / Sneakers
    ('mens-fashion-formal-shoes','Oxfords','mf-fs-oxfords',1),
    ('mens-fashion-formal-shoes','Loafers','mf-fs-loafers',2),
    ('mens-fashion-formal-shoes','Derby','mf-fs-derby',3),
    ('mens-fashion-sneakers','Running','mf-sneakers-running',1),
    ('mens-fashion-sneakers','Casual','mf-sneakers-casual',2),
    ('mens-fashion-sneakers','High Tops','mf-sneakers-hightop',3),

    -- Electronic Devices â†’ Mobiles
    ('ed-mobiles','Samsung','ed-mobiles-samsung',1),
    ('ed-mobiles','Xiaomi','ed-mobiles-xiaomi',2),
    ('ed-mobiles','Realme','ed-mobiles-realme',3),
    ('ed-mobiles','Oppo','ed-mobiles-oppo',4),
    ('ed-mobiles','Vivo','ed-mobiles-vivo',5),
    ('ed-mobiles','Apple iPhone','ed-mobiles-iphone',6),
    ('ed-mobiles','Infinix','ed-mobiles-infinix',7),
    ('ed-mobiles','Tecno','ed-mobiles-tecno',8),
    ('ed-mobiles','Nokia','ed-mobiles-nokia',9),
    ('ed-mobiles','Walton','ed-mobiles-walton',10),
    ('ed-mobiles','Symphony','ed-mobiles-symphony',11),
    -- Tablets
    ('ed-tablets','Samsung Tablets','ed-tablets-samsung',1),
    ('ed-tablets','Apple iPad','ed-tablets-ipad',2),
    ('ed-tablets','Lenovo Tablets','ed-tablets-lenovo',3),
    ('ed-tablets','Xiaomi Tablets','ed-tablets-xiaomi',4),
    ('ed-tablets','Huawei Tablets','ed-tablets-huawei',5),
    -- Laptops
    ('ed-laptops','HP','ed-laptops-hp',1),
    ('ed-laptops','Dell','ed-laptops-dell',2),
    ('ed-laptops','Lenovo','ed-laptops-lenovo',3),
    ('ed-laptops','Asus','ed-laptops-asus',4),
    ('ed-laptops','Acer','ed-laptops-acer',5),
    ('ed-laptops','Apple MacBook','ed-laptops-macbook',6),
    ('ed-laptops','MSI','ed-laptops-msi',7),
    ('ed-laptops','Walton Laptops','ed-laptops-walton',8),
    ('ed-laptops','Gaming Laptops','ed-laptops-gaming',9),
    -- Smart Watches
    ('ed-smartwatch','Apple Watch','ed-sw-apple',1),
    ('ed-smartwatch','Samsung Galaxy Watch','ed-sw-samsung',2),
    ('ed-smartwatch','Xiaomi Mi Band','ed-sw-xiaomi',3),
    ('ed-smartwatch','Amazfit','ed-sw-amazfit',4),
    ('ed-smartwatch','Fitness Trackers','ed-sw-fitness',5),

    -- Electronic Accessories â†’ Headphones & Earbuds
    ('ea-headphones','Wireless Earbuds','ea-hp-wireless-earbuds',1),
    ('ea-headphones','Wired Earphones','ea-hp-wired',2),
    ('ea-headphones','Over-Ear Headphones','ea-hp-overear',3),
    ('ea-headphones','Gaming Headsets','ea-hp-gaming',4),
    ('ea-headphones','Neckband Earphones','ea-hp-neckband',5),
    ('ea-headphones','Bluetooth Headsets','ea-hp-bt-headset',6),
    -- Power Banks / Chargers
    ('ea-power-banks','10000 mAh','ea-pb-10000',1),
    ('ea-power-banks','20000 mAh','ea-pb-20000',2),
    ('ea-power-banks','Fast Charging Power Banks','ea-pb-fast',3),
    ('ea-power-banks','Solar Power Banks','ea-pb-solar',4),
    ('ea-chargers','Fast Chargers','ea-chargers-fast',1),
    ('ea-chargers','Wireless Chargers','ea-chargers-wireless',2),
    ('ea-chargers','USB-C Cables','ea-chargers-usbc',3),
    ('ea-chargers','Lightning Cables','ea-chargers-lightning',4),
    ('ea-chargers','Micro USB Cables','ea-chargers-micro',5),

    -- TV & Home Appliances â†’ Televisions / AC / Fridge / Fans
    ('tvha-tvs','Smart TVs','tvha-tvs-smart',1),
    ('tvha-tvs','4K UHD TVs','tvha-tvs-4k',2),
    ('tvha-tvs','LED TVs','tvha-tvs-led',3),
    ('tvha-tvs','32 Inch','tvha-tvs-32',4),
    ('tvha-tvs','43 Inch','tvha-tvs-43',5),
    ('tvha-tvs','55 Inch','tvha-tvs-55',6),
    ('tvha-tvs','65 Inch','tvha-tvs-65',7),
    ('tvha-ac','Split AC','tvha-ac-split',1),
    ('tvha-ac','Inverter AC','tvha-ac-inverter',2),
    ('tvha-ac','1 Ton','tvha-ac-1ton',3),
    ('tvha-ac','1.5 Ton','tvha-ac-1-5ton',4),
    ('tvha-ac','2 Ton','tvha-ac-2ton',5),
    ('tvha-fridge','Double Door','tvha-fridge-double',1),
    ('tvha-fridge','Single Door','tvha-fridge-single',2),
    ('tvha-fridge','Side By Side','tvha-fridge-sbs',3),
    ('tvha-fridge','Mini Fridge','tvha-fridge-mini',4),
    ('tvha-fans','Ceiling Fans','tvha-fans-ceiling',1),
    ('tvha-fans','Table Fans','tvha-fans-table',2),
    ('tvha-fans','Pedestal Fans','tvha-fans-pedestal',3),
    ('tvha-fans','Rechargeable Fans','tvha-fans-rechargeable',4),
    ('tvha-fans','Exhaust Fans','tvha-fans-exhaust',5),

    -- Health & Beauty â†’ Skin Care / Makeup / Hair Care
    ('hb-skincare','Face Wash','hb-skin-facewash',1),
    ('hb-skincare','Moisturizers','hb-skin-moisturizer',2),
    ('hb-skincare','Sunscreen','hb-skin-sunscreen',3),
    ('hb-skincare','Face Serums','hb-skin-serum',4),
    ('hb-skincare','Face Masks','hb-skin-mask',5),
    ('hb-skincare','Toners','hb-skin-toner',6),
    ('hb-skincare','Acne Treatment','hb-skin-acne',7),
    ('hb-makeup','Lipstick','hb-mk-lipstick',1),
    ('hb-makeup','Foundation','hb-mk-foundation',2),
    ('hb-makeup','Eyeliner','hb-mk-eyeliner',3),
    ('hb-makeup','Mascara','hb-mk-mascara',4),
    ('hb-makeup','Eyeshadow','hb-mk-eyeshadow',5),
    ('hb-makeup','Blush','hb-mk-blush',6),
    ('hb-makeup','Nail Polish','hb-mk-nailpolish',7),
    ('hb-haircare','Shampoo','hb-hair-shampoo',1),
    ('hb-haircare','Conditioner','hb-hair-conditioner',2),
    ('hb-haircare','Hair Oil','hb-hair-oil',3),
    ('hb-haircare','Hair Mask','hb-hair-mask',4),
    ('hb-haircare','Hair Color','hb-hair-color',5),

    -- Home & Lifestyle â†’ Furniture / Kitchenware
    ('home-furniture','Sofas','home-furn-sofa',1),
    ('home-furniture','Beds','home-furn-bed',2),
    ('home-furniture','Dining Tables','home-furn-dining',3),
    ('home-furniture','Wardrobes','home-furn-wardrobe',4),
    ('home-furniture','Office Chairs','home-furn-office-chair',5),
    ('home-furniture','Study Tables','home-furn-study',6),
    ('home-furniture','Shoe Racks','home-furn-shoerack',7),
    ('home-kitchenware','Pressure Cookers','home-kw-pressure',1),
    ('home-kitchenware','Rice Cookers','home-kw-rice',2),
    ('home-kitchenware','Non-Stick Pans','home-kw-nonstick',3),
    ('home-kitchenware','Knives','home-kw-knives',4),
    ('home-kitchenware','Water Bottles','home-kw-bottles',5),
    ('home-kitchenware','Lunch Boxes','home-kw-lunchbox',6),

    -- Groceries & Pets â†’ Beverages / Snacks
    ('gp-beverages','Tea','gp-bev-tea',1),
    ('gp-beverages','Coffee','gp-bev-coffee',2),
    ('gp-beverages','Soft Drinks','gp-bev-softdrinks',3),
    ('gp-beverages','Juices','gp-bev-juices',4),
    ('gp-beverages','Energy Drinks','gp-bev-energy',5),
    ('gp-beverages','Water','gp-bev-water',6),
    ('gp-snacks','Chips & Crisps','gp-snacks-chips',1),
    ('gp-snacks','Biscuits & Cookies','gp-snacks-biscuits',2),
    ('gp-snacks','Chocolates','gp-snacks-chocolate',3),
    ('gp-snacks','Nuts & Dry Fruits','gp-snacks-nuts',4),
    ('gp-snacks','Instant Noodles','gp-snacks-noodles',5),
    ('gp-cooking','Cooking Oil','gp-cook-oil',1),
    ('gp-cooking','Spices','gp-cook-spices',2),
    ('gp-cooking','Salt & Sugar','gp-cook-salt-sugar',3),
    ('gp-cooking','Sauces & Condiments','gp-cook-sauces',4),
    ('gp-cooking','Ghee & Butter','gp-cook-ghee',5),

    -- Sports & Outdoor â†’ Cricket / Football / Fitness
    ('so-cricket','Cricket Bats','so-cricket-bat',1),
    ('so-cricket','Cricket Balls','so-cricket-ball',2),
    ('so-cricket','Cricket Gloves','so-cricket-gloves',3),
    ('so-cricket','Cricket Pads','so-cricket-pads',4),
    ('so-cricket','Cricket Helmets','so-cricket-helmet',5),
    ('so-football','Footballs','so-football-ball',1),
    ('so-football','Football Boots','so-football-boots',2),
    ('so-football','Football Jerseys','so-football-jersey',3),
    ('so-football','Shin Guards','so-football-shin',4),
    ('so-fitness','Dumbbells','so-fit-dumbbells',1),
    ('so-fitness','Yoga Mats','so-fit-yoga',2),
    ('so-fitness','Treadmills','so-fit-treadmill',3),
    ('so-fitness','Resistance Bands','so-fit-bands',4),
    ('so-fitness','Skipping Ropes','so-fit-skipping',5),

    -- Mother & Baby â†’ Diapers / Baby Clothing / Toys
    ('mb-diapers','Newborn Diapers','mb-diapers-newborn',1),
    ('mb-diapers','Small Diapers','mb-diapers-small',2),
    ('mb-diapers','Medium Diapers','mb-diapers-medium',3),
    ('mb-diapers','Large Diapers','mb-diapers-large',4),
    ('mb-diapers','Pants Style Diapers','mb-diapers-pants',5),
    ('mb-baby-clothing','Baby Boy Clothing','mb-clothing-boy',1),
    ('mb-baby-clothing','Baby Girl Clothing','mb-clothing-girl',2),
    ('mb-baby-clothing','Newborn Sets','mb-clothing-newborn',3),
    ('mb-baby-clothing','Baby Winter Wear','mb-clothing-winter',4),
    ('mb-toys-games','Educational Toys','mb-toys-educational',1),
    ('mb-toys-games','Remote Control Toys','mb-toys-rc',2),
    ('mb-toys-games','Dolls & Plush','mb-toys-dolls',3),
    ('mb-toys-games','Building Blocks','mb-toys-blocks',4),
    ('mb-toys-games','Puzzles','mb-toys-puzzles',5),
    ('mb-toys-games','Outdoor Toys','mb-toys-outdoor',6),

    -- Automotive & Motorbike â†’ Helmets / Parts
    ('am-helmets','Full Face Helmets','am-helmet-fullface',1),
    ('am-helmets','Half Helmets','am-helmet-half',2),
    ('am-helmets','Modular Helmets','am-helmet-modular',3),
    ('am-helmets','Kids Helmets','am-helmet-kids',4),
    ('am-moto-parts','Engine Parts','am-moto-parts-engine',1),
    ('am-moto-parts','Chain & Sprocket','am-moto-parts-chain',2),
    ('am-moto-parts','Brake Parts','am-moto-parts-brake',3),
    ('am-moto-parts','Lights & Indicators','am-moto-parts-lights',4),
    ('am-moto-parts','Mirrors','am-moto-parts-mirrors',5),

    -- Watches, Bags & Jewellery â†’ Men's / Women's Watches
    ('wbj-mens-watches','Analog','wbj-mw-analog',1),
    ('wbj-mens-watches','Digital','wbj-mw-digital',2),
    ('wbj-mens-watches','Chronograph','wbj-mw-chrono',3),
    ('wbj-mens-watches','Leather Strap','wbj-mw-leather',4),
    ('wbj-mens-watches','Steel Strap','wbj-mw-steel',5),
    ('wbj-womens-watches','Analog','wbj-ww-analog',1),
    ('wbj-womens-watches','Digital','wbj-ww-digital',2),
    ('wbj-womens-watches','Bracelet Watches','wbj-ww-bracelet',3),
    ('wbj-womens-bags','Handbags','wbj-wb-handbags',1),
    ('wbj-womens-bags','Shoulder Bags','wbj-wb-shoulder',2),
    ('wbj-womens-bags','Clutches','wbj-wb-clutches',3),
    ('wbj-womens-bags','Tote Bags','wbj-wb-tote',4),
    ('wbj-fashion-jewellery','Earrings','wbj-fj-earrings',1),
    ('wbj-fashion-jewellery','Necklaces','wbj-fj-necklaces',2),
    ('wbj-fashion-jewellery','Rings','wbj-fj-rings',3),
    ('wbj-fashion-jewellery','Bangles','wbj-fj-bangles',4),
    ('wbj-fashion-jewellery','Anklets','wbj-fj-anklets',5)
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT l.name, l.slug, p.id, l.sort_order
FROM l3 l
JOIN public.categories p ON p.slug = l.parent_slug
ON CONFLICT (slug) DO NOTHING;


-- File: 20260710134647_3df05089-2d5a-4bdf-a43c-96a4ba13e701.sql

-- Restrict vendor updates on orders to only status-related fields.
-- Admins and service_role bypass this restriction.
CREATE OR REPLACE FUNCTION public.prevent_vendor_order_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF app_private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only apply to vendor owner of the order; other roles are governed by their own policies.
  IF NEW.vendor_id IS NULL OR NEW.vendor_id <> app_private.get_my_vendor_id() THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_name    IS DISTINCT FROM OLD.customer_name    THEN RAISE EXCEPTION 'Vendors cannot change customer_name'; END IF;
  IF NEW.customer_phone   IS DISTINCT FROM OLD.customer_phone   THEN RAISE EXCEPTION 'Vendors cannot change customer_phone'; END IF;
  IF NEW.customer_email   IS DISTINCT FROM OLD.customer_email   THEN RAISE EXCEPTION 'Vendors cannot change customer_email'; END IF;
  IF NEW.address          IS DISTINCT FROM OLD.address          THEN RAISE EXCEPTION 'Vendors cannot change address'; END IF;
  IF NEW.district         IS DISTINCT FROM OLD.district         THEN RAISE EXCEPTION 'Vendors cannot change district'; END IF;
  IF NEW.thana            IS DISTINCT FROM OLD.thana            THEN RAISE EXCEPTION 'Vendors cannot change thana'; END IF;
  IF NEW.items            IS DISTINCT FROM OLD.items            THEN RAISE EXCEPTION 'Vendors cannot change items'; END IF;
  IF NEW.subtotal         IS DISTINCT FROM OLD.subtotal         THEN RAISE EXCEPTION 'Vendors cannot change subtotal'; END IF;
  IF NEW.delivery_fee     IS DISTINCT FROM OLD.delivery_fee     THEN RAISE EXCEPTION 'Vendors cannot change delivery_fee'; END IF;
  IF NEW.total            IS DISTINCT FROM OLD.total            THEN RAISE EXCEPTION 'Vendors cannot change total'; END IF;
  IF NEW.payment_method   IS DISTINCT FROM OLD.payment_method   THEN RAISE EXCEPTION 'Vendors cannot change payment_method'; END IF;
  IF NEW.payment_type     IS DISTINCT FROM OLD.payment_type     THEN RAISE EXCEPTION 'Vendors cannot change payment_type'; END IF;
  IF NEW.txn_id           IS DISTINCT FROM OLD.txn_id           THEN RAISE EXCEPTION 'Vendors cannot change txn_id'; END IF;
  IF NEW.sender_phone     IS DISTINCT FROM OLD.sender_phone     THEN RAISE EXCEPTION 'Vendors cannot change sender_phone'; END IF;
  IF NEW.paid_amount      IS DISTINCT FROM OLD.paid_amount      THEN RAISE EXCEPTION 'Vendors cannot change paid_amount'; END IF;
  IF NEW.order_number     IS DISTINCT FROM OLD.order_number     THEN RAISE EXCEPTION 'Vendors cannot change order_number'; END IF;
  IF NEW.user_id          IS DISTINCT FROM OLD.user_id          THEN RAISE EXCEPTION 'Vendors cannot change user_id'; END IF;
  IF NEW.vendor_id        IS DISTINCT FROM OLD.vendor_id        THEN RAISE EXCEPTION 'Vendors cannot change vendor_id'; END IF;
  IF NEW.affiliate_id     IS DISTINCT FROM OLD.affiliate_id     THEN RAISE EXCEPTION 'Vendors cannot change affiliate_id'; END IF;
  IF NEW.affiliate_code   IS DISTINCT FROM OLD.affiliate_code   THEN RAISE EXCEPTION 'Vendors cannot change affiliate_code'; END IF;
  IF NEW.created_at       IS DISTINCT FROM OLD.created_at       THEN RAISE EXCEPTION 'Vendors cannot change created_at'; END IF;

  -- Optional discount/coupon fields (guard via to_jsonb to tolerate missing columns).
  IF (to_jsonb(NEW) ? 'discount')    AND (to_jsonb(NEW)->>'discount')    IS DISTINCT FROM (to_jsonb(OLD)->>'discount')    THEN RAISE EXCEPTION 'Vendors cannot change discount'; END IF;
  IF (to_jsonb(NEW) ? 'coupon_code') AND (to_jsonb(NEW)->>'coupon_code') IS DISTINCT FROM (to_jsonb(OLD)->>'coupon_code') THEN RAISE EXCEPTION 'Vendors cannot change coupon_code'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vendor_order_field_changes ON public.orders;
CREATE TRIGGER trg_prevent_vendor_order_field_changes
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_order_field_changes();


-- File: 20260713063539_ef22f9ba-710f-4962-832a-de7038292198.sql

-- Add dropshipper role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dropshipper';


-- File: 20260713063651_6ba99911-ad31-4f32-96ac-330c71a2d19e.sql

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


-- File: 20260713064842_3e63a168-1ec3-425f-8423-e816f6d0f36d.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;
GRANT SELECT ON public.dropshippers TO anon;
GRANT ALL ON public.dropshippers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_products TO authenticated;
GRANT SELECT ON public.dropshipper_products TO anon;
GRANT ALL ON public.dropshipper_products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_earnings TO authenticated;
GRANT ALL ON public.dropshipper_earnings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshipper_payouts TO authenticated;
GRANT ALL ON public.dropshipper_payouts TO service_role;

GRANT SELECT, INSERT ON public.dropshipper_clicks TO authenticated, anon;
GRANT ALL ON public.dropshipper_clicks TO service_role;


-- File: 20260713082120_8b04550f-1385-431c-89af-7283d8acd3f4.sql

-- Delete all orders and related records
DELETE FROM public.order_status_history;
DELETE FROM public.affiliate_commissions;
DELETE FROM public.dropshipper_earnings;
DELETE FROM public.orders;

-- Reset aggregate counters
UPDATE public.vendors SET total_sales = 0, total_orders = 0;
UPDATE public.dropshippers SET total_orders = 0, total_earned = 0, total_paid = 0;
UPDATE public.affiliates SET total_orders = 0, total_earned = 0, total_paid = 0;


-- File: 20260713083012_b05df333-2063-4cc0-a44e-901c14fd8ee5.sql
GRANT EXECUTE ON FUNCTION public.attribute_order_to_dropshipper(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_order_to_affiliate(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_order_to_affiliate(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_dropshipper_click(text, text, text, text, text) TO anon, authenticated;

-- File: 20260713083141_cd036d17-8ccf-428a-b472-99740e05c4f5.sql
CREATE OR REPLACE FUNCTION public.admin_get_user_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE em text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  SELECT email INTO em FROM auth.users WHERE id = _user_id LIMIT 1;
  RETURN em;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_user_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;

-- File: 20260713083431_d704309c-d489-4e3b-ad07-a55282ec8bd2.sql
DELETE FROM public.order_status_history;
DELETE FROM public.affiliate_commissions;
DELETE FROM public.dropshipper_earnings;
DELETE FROM public.orders;
UPDATE public.vendors SET total_sales = 0, total_orders = 0;
UPDATE public.dropshippers SET total_orders = 0, total_earned = 0, total_paid = 0;
UPDATE public.affiliates SET total_orders = 0, total_earned = 0, total_paid = 0;

-- File: 20260713083952_9ee4dfd2-0975-4cff-b4f1-47c88bac20f6.sql
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
    RAISE EXCEPTION 'Minimum payout is à§³%', COALESCE(s.min_payout, 500);
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
    RAISE EXCEPTION 'Requested amount exceeds available balance (à§³%)', available;
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

-- File: 20260713090849_caa0a0ea-5e57-4e3f-a8e3-70e616353507.sql
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are publicly readable"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id, settings) VALUES (1, '{
  "brand": {
    "name": "Bazar BD",
    "tagline": "Bangladesh''s premium online marketplace",
    "logo_url": "",
    "favicon_url": ""
  },
  "header": {
    "top_bar_enabled": true,
    "top_bar_text": "Free delivery on orders over à§³2000 â€” Shop now!",
    "nav_links": [
      {"label": "Home", "href": "/", "sort": 1},
      {"label": "Categories", "href": "/categories", "sort": 2},
      {"label": "Dropshipping", "href": "/dropshipping", "sort": 3},
      {"label": "Become a Vendor", "href": "/become-vendor", "sort": 4}
    ],
    "show_search": true,
    "show_wishlist": true,
    "show_cart": true,
    "show_account": true
  },
  "footer": {
    "columns": [
      {"title": "Customer Care", "links": [
        {"label": "Help Center", "href": "#"},
        {"label": "How to Buy", "href": "#"},
        {"label": "Returns & Refunds", "href": "#"},
        {"label": "Contact Us", "href": "#"}
      ]},
      {"title": "Bazar", "links": [
        {"label": "About Bazar", "href": "#"},
        {"label": "Careers", "href": "#"},
        {"label": "Bazar Blog", "href": "#"},
        {"label": "Press", "href": "#"}
      ]}
    ],
    "payment_badges": [
      {"label": "bKash", "bg": "#E2136E", "fg": "#ffffff"},
      {"label": "Nagad", "bg": "#EC1C24", "fg": "#ffffff"},
      {"label": "Rocket", "bg": "#8B2C8B", "fg": "#ffffff"},
      {"label": "VISA", "bg": "#1A1F71", "fg": "#F7B600"},
      {"label": "MasterCard", "bg": "#ffffff", "fg": "#EB001B"},
      {"label": "COD", "bg": "#16a34a", "fg": "#ffffff"}
    ],
    "app_links": {
      "app_store": "",
      "google_play": ""
    },
    "contact": {
      "email": "support@bazar-bd.com",
      "phone": "+880 1XXX-XXXXXX",
      "address": "Dhaka, Bangladesh"
    },
    "social": {
      "facebook": "",
      "instagram": "",
      "youtube": "",
      "twitter": ""
    },
    "copyright_text": "Â© Bazar Clone â€” Demo storefront built with Lovable."
  }
}'::jsonb);

-- File: 20260713091721_42fd8034-c2d1-4ad0-8d81-b640d3105534.sql

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS button_label text,
  ADD COLUMN IF NOT EXISTS button_link text;

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL DEFAULT 'top_bar',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  link_url text,
  button_label text,
  bg_color text NOT NULL DEFAULT '#7c3aed',
  text_color text NOT NULL DEFAULT '#ffffff',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promotions"
  ON public.promotions FOR SELECT
  USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins can view all promotions"
  ON public.promotions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage promotions"
  ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- File: 20260713092645_717b60f3-ef40-4170-a16b-0c4271ccbd52.sql

-- ============ affiliate_settings ============
DROP POLICY IF EXISTS "settings public read" ON public.affiliate_settings;

CREATE POLICY "settings admin read"
  ON public.affiliate_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, min_payout, cookie_days, terms
  FROM public.affiliate_settings
  WHERE id = 1;

-- The view runs as the caller (security_invoker). To let anon/authenticated
-- read it, add a permissive SELECT policy scoped to id=1 on the base table
-- limited to the safe columns (all rows are singleton id=1).
CREATE POLICY "settings public read via view"
  ON public.affiliate_settings FOR SELECT
  USING (id = 1);

-- Revoke default column privileges on the base table from anon and grant
-- only the safe columns; then the direct-table SELECT can only return safe
-- columns even if a client queries the base table.
REVOKE SELECT ON public.affiliate_settings FROM anon;
REVOKE SELECT ON public.affiliate_settings FROM authenticated;
GRANT SELECT (id, is_enabled, commission_pct, min_payout, cookie_days, terms)
  ON public.affiliate_settings TO anon, authenticated;
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

-- ============ dropshippers ============
DROP POLICY IF EXISTS "public can view approved dropshippers" ON public.dropshippers;

CREATE OR REPLACE VIEW public.dropshippers_public
WITH (security_invoker = on) AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';

-- Column-level grants: only safe columns are readable via the base table
-- for anon/authenticated. Sensitive columns (phone, whatsapp, payout_method,
-- payout_number, etc.) are not granted, so they cannot be selected even if
-- someone queries the base table directly.
REVOKE SELECT ON public.dropshippers FROM anon;
GRANT SELECT (id, code, store_name, store_slug, logo_url, banner_url, bio, status)
  ON public.dropshippers TO anon;
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- Re-add the permissive row filter for approved rows so anon can still read
-- the safe columns of approved dropshippers via the view.
CREATE POLICY "public safe columns of approved dropshippers"
  ON public.dropshippers FOR SELECT
  USING (status = 'approved');


-- File: 20260713092725_2f1529cd-f8ce-4278-b5b2-c06ab76cea9a.sql

-- Undo the interim policy so anon/authenticated can no longer touch base tables directly
DROP POLICY IF EXISTS "settings public read via view" ON public.affiliate_settings;
DROP POLICY IF EXISTS "public safe columns of approved dropshippers" ON public.dropshippers;

-- Recreate views WITHOUT security_invoker so they run as the view owner and
-- bypass RLS on the base tables (they already restrict columns and rows).
DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public AS
  SELECT id, is_enabled, commission_pct, min_payout, cookie_days, terms
  FROM public.affiliate_settings
  WHERE id = 1;

DROP VIEW IF EXISTS public.dropshippers_public;
CREATE VIEW public.dropshippers_public AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';

-- Views are the ONLY anon-facing surface for these tables
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- Base-table privileges: revoke anon entirely; authenticated keeps table-level
-- privileges but RLS restricts to owner/admin.
REVOKE ALL ON public.affiliate_settings FROM anon;
REVOKE ALL ON public.dropshippers FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;


-- File: 20260713092818_8f476ff7-27e7-49f2-a86d-b0ea4d442445.sql

-- Replace views with security_invoker=on to satisfy the linter
DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, min_payout, cookie_days, terms
  FROM public.affiliate_settings
  WHERE id = 1;

DROP VIEW IF EXISTS public.dropshippers_public;
CREATE VIEW public.dropshippers_public
WITH (security_invoker = on) AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';

-- ============ affiliate_settings ============
-- The view runs as the caller. Add a permissive SELECT policy limited to
-- id=1 so the view can be read; column-level grants restrict what columns
-- anon can actually read.
DROP POLICY IF EXISTS "settings public read via view" ON public.affiliate_settings;
CREATE POLICY "settings public read via view"
  ON public.affiliate_settings FOR SELECT
  USING (id = 1);

-- anon: only the safe columns
GRANT SELECT (id, is_enabled, commission_pct, cookie_days)
  ON public.affiliate_settings TO anon;
GRANT SELECT (id, is_enabled, commission_pct, min_payout, cookie_days, terms)
  ON public.affiliate_settings TO authenticated;

GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

-- ============ dropshippers ============
DROP POLICY IF EXISTS "public safe columns of approved dropshippers" ON public.dropshippers;
CREATE POLICY "public safe columns of approved dropshippers"
  ON public.dropshippers FOR SELECT
  USING (status = 'approved');

-- anon: only safe storefront columns
GRANT SELECT (id, code, store_name, store_slug, logo_url, banner_url, bio, status)
  ON public.dropshippers TO anon;
-- authenticated retains full column grants (owner/admin need them; RLS still
-- limits which rows non-owners/non-admins can see beyond approved)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;

GRANT SELECT ON public.dropshippers_public TO anon, authenticated;


-- File: 20260713092847_560a7981-b87e-4c77-960a-1afd19d83f5f.sql

DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings
  WHERE id = 1;

GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;


-- File: 20260713093907_d4401aef-d535-4036-88a2-a65fafb90457.sql

-- ============ dropshippers: remove broad public policy; expose only via view ============
DROP POLICY IF EXISTS "public safe columns of approved dropshippers" ON public.dropshippers;
REVOKE ALL ON public.dropshippers FROM anon;
REVOKE ALL ON public.dropshippers FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dropshippers TO authenticated;

DROP VIEW IF EXISTS public.dropshippers_public;
CREATE VIEW public.dropshippers_public AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers
  WHERE status = 'approved';
ALTER VIEW public.dropshippers_public SET (security_invoker = off);
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- ============ affiliate_settings: admin-only base; safe fields via view ============
DROP POLICY IF EXISTS "settings public read via view" ON public.affiliate_settings;
REVOKE ALL ON public.affiliate_settings FROM anon;
REVOKE ALL ON public.affiliate_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_settings TO authenticated;

DROP VIEW IF EXISTS public.affiliate_settings_public;
CREATE VIEW public.affiliate_settings_public AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings
  WHERE id = 1;
ALTER VIEW public.affiliate_settings_public SET (security_invoker = off);
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

-- ============ site_settings: admin-only base; public view exposes safe blob ============
DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.site_settings;
REVOKE ALL ON public.site_settings FROM anon;
REVOKE ALL ON public.site_settings FROM authenticated;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;

CREATE POLICY "Admins can view site settings"
  ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.site_settings_public;
CREATE VIEW public.site_settings_public AS
  SELECT id, settings, updated_at
  FROM public.site_settings
  WHERE id = 1;
ALTER VIEW public.site_settings_public SET (security_invoker = off);
GRANT SELECT ON public.site_settings_public TO anon, authenticated;


-- File: 20260713163847_4a1f2ed3-cdb2-4fbb-8a5b-d679a102c76a.sql
-- Remove WordPress Sync system and all products
DROP TABLE IF EXISTS public.wp_sync_logs CASCADE;
DROP TABLE IF EXISTS public.wp_connections CASCADE;

-- Clean product-dependent references first, then delete all products
DELETE FROM public.dropshipper_products;
DELETE FROM public.wishlists;
DELETE FROM public.reviews;
DELETE FROM public.products;

-- File: 20260713164556_eb073ba5-9b66-4baf-b62e-b113d312f65e.sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropshipper_price numeric NULL;

-- File: 20260714170703_88aafe4f-dd28-470e-822d-b8e884977e8c.sql

DROP FUNCTION IF EXISTS public.get_public_vendor(text);

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.slug = _slug AND v.status = 'approved'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.id = _id AND v.status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_by_id(uuid) TO anon, authenticated;


-- File: 20260714171946_74ed1ed8-2fc0-48a3-8e0e-ed7771625947.sql

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS footer jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS public.get_public_vendor(text);
DROP FUNCTION IF EXISTS public.get_public_vendor_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
 RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.slug = _slug AND v.status = 'approved'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v
  WHERE v.id = _id AND v.status = 'approved'
  LIMIT 1;
$function$;


-- File: 20260716191119_8272f028-0f15-44cf-a4a5-bdec51e9117b.sql
-- 20260628135351 --
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'emransha952@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


-- File: 20260716191202_90c9552a-eb8d-4e4f-8ba6-313212e43ce2.sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10,2),
  image TEXT NOT NULL DEFAULT '',
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_slug TEXT,
  subcategory_slug TEXT,
  brand TEXT,
  stock INT NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  sold_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_products_category ON public.products(category_slug);
CREATE INDEX idx_products_active ON public.products(is_active);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('BZ-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT NOT NULL,
  district TEXT,
  thana TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_type TEXT,
  txn_id TEXT,
  sender_phone TEXT,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- File: 20260716191332_dea76485-4b1b-4fb5-baa5-ec5903c366e5.sql
-- wishlists, reviews, profiles, addresses, coupons, order_status_history
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "user insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update reviews" ON public.reviews FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  date_of_birth date,
  gender text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'emransha952@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  district text NOT NULL,
  thana text NOT NULL,
  address text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  expires_at timestamptz,
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read history" ON public.order_status_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage history" ON public.order_status_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
CREATE POLICY "user view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- storage.objects policies for products bucket
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));

-- banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement TEXT NOT NULL DEFAULT 'hero_slider',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  gradient_from TEXT NOT NULL DEFAULT 'from-violet-500',
  gradient_to TEXT NOT NULL DEFAULT 'to-fuchsia-600',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage banners" ON public.banners
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.banners (placement, title, subtitle, image_url, link_url, sort_order) VALUES
  ('hero_slider', 'Mobile Mega Offer', '', '/src/assets/hero-1.jpg', '/category/electronics', 1),
  ('hero_slider', 'Fashion Bonanza', '', '/src/assets/hero-2.jpg', '/category/fashion-women', 2),
  ('hero_slider', 'Home Essentials', '', '/src/assets/hero-3.jpg', '/category/home', 3);
INSERT INTO public.banners (placement, title, subtitle, link_url, gradient_from, gradient_to, sort_order) VALUES
  ('hero_side', 'Audio Fest', 'From à§³499', '/category/electronic-acc', 'from-violet-500', 'to-fuchsia-600', 1),
  ('hero_side', 'Beauty Week', 'Up to 60% OFF', '/category/beauty', 'from-rose-400', 'to-pink-600', 2);

-- Extra product columns from migration 20260628163207
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS offer_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS warranty TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS return_days INT DEFAULT 7;


-- File: 20260716191356_a0ce1b5d-9ba4-428b-92f9-1fe22f4f22ad.sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- File: 20260716191436_f70189d6-a20d-4cd4-9f9a-02a5d5e8a934.sql
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  banner_url text,
  description text,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  commission_pct numeric NOT NULL DEFAULT 10,
  total_sales numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  rejection_reason text,
  nid_number text,
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Vendor can view own row" ON public.vendors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all vendors" ON public.vendors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User can create own vendor application" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Vendor can update own row" ON public.vendors
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','approved','rejected','suspended'));
CREATE POLICY "Admin can manage vendors" ON public.vendors
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  period_start date,
  period_end date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_payouts TO authenticated;
GRANT ALL ON public.vendor_payouts TO service_role;
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor reads own payouts" ON public.vendor_payouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
  );
CREATE POLICY "Admin manages payouts" ON public.vendor_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vendor_payouts_updated_at BEFORE UPDATE ON public.vendor_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);

CREATE OR REPLACE FUNCTION public.get_my_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE POLICY "Vendor manages own products" ON public.products
  FOR ALL TO authenticated USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());
CREATE POLICY "Vendor reads own orders" ON public.orders
  FOR SELECT TO authenticated USING (vendor_id = public.get_my_vendor_id());
CREATE POLICY "Vendor updates own order status" ON public.orders
  FOR UPDATE TO authenticated USING (vendor_id = public.get_my_vendor_id())
  WITH CHECK (vendor_id = public.get_my_vendor_id());
REVOKE EXECUTE ON FUNCTION public.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated;


-- File: 20260716191618_dca933e9-dba1-4ae6-9178-9292b019a1b9.sql
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION app_private.get_my_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1 $$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_my_vendor_id() TO authenticated, service_role;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS subcategory_name text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS affiliate_id uuid,
  ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS button_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS button_link text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.lookup_order(_order_number text, _phone text)
RETURNS SETOF public.orders LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.orders
   WHERE order_number = _order_number
     AND regexp_replace(customer_phone,'\D','','g') = regexp_replace(_phone,'\D','','g')
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_order(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; new_num text; uid uuid := auth.uid();
BEGIN
  IF _payload IS NULL THEN RAISE EXCEPTION 'payload required'; END IF;
  IF COALESCE(_payload->>'customer_name','') = '' OR COALESCE(_payload->>'customer_phone','') = '' OR COALESCE(_payload->>'address','') = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF jsonb_typeof(_payload->'items') <> 'array' OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;
  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address, district, thana,
    items, subtotal, delivery_fee, total, payment_method, payment_type,
    txn_id, sender_phone, paid_amount, notes, vendor_id, user_id
  ) VALUES (
    _payload->>'customer_name', _payload->>'customer_phone',
    NULLIF(_payload->>'customer_email',''), _payload->>'address',
    NULLIF(_payload->>'district',''), NULLIF(_payload->>'thana',''),
    COALESCE(_payload->'items','[]'::jsonb),
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'delivery_fee')::numeric, 0),
    COALESCE((_payload->>'total')::numeric, 0),
    COALESCE(_payload->>'payment_method','cod'),
    NULLIF(_payload->>'payment_type',''), NULLIF(_payload->>'txn_id',''),
    NULLIF(_payload->>'sender_phone',''),
    COALESCE((_payload->>'paid_amount')::numeric, 0),
    NULLIF(_payload->>'notes',''),
    NULLIF(_payload->>'vendor_id','')::uuid, uid
  )
  RETURNING orders.id, orders.order_number INTO new_id, new_num;
  id := new_id; order_number := new_num; RETURN NEXT;
END; $$;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric, _items jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.coupons%ROWTYPE; discount numeric; base numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE code = upper(trim(_code)) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid coupon code'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'Coupon expired'); END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached'); END IF;
  IF _subtotal < c.min_order THEN RETURN jsonb_build_object('ok', false, 'error', format('Minimum order à§³%s required', c.min_order)); END IF;
  IF c.product_ids IS NOT NULL AND array_length(c.product_ids, 1) > 0 THEN
    IF _items IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'This coupon only works on specific products'); END IF;
    SELECT COALESCE(SUM((i->>'price')::numeric * (i->>'qty')::numeric), 0) INTO base
      FROM jsonb_array_elements(_items) AS i WHERE (i->>'id') = ANY(c.product_ids);
    IF base <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'This coupon does not apply to any item in your cart'); END IF;
  ELSE base := _subtotal; END IF;
  IF c.discount_type = 'percent' THEN discount := round((base * c.discount_value) / 100);
  ELSE discount := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL THEN discount := least(discount, c.max_discount); END IF;
  discount := least(discount, base);
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', discount);
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE (id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text,
  status text, commission_pct numeric, total_sales numeric, total_orders integer, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.created_at, v.updated_at
  FROM public.vendors v WHERE v.slug = _slug AND v.status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;

-- Storage policies for products bucket
CREATE POLICY "Public read products bucket" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'products');
CREATE POLICY "Authenticated upload own folder products" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated update own folder products" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete own folder products" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);


-- File: 20260716191649_caf0ccc9-bb97-4f53-bafb-8ae50ea675bb.sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dropshipper';

-- File: 20260716191733_984b78d1-530f-4603-abbb-004a8c16a9fe.sql
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


-- File: 20260716191822_b6bbff24-e995-4850-90b9-77384146b3b1.sql
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
CREATE POLICY "aff settings read" ON public.affiliate_settings FOR SELECT USING (true);
CREATE POLICY "aff settings admin write" ON public.affiliate_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff self read" ON public.affiliates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "aff self insert" ON public.affiliates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "aff self update" ON public.affiliates FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "aff admin all" ON public.affiliates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  landing_path TEXT, referer TEXT, user_agent TEXT, product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.affiliate_clicks(affiliate_id, created_at DESC);
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff clicks read" ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

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
CREATE POLICY "ref read" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_total NUMERIC(12,2) NOT NULL,
  commission_pct NUMERIC(6,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  notes TEXT, product_id text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.affiliate_commissions(affiliate_id, created_at DESC);
GRANT SELECT, INSERT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com read" ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "com admin write" ON public.affiliate_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL, method TEXT, details TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected')),
  txn_ref TEXT, admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout self insert" ON public.affiliate_payouts FOR INSERT TO authenticated
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid() AND status = 'approved'));
CREATE POLICY "payout read" ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "payout admin write" ON public.affiliate_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FK for orders.affiliate_id
ALTER TABLE public.orders
  ADD CONSTRAINT orders_affiliate_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;


-- File: 20260716192011_01e53c92-024a-4dd7-b570-89c6e0289cc6.sql
CREATE TABLE public.dropshipping_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  default_commission_pct numeric NOT NULL DEFAULT 0,
  min_payout numeric NOT NULL DEFAULT 500,
  cookie_days integer NOT NULL DEFAULT 30,
  auto_approve_apps boolean NOT NULL DEFAULT false,
  auto_approve_earnings boolean NOT NULL DEFAULT true,
  allowed_payout_methods text[] NOT NULL DEFAULT ARRAY['bkash','nagad','rocket','bank'],
  terms_md text, hero_title text, hero_subtitle text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dropshipping_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.dropshipping_settings TO anon, authenticated;
GRANT ALL ON public.dropshipping_settings TO service_role;
ALTER TABLE public.dropshipping_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds settings read" ON public.dropshipping_settings FOR SELECT USING (true);
CREATE POLICY "ds settings admin write" ON public.dropshipping_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.dropshipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.dropshipping_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, body_md text,
  tone text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dropshipping_announcements TO authenticated;
GRANT ALL ON public.dropshipping_announcements TO service_role;
ALTER TABLE public.dropshipping_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann read" ON public.dropshipping_announcements FOR SELECT TO authenticated USING (
  (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
  OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ann admin manage" ON public.dropshipping_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.dropshipping_announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dropshippers
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pixel_id text,
  ADD COLUMN IF NOT EXISTS ga_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropshipping_enabled boolean NOT NULL DEFAULT true;

-- site_settings
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site settings admin read" ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "site settings admin update" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (id, settings) VALUES (1, '{"brand":{"name":"Bazar BD","tagline":"Bangladesh premium marketplace","logo_url":"","favicon_url":""},"header":{"top_bar_enabled":true,"top_bar_text":"Free delivery over à§³2000","nav_links":[{"label":"Home","href":"/","sort":1},{"label":"Categories","href":"/categories","sort":2}],"show_search":true,"show_wishlist":true,"show_cart":true,"show_account":true},"footer":{"columns":[],"payment_badges":[],"app_links":{"app_store":"","google_play":""},"contact":{"email":"","phone":"","address":""},"social":{"facebook":"","instagram":"","youtube":"","twitter":""},"copyright_text":"Â© Bazar"}}'::jsonb);

CREATE VIEW public.site_settings_public AS
  SELECT id, settings, updated_at FROM public.site_settings WHERE id = 1;
ALTER VIEW public.site_settings_public SET (security_invoker = off);
GRANT SELECT ON public.site_settings_public TO anon, authenticated;

CREATE VIEW public.affiliate_settings_public
WITH (security_invoker = on) AS
  SELECT id, is_enabled, commission_pct, cookie_days
  FROM public.affiliate_settings WHERE id = 1;
GRANT SELECT ON public.affiliate_settings_public TO anon, authenticated;

CREATE VIEW public.dropshippers_public AS
  SELECT id, code, store_name, store_slug, logo_url, banner_url, bio, status
  FROM public.dropshippers WHERE status = 'approved';
ALTER VIEW public.dropshippers_public SET (security_invoker = off);
GRANT SELECT ON public.dropshippers_public TO anon, authenticated;

-- promotions
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL DEFAULT 'top_bar',
  title text NOT NULL DEFAULT '', message text NOT NULL DEFAULT '',
  link_url text, button_label text,
  bg_color text NOT NULL DEFAULT '#7c3aed', text_color text NOT NULL DEFAULT '#ffffff',
  sort_order int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo public read" ON public.promotions FOR SELECT USING (
  active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "promo admin read" ON public.promotions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "promo admin manage" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER promotions_set_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- vendor.footer
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS footer jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Recreate get_public_vendor with footer field
DROP FUNCTION IF EXISTS public.get_public_vendor(text);
CREATE OR REPLACE FUNCTION public.get_public_vendor(_slug text)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v WHERE v.slug = _slug AND v.status = 'approved' LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.get_public_vendor_by_id(_id uuid)
RETURNS TABLE(id uuid, user_id uuid, store_name text, slug text, logo_url text, banner_url text, description text, status text, commission_pct numeric, total_sales numeric, total_orders integer, phone text, address text, footer jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT v.id, v.user_id, v.store_name, v.slug, v.logo_url, v.banner_url, v.description,
         v.status, v.commission_pct, v.total_sales, v.total_orders, v.phone, v.address, v.footer,
         v.created_at, v.updated_at
  FROM public.vendors v WHERE v.id = _id AND v.status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_vendor(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vendor_by_id(uuid) TO anon, authenticated;

-- affiliate_settings adjust anon grants (column-level)
REVOKE ALL ON public.affiliate_settings FROM anon;
GRANT SELECT (id, is_enabled, commission_pct, cookie_days) ON public.affiliate_settings TO anon;


-- File: 20260716192810_fc1697f3-f54c-4306-ac06-54508673db2b.sql
-- Restore seed data lost during database reset

UPDATE public.products SET category_slug = NULL, category_name = NULL, subcategory_slug = NULL, subcategory_name = NULL;
DELETE FROM public.categories;

INSERT INTO public.categories (name, slug, icon, parent_id, sort_order) VALUES
  ('Women''s Fashion',            'womens-fashion',           'ðŸ‘—', NULL, 1),
  ('Men''s Fashion',              'mens-fashion',             'ðŸ‘”', NULL, 2),
  ('Watches, Bags & Jewellery',   'watches-bags-jewellery',   'âŒš', NULL, 3),
  ('Mother & Baby',               'mother-baby',              'ðŸ¼', NULL, 4),
  ('Home & Lifestyle',            'home-lifestyle',           'ðŸ ', NULL, 5),
  ('Electronic Devices',          'electronic-devices',       'ðŸ’»', NULL, 6),
  ('TV & Home Appliances',        'tv-home-appliances',       'ðŸ“º', NULL, 7),
  ('Electronic Accessories',      'electronic-accessories',   'ðŸŽ§', NULL, 8),
  ('Health & Beauty',             'health-beauty',            'ðŸ’„', NULL, 9),
  ('Groceries & Pets',            'groceries-pets',           'ðŸ›’', NULL, 10),
  ('Sports & Outdoor',            'sports-outdoor',           'âš½', NULL, 11),
  ('Automotive & Motorbike',      'automotive-motorbike',     'ðŸš—', NULL, 12);

WITH subs(parent_slug, name, slug, sort_order) AS (
  VALUES
    ('womens-fashion','Muslim Wear','womens-fashion-muslim-wear',1),
    ('womens-fashion','Sarees','womens-fashion-sarees',2),
    ('womens-fashion','Salwar Kameez','womens-fashion-salwar-kameez',3),
    ('womens-fashion','Kurtis & Tunics','womens-fashion-kurtis-tunics',4),
    ('womens-fashion','Tops','womens-fashion-tops',5),
    ('womens-fashion','Dresses','womens-fashion-dresses',6),
    ('womens-fashion','Traditional Wear','womens-fashion-traditional',7),
    ('womens-fashion','Winter Clothing','womens-fashion-winter',8),
    ('womens-fashion','Lingerie & Sleepwear','womens-fashion-lingerie',9),
    ('womens-fashion','Shoes','womens-fashion-shoes',10),
    ('womens-fashion','Sandals','womens-fashion-sandals',11),
    ('womens-fashion','Sportswear','womens-fashion-sportswear',12),
    ('womens-fashion','Accessories','womens-fashion-accessories',13),
    ('mens-fashion','T-Shirts','mens-fashion-tshirts',1),
    ('mens-fashion','Polo Shirts','mens-fashion-polo',2),
    ('mens-fashion','Shirts','mens-fashion-shirts',3),
    ('mens-fashion','Panjabi & Fatua','mens-fashion-panjabi',4),
    ('mens-fashion','Pants','mens-fashion-pants',5),
    ('mens-fashion','Jeans','mens-fashion-jeans',6),
    ('mens-fashion','Shorts','mens-fashion-shorts',7),
    ('mens-fashion','Traditional Wear','mens-fashion-traditional',8),
    ('mens-fashion','Winter Clothing','mens-fashion-winter',9),
    ('mens-fashion','Innerwear & Sleepwear','mens-fashion-innerwear',10),
    ('mens-fashion','Formal Shoes','mens-fashion-formal-shoes',11),
    ('mens-fashion','Sneakers','mens-fashion-sneakers',12),
    ('mens-fashion','Sandals & Flip-Flops','mens-fashion-sandals',13),
    ('mens-fashion','Sportswear','mens-fashion-sportswear',14),
    ('mens-fashion','Accessories','mens-fashion-accessories',15),
    ('watches-bags-jewellery','Men''s Watches','wbj-mens-watches',1),
    ('watches-bags-jewellery','Women''s Watches','wbj-womens-watches',2),
    ('watches-bags-jewellery','Kids Watches','wbj-kids-watches',3),
    ('watches-bags-jewellery','Sunglasses & Eyewear','wbj-eyewear',4),
    ('watches-bags-jewellery','Women''s Bags','wbj-womens-bags',5),
    ('watches-bags-jewellery','Men''s Bags','wbj-mens-bags',6),
    ('watches-bags-jewellery','Backpacks','wbj-backpacks',7),
    ('watches-bags-jewellery','Luggage','wbj-luggage',8),
    ('watches-bags-jewellery','Fashion Jewellery','wbj-fashion-jewellery',9),
    ('watches-bags-jewellery','Fine Jewellery','wbj-fine-jewellery',10),
    ('watches-bags-jewellery','Wallets','wbj-wallets',11),
    ('mother-baby','Diapers & Potty','mb-diapers',1),
    ('mother-baby','Baby Feeding','mb-feeding',2),
    ('mother-baby','Milk Formula','mb-milk-formula',3),
    ('mother-baby','Baby & Toddler Food','mb-toddler-food',4),
    ('mother-baby','Baby Personal Care','mb-baby-care',5),
    ('mother-baby','Baby Clothing','mb-baby-clothing',6),
    ('mother-baby','Baby Gear','mb-gear',7),
    ('mother-baby','Nursery','mb-nursery',8),
    ('mother-baby','Maternity Care','mb-maternity',9),
    ('mother-baby','Toys & Games','mb-toys-games',10),
    ('mother-baby','Educational Toys','mb-educational-toys',11),
    ('home-lifestyle','Bedding & Bath','home-bedding-bath',1),
    ('home-lifestyle','Home Decor','home-decor',2),
    ('home-lifestyle','Kitchenware','home-kitchenware',3),
    ('home-lifestyle','Cookware','home-cookware',4),
    ('home-lifestyle','Dining & Serveware','home-dining',5),
    ('home-lifestyle','Furniture','home-furniture',6),
    ('home-lifestyle','Lighting','home-lighting',7),
    ('home-lifestyle','Tools & DIY','home-tools-diy',8),
    ('home-lifestyle','Laundry & Cleaning','home-laundry-cleaning',9),
    ('home-lifestyle','Storage & Organization','home-storage',10),
    ('home-lifestyle','Stationery & Crafts','home-stationery',11),
    ('home-lifestyle','Books','home-books',12),
    ('home-lifestyle','Party Supplies','home-party',13),
    ('electronic-devices','Mobiles','ed-mobiles',1),
    ('electronic-devices','Tablets','ed-tablets',2),
    ('electronic-devices','Laptops','ed-laptops',3),
    ('electronic-devices','Desktops','ed-desktops',4),
    ('electronic-devices','Gaming Consoles','ed-gaming-consoles',5),
    ('electronic-devices','DSLR & Mirrorless Cameras','ed-dslr',6),
    ('electronic-devices','Point & Shoot Cameras','ed-cameras',7),
    ('electronic-devices','Action Cameras','ed-action-cams',8),
    ('electronic-devices','Drones','ed-drones',9),
    ('electronic-devices','Wearable Tech','ed-wearable',10),
    ('electronic-devices','Smart Watches','ed-smartwatch',11),
    ('tv-home-appliances','Televisions','tvha-tvs',1),
    ('tv-home-appliances','Home Audio','tvha-home-audio',2),
    ('tv-home-appliances','Projectors','tvha-projectors',3),
    ('tv-home-appliances','Air Conditioners','tvha-ac',4),
    ('tv-home-appliances','Refrigerators','tvha-fridge',5),
    ('tv-home-appliances','Freezers','tvha-freezer',6),
    ('tv-home-appliances','Washing Machines','tvha-washing',7),
    ('tv-home-appliances','Kitchen Appliances','tvha-kitchen-app',8),
    ('tv-home-appliances','Microwaves & Ovens','tvha-microwaves',9),
    ('tv-home-appliances','Water Purifiers','tvha-water-purifiers',10),
    ('tv-home-appliances','Vacuum Cleaners','tvha-vacuum',11),
    ('tv-home-appliances','Fans','tvha-fans',12),
    ('tv-home-appliances','Irons','tvha-irons',13),
    ('tv-home-appliances','Personal Care Appliances','tvha-personal',14),
    ('electronic-accessories','Mobile Accessories','ea-mobile-acc',1),
    ('electronic-accessories','Phone Cases','ea-phone-cases',2),
    ('electronic-accessories','Screen Protectors','ea-screen-prot',3),
    ('electronic-accessories','Chargers & Cables','ea-chargers',4),
    ('electronic-accessories','Power Banks','ea-power-banks',5),
    ('electronic-accessories','Headphones & Earbuds','ea-headphones',6),
    ('electronic-accessories','Bluetooth Speakers','ea-bt-speakers',7),
    ('electronic-accessories','Wearable Accessories','ea-wearable-acc',8),
    ('electronic-accessories','Camera Accessories','ea-camera-acc',9),
    ('electronic-accessories','Storage & Memory','ea-storage',10),
    ('electronic-accessories','Computer Accessories','ea-computer-acc',11),
    ('electronic-accessories','Printers & Ink','ea-printers',12),
    ('electronic-accessories','Networking Devices','ea-networking',13),
    ('electronic-accessories','Gaming Accessories','ea-gaming-acc',14),
    ('health-beauty','Skin Care','hb-skincare',1),
    ('health-beauty','Hair Care','hb-haircare',2),
    ('health-beauty','Makeup','hb-makeup',3),
    ('health-beauty','Fragrances','hb-fragrances',4),
    ('health-beauty','Bath & Body','hb-bath-body',5),
    ('health-beauty','Men''s Grooming','hb-mens-grooming',6),
    ('health-beauty','Beauty Tools','hb-beauty-tools',7),
    ('health-beauty','Personal Care','hb-personal-care',8),
    ('health-beauty','Health Supplements','hb-supplements',9),
    ('health-beauty','Medical Supplies','hb-medical',10),
    ('health-beauty','Sexual Wellness','hb-sexual-wellness',11),
    ('health-beauty','Oral Care','hb-oral-care',12),
    ('groceries-pets','Rice, Pasta & Noodles','gp-rice-pasta',1),
    ('groceries-pets','Cooking Essentials','gp-cooking',2),
    ('groceries-pets','Snacks','gp-snacks',3),
    ('groceries-pets','Beverages','gp-beverages',4),
    ('groceries-pets','Breakfast Foods','gp-breakfast',5),
    ('groceries-pets','Dairy & Chilled','gp-dairy',6),
    ('groceries-pets','Frozen Foods','gp-frozen',7),
    ('groceries-pets','Baking Needs','gp-baking',8),
    ('groceries-pets','Canned & Jarred','gp-canned',9),
    ('groceries-pets','Dog Food & Supplies','gp-dog-supplies',10),
    ('groceries-pets','Cat Food & Supplies','gp-cat-supplies',11),
    ('groceries-pets','Fish & Aquatics','gp-fish-aquatics',12),
    ('groceries-pets','Bird Supplies','gp-bird-supplies',13),
    ('sports-outdoor','Exercise & Fitness','so-fitness',1),
    ('sports-outdoor','Cycling','so-cycling',2),
    ('sports-outdoor','Team Sports','so-team-sports',3),
    ('sports-outdoor','Cricket','so-cricket',4),
    ('sports-outdoor','Football','so-football',5),
    ('sports-outdoor','Badminton','so-badminton',6),
    ('sports-outdoor','Racket Sports','so-racket',7),
    ('sports-outdoor','Water Sports','so-water-sports',8),
    ('sports-outdoor','Camping & Hiking','so-camping',9),
    ('sports-outdoor','Fishing','so-fishing',10),
    ('sports-outdoor','Sports Shoes','so-shoes',11),
    ('sports-outdoor','Sports Apparel','so-apparel',12),
    ('sports-outdoor','Sports Accessories','so-accessories',13),
    ('automotive-motorbike','Automotive Tools','am-tools',1),
    ('automotive-motorbike','Car Care','am-car-care',2),
    ('automotive-motorbike','Car Electronics','am-car-electronics',3),
    ('automotive-motorbike','Interior Accessories','am-interior',4),
    ('automotive-motorbike','Exterior Accessories','am-exterior',5),
    ('automotive-motorbike','Car Safety','am-car-safety',6),
    ('automotive-motorbike','Auto Oils & Fluids','am-oils',7),
    ('automotive-motorbike','Auto Parts & Spares','am-parts',8),
    ('automotive-motorbike','Motorbike Helmets','am-helmets',9),
    ('automotive-motorbike','Motorbike Riding Gear','am-riding-gear',10),
    ('automotive-motorbike','Motorbike Accessories','am-moto-acc',11),
    ('automotive-motorbike','Motorbike Parts','am-moto-parts',12),
    ('automotive-motorbike','Motorbike Tyres','am-moto-tyres',13)
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT s.name, s.slug, p.id, s.sort_order
FROM subs s
JOIN public.categories p ON p.slug = s.parent_slug;

WITH l3(parent_slug, name, slug, sort_order) AS (
  VALUES
    ('womens-fashion-sarees','Silk Sarees','wf-sarees-silk',1),
    ('womens-fashion-sarees','Cotton Sarees','wf-sarees-cotton',2),
    ('womens-fashion-sarees','Jamdani','wf-sarees-jamdani',3),
    ('womens-fashion-sarees','Half Silk','wf-sarees-half-silk',4),
    ('womens-fashion-sarees','Georgette','wf-sarees-georgette',5),
    ('womens-fashion-sarees','Party Sarees','wf-sarees-party',6),
    ('womens-fashion-sarees','Wedding Sarees','wf-sarees-wedding',7),
    ('womens-fashion-salwar-kameez','Unstitched','wf-sk-unstitched',1),
    ('womens-fashion-salwar-kameez','Stitched','wf-sk-stitched',2),
    ('womens-fashion-salwar-kameez','Pakistani','wf-sk-pakistani',3),
    ('womens-fashion-salwar-kameez','Indian','wf-sk-indian',4),
    ('womens-fashion-salwar-kameez','Party Wear','wf-sk-party',5),
    ('womens-fashion-muslim-wear','Abayas','wf-mw-abayas',1),
    ('womens-fashion-muslim-wear','Burqas','wf-mw-burqas',2),
    ('womens-fashion-muslim-wear','Hijabs','wf-mw-hijabs',3),
    ('womens-fashion-muslim-wear','Prayer Dresses','wf-mw-prayer',4),
    ('womens-fashion-tops','T-Shirts','wf-tops-tshirts',1),
    ('womens-fashion-tops','Blouses','wf-tops-blouses',2),
    ('womens-fashion-tops','Tank Tops','wf-tops-tanks',3),
    ('womens-fashion-tops','Fatuas','wf-tops-fatuas',4),
    ('womens-fashion-shoes','Heels','wf-shoes-heels',1),
    ('womens-fashion-shoes','Flats','wf-shoes-flats',2),
    ('womens-fashion-shoes','Boots','wf-shoes-boots',3),
    ('womens-fashion-shoes','Sneakers','wf-shoes-sneakers',4),
    ('womens-fashion-shoes','Loafers','wf-shoes-loafers',5),
    ('mens-fashion-tshirts','Half Sleeve','mf-tshirts-half',1),
    ('mens-fashion-tshirts','Full Sleeve','mf-tshirts-full',2),
    ('mens-fashion-tshirts','Graphic Tees','mf-tshirts-graphic',3),
    ('mens-fashion-tshirts','Plain Tees','mf-tshirts-plain',4),
    ('mens-fashion-shirts','Formal Shirts','mf-shirts-formal',1),
    ('mens-fashion-shirts','Casual Shirts','mf-shirts-casual',2),
    ('mens-fashion-shirts','Denim Shirts','mf-shirts-denim',3),
    ('mens-fashion-shirts','Printed Shirts','mf-shirts-printed',4),
    ('mens-fashion-panjabi','Cotton Panjabi','mf-panjabi-cotton',1),
    ('mens-fashion-panjabi','Silk Panjabi','mf-panjabi-silk',2),
    ('mens-fashion-panjabi','Eid Panjabi','mf-panjabi-eid',3),
    ('mens-fashion-panjabi','Kabli','mf-panjabi-kabli',4),
    ('mens-fashion-pants','Formal Pants','mf-pants-formal',1),
    ('mens-fashion-pants','Chinos','mf-pants-chinos',2),
    ('mens-fashion-pants','Cargo Pants','mf-pants-cargo',3),
    ('mens-fashion-pants','Joggers','mf-pants-joggers',4),
    ('mens-fashion-jeans','Slim Fit','mf-jeans-slim',1),
    ('mens-fashion-jeans','Regular Fit','mf-jeans-regular',2),
    ('mens-fashion-jeans','Skinny','mf-jeans-skinny',3),
    ('mens-fashion-jeans','Straight','mf-jeans-straight',4),
    ('mens-fashion-formal-shoes','Oxfords','mf-fs-oxfords',1),
    ('mens-fashion-formal-shoes','Loafers','mf-fs-loafers',2),
    ('mens-fashion-formal-shoes','Derby','mf-fs-derby',3),
    ('mens-fashion-sneakers','Running','mf-sneakers-running',1),
    ('mens-fashion-sneakers','Casual','mf-sneakers-casual',2),
    ('mens-fashion-sneakers','High Tops','mf-sneakers-hightop',3),
    ('ed-mobiles','Samsung','ed-mobiles-samsung',1),
    ('ed-mobiles','Xiaomi','ed-mobiles-xiaomi',2),
    ('ed-mobiles','Realme','ed-mobiles-realme',3),
    ('ed-mobiles','Oppo','ed-mobiles-oppo',4),
    ('ed-mobiles','Vivo','ed-mobiles-vivo',5),
    ('ed-mobiles','Apple iPhone','ed-mobiles-iphone',6),
    ('ed-mobiles','Infinix','ed-mobiles-infinix',7),
    ('ed-mobiles','Tecno','ed-mobiles-tecno',8),
    ('ed-mobiles','Nokia','ed-mobiles-nokia',9),
    ('ed-mobiles','Walton','ed-mobiles-walton',10),
    ('ed-mobiles','Symphony','ed-mobiles-symphony',11),
    ('ed-tablets','Samsung Tablets','ed-tablets-samsung',1),
    ('ed-tablets','Apple iPad','ed-tablets-ipad',2),
    ('ed-tablets','Lenovo Tablets','ed-tablets-lenovo',3),
    ('ed-tablets','Xiaomi Tablets','ed-tablets-xiaomi',4),
    ('ed-tablets','Huawei Tablets','ed-tablets-huawei',5),
    ('ed-laptops','HP','ed-laptops-hp',1),
    ('ed-laptops','Dell','ed-laptops-dell',2),
    ('ed-laptops','Lenovo','ed-laptops-lenovo',3),
    ('ed-laptops','Asus','ed-laptops-asus',4),
    ('ed-laptops','Acer','ed-laptops-acer',5),
    ('ed-laptops','Apple MacBook','ed-laptops-macbook',6),
    ('ed-laptops','MSI','ed-laptops-msi',7),
    ('ed-laptops','Walton Laptops','ed-laptops-walton',8),
    ('ed-laptops','Gaming Laptops','ed-laptops-gaming',9),
    ('ed-smartwatch','Apple Watch','ed-sw-apple',1),
    ('ed-smartwatch','Samsung Galaxy Watch','ed-sw-samsung',2),
    ('ed-smartwatch','Xiaomi Mi Band','ed-sw-xiaomi',3),
    ('ed-smartwatch','Amazfit','ed-sw-amazfit',4),
    ('ed-smartwatch','Fitness Trackers','ed-sw-fitness',5),
    ('ea-headphones','Wireless Earbuds','ea-hp-wireless-earbuds',1),
    ('ea-headphones','Wired Earphones','ea-hp-wired',2),
    ('ea-headphones','Over-Ear Headphones','ea-hp-overear',3),
    ('ea-headphones','Gaming Headsets','ea-hp-gaming',4),
    ('ea-headphones','Neckband Earphones','ea-hp-neckband',5),
    ('ea-headphones','Bluetooth Headsets','ea-hp-bt-headset',6),
    ('ea-power-banks','10000 mAh','ea-pb-10000',1),
    ('ea-power-banks','20000 mAh','ea-pb-20000',2),
    ('ea-power-banks','Fast Charging Power Banks','ea-pb-fast',3),
    ('ea-power-banks','Solar Power Banks','ea-pb-solar',4),
    ('ea-chargers','Fast Chargers','ea-chargers-fast',1),
    ('ea-chargers','Wireless Chargers','ea-chargers-wireless',2),
    ('ea-chargers','USB-C Cables','ea-chargers-usbc',3),
    ('ea-chargers','Lightning Cables','ea-chargers-lightning',4),
    ('ea-chargers','Micro USB Cables','ea-chargers-micro',5),
    ('tvha-tvs','Smart TVs','tvha-tvs-smart',1),
    ('tvha-tvs','4K UHD TVs','tvha-tvs-4k',2),
    ('tvha-tvs','LED TVs','tvha-tvs-led',3),
    ('tvha-tvs','32 Inch','tvha-tvs-32',4),
    ('tvha-tvs','43 Inch','tvha-tvs-43',5),
    ('tvha-tvs','55 Inch','tvha-tvs-55',6),
    ('tvha-tvs','65 Inch','tvha-tvs-65',7),
    ('tvha-ac','Split AC','tvha-ac-split',1),
    ('tvha-ac','Inverter AC','tvha-ac-inverter',2),
    ('tvha-ac','1 Ton','tvha-ac-1ton',3),
    ('tvha-ac','1.5 Ton','tvha-ac-1-5ton',4),
    ('tvha-ac','2 Ton','tvha-ac-2ton',5),
    ('tvha-fridge','Double Door','tvha-fridge-double',1),
    ('tvha-fridge','Single Door','tvha-fridge-single',2),
    ('tvha-fridge','Side By Side','tvha-fridge-sbs',3),
    ('tvha-fridge','Mini Fridge','tvha-fridge-mini',4),
    ('tvha-fans','Ceiling Fans','tvha-fans-ceiling',1),
    ('tvha-fans','Table Fans','tvha-fans-table',2),
    ('tvha-fans','Pedestal Fans','tvha-fans-pedestal',3),
    ('tvha-fans','Rechargeable Fans','tvha-fans-rechargeable',4),
    ('tvha-fans','Exhaust Fans','tvha-fans-exhaust',5),
    ('hb-skincare','Face Wash','hb-skin-facewash',1),
    ('hb-skincare','Moisturizers','hb-skin-moisturizer',2),
    ('hb-skincare','Sunscreen','hb-skin-sunscreen',3),
    ('hb-skincare','Face Serums','hb-skin-serum',4),
    ('hb-skincare','Face Masks','hb-skin-mask',5),
    ('hb-skincare','Toners','hb-skin-toner',6),
    ('hb-skincare','Acne Treatment','hb-skin-acne',7),
    ('hb-makeup','Lipstick','hb-mk-lipstick',1),
    ('hb-makeup','Foundation','hb-mk-foundation',2),
    ('hb-makeup','Eyeliner','hb-mk-eyeliner',3),
    ('hb-makeup','Mascara','hb-mk-mascara',4),
    ('hb-makeup','Eyeshadow','hb-mk-eyeshadow',5),
    ('hb-makeup','Blush','hb-mk-blush',6),
    ('hb-makeup','Nail Polish','hb-mk-nailpolish',7),
    ('hb-haircare','Shampoo','hb-hair-shampoo',1),
    ('hb-haircare','Conditioner','hb-hair-conditioner',2),
    ('hb-haircare','Hair Oil','hb-hair-oil',3),
    ('hb-haircare','Hair Mask','hb-hair-mask',4),
    ('hb-haircare','Hair Color','hb-hair-color',5),
    ('home-furniture','Sofas','home-furn-sofa',1),
    ('home-furniture','Beds','home-furn-bed',2),
    ('home-furniture','Dining Tables','home-furn-dining',3),
    ('home-furniture','Wardrobes','home-furn-wardrobe',4),
    ('home-furniture','Office Chairs','home-furn-office-chair',5),
    ('home-furniture','Study Tables','home-furn-study',6),
    ('home-furniture','Shoe Racks','home-furn-shoerack',7),
    ('home-kitchenware','Pressure Cookers','home-kw-pressure',1),
    ('home-kitchenware','Rice Cookers','home-kw-rice',2),
    ('home-kitchenware','Non-Stick Pans','home-kw-nonstick',3),
    ('home-kitchenware','Knives','home-kw-knives',4),
    ('home-kitchenware','Water Bottles','home-kw-bottles',5),
    ('home-kitchenware','Lunch Boxes','home-kw-lunchbox',6),
    ('gp-beverages','Tea','gp-bev-tea',1),
    ('gp-beverages','Coffee','gp-bev-coffee',2),
    ('gp-beverages','Soft Drinks','gp-bev-softdrinks',3),
    ('gp-beverages','Juices','gp-bev-juices',4),
    ('gp-beverages','Energy Drinks','gp-bev-energy',5),
    ('gp-beverages','Water','gp-bev-water',6),
    ('gp-snacks','Chips & Crisps','gp-snacks-chips',1),
    ('gp-snacks','Biscuits & Cookies','gp-snacks-biscuits',2),
    ('gp-snacks','Chocolates','gp-snacks-chocolate',3),
    ('gp-snacks','Nuts & Dry Fruits','gp-snacks-nuts',4),
    ('gp-snacks','Instant Noodles','gp-snacks-noodles',5),
    ('gp-cooking','Cooking Oil','gp-cook-oil',1),
    ('gp-cooking','Spices','gp-cook-spices',2),
    ('gp-cooking','Salt & Sugar','gp-cook-salt-sugar',3),
    ('gp-cooking','Sauces & Condiments','gp-cook-sauces',4),
    ('gp-cooking','Ghee & Butter','gp-cook-ghee',5),
    ('so-cricket','Cricket Bats','so-cricket-bat',1),
    ('so-cricket','Cricket Balls','so-cricket-ball',2),
    ('so-cricket','Cricket Gloves','so-cricket-gloves',3),
    ('so-cricket','Cricket Pads','so-cricket-pads',4),
    ('so-cricket','Cricket Helmets','so-cricket-helmet',5),
    ('so-football','Footballs','so-football-ball',1),
    ('so-football','Football Boots','so-football-boots',2),
    ('so-football','Football Jerseys','so-football-jersey',3),
    ('so-football','Shin Guards','so-football-shin',4),
    ('so-fitness','Dumbbells','so-fit-dumbbells',1),
    ('so-fitness','Yoga Mats','so-fit-yoga',2),
    ('so-fitness','Treadmills','so-fit-treadmill',3),
    ('so-fitness','Resistance Bands','so-fit-bands',4),
    ('so-fitness','Skipping Ropes','so-fit-skipping',5),
    ('mb-diapers','Newborn Diapers','mb-diapers-newborn',1),
    ('mb-diapers','Small Diapers','mb-diapers-small',2),
    ('mb-diapers','Medium Diapers','mb-diapers-medium',3),
    ('mb-diapers','Large Diapers','mb-diapers-large',4),
    ('mb-diapers','Pants Style Diapers','mb-diapers-pants',5),
    ('mb-baby-clothing','Baby Boy Clothing','mb-clothing-boy',1),
    ('mb-baby-clothing','Baby Girl Clothing','mb-clothing-girl',2),
    ('mb-baby-clothing','Newborn Sets','mb-clothing-newborn',3),
    ('mb-baby-clothing','Baby Winter Wear','mb-clothing-winter',4),
    ('mb-toys-games','Educational Toys','mb-toys-educational',1),
    ('mb-toys-games','Remote Control Toys','mb-toys-rc',2),
    ('mb-toys-games','Dolls & Plush','mb-toys-dolls',3),
    ('mb-toys-games','Building Blocks','mb-toys-blocks',4),
    ('mb-toys-games','Puzzles','mb-toys-puzzles',5),
    ('mb-toys-games','Outdoor Toys','mb-toys-outdoor',6),
    ('am-helmets','Full Face Helmets','am-helmet-fullface',1),
    ('am-helmets','Half Helmets','am-helmet-half',2),
    ('am-helmets','Modular Helmets','am-helmet-modular',3),
    ('am-helmets','Kids Helmets','am-helmet-kids',4),
    ('am-moto-parts','Engine Parts','am-moto-parts-engine',1),
    ('am-moto-parts','Chain & Sprocket','am-moto-parts-chain',2),
    ('am-moto-parts','Brake Parts','am-moto-parts-brake',3),
    ('am-moto-parts','Lights & Indicators','am-moto-parts-lights',4),
    ('am-moto-parts','Mirrors','am-moto-parts-mirrors',5),
    ('wbj-mens-watches','Analog','wbj-mw-analog',1),
    ('wbj-mens-watches','Digital','wbj-mw-digital',2),
    ('wbj-mens-watches','Chronograph','wbj-mw-chrono',3),
    ('wbj-mens-watches','Leather Strap','wbj-mw-leather',4),
    ('wbj-mens-watches','Steel Strap','wbj-mw-steel',5),
    ('wbj-womens-watches','Analog','wbj-ww-analog',1),
    ('wbj-womens-watches','Digital','wbj-ww-digital',2),
    ('wbj-womens-watches','Bracelet Watches','wbj-ww-bracelet',3),
    ('wbj-womens-bags','Handbags','wbj-wb-handbags',1),
    ('wbj-womens-bags','Shoulder Bags','wbj-wb-shoulder',2),
    ('wbj-womens-bags','Clutches','wbj-wb-clutches',3),
    ('wbj-womens-bags','Tote Bags','wbj-wb-tote',4),
    ('wbj-fashion-jewellery','Earrings','wbj-fj-earrings',1),
    ('wbj-fashion-jewellery','Necklaces','wbj-fj-necklaces',2),
    ('wbj-fashion-jewellery','Rings','wbj-fj-rings',3),
    ('wbj-fashion-jewellery','Bangles','wbj-fj-bangles',4),
    ('wbj-fashion-jewellery','Anklets','wbj-fj-anklets',5)
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT l.name, l.slug, p.id, l.sort_order
FROM l3 l
JOIN public.categories p ON p.slug = l.parent_slug
ON CONFLICT (slug) DO NOTHING;

UPDATE public.site_settings SET settings = '{
  "brand": {"name": "Bazar BD", "tagline": "Bangladesh''s premium online marketplace", "logo_url": "", "favicon_url": ""},
  "header": {
    "top_bar_enabled": true,
    "top_bar_text": "Free delivery on orders over à§³2000 â€” Shop now!",
    "nav_links": [
      {"label": "Home", "href": "/", "sort": 1},
      {"label": "Categories", "href": "/categories", "sort": 2},
      {"label": "Dropshipping", "href": "/dropshipping", "sort": 3},
      {"label": "Become a Vendor", "href": "/become-vendor", "sort": 4}
    ],
    "show_search": true, "show_wishlist": true, "show_cart": true, "show_account": true
  },
  "footer": {
    "columns": [
      {"title": "Customer Care", "links": [
        {"label": "Help Center", "href": "#"},
        {"label": "How to Buy", "href": "#"},
        {"label": "Returns & Refunds", "href": "#"},
        {"label": "Contact Us", "href": "#"}
      ]},
      {"title": "Bazar", "links": [
        {"label": "About Bazar", "href": "#"},
        {"label": "Careers", "href": "#"},
        {"label": "Bazar Blog", "href": "#"},
        {"label": "Press", "href": "#"}
      ]}
    ],
    "payment_badges": [
      {"label": "bKash", "bg": "#E2136E", "fg": "#ffffff"},
      {"label": "Nagad", "bg": "#EC1C24", "fg": "#ffffff"},
      {"label": "Rocket", "bg": "#8B2C8B", "fg": "#ffffff"},
      {"label": "VISA", "bg": "#1A1F71", "fg": "#F7B600"},
      {"label": "MasterCard", "bg": "#ffffff", "fg": "#EB001B"},
      {"label": "COD", "bg": "#16a34a", "fg": "#ffffff"}
    ],
    "app_links": {"app_store": "", "google_play": ""},
    "contact": {"email": "support@bazar-bd.com", "phone": "+880 1XXX-XXXXXX", "address": "Dhaka, Bangladesh"},
    "social": {"facebook": "", "instagram": "", "youtube": "", "twitter": ""},
    "copyright_text": "Â© Bazar Clone â€” Demo storefront built with Lovable."
  }
}'::jsonb WHERE id = 1;

-- File: 20260716201113_5c7ff42a-04f9-4005-a51c-ddc39b212ef7.sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- File: 20260716202048_b83de27c-5941-4c2b-a6b4-30dfcb45840d.sql
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'emransha952@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'emransha952@gmail.com',
      crypt('Emran017599@#&*', gen_salt('bf')),
      now(),
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      now(),
      now(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL,
      false
    )
    RETURNING id INTO admin_user_id;
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt('Emran017599@#&*', gen_salt('bf')),
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
      updated_at = now(),
      deleted_at = NULL,
      is_anonymous = false,
      is_sso_user = false
    WHERE id = admin_user_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_user_id,
    admin_user_id::text,
    jsonb_build_object(
      'sub', admin_user_id::text,
      'email', 'emransha952@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        identity_data = EXCLUDED.identity_data,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'), (admin_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (id, full_name)
  VALUES (admin_user_id, '')
  ON CONFLICT (id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'emransha952@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- File: 20260716202242_01c9b552-2c4d-4ee6-9704-4b45437d25f0.sql

-- Remove admin role from anyone who isn't the allowed email
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE lower(email) = 'emransha952@gmail.com');

-- Guard trigger: prevent granting admin to any other account
CREATE OR REPLACE FUNCTION public.enforce_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE em text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT lower(email) INTO em FROM auth.users WHERE id = NEW.user_id;
    IF em IS DISTINCT FROM 'emransha952@gmail.com' THEN
      RAISE EXCEPTION 'admin role is restricted to the designated administrator';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_email_trg ON public.user_roles;
CREATE TRIGGER enforce_admin_email_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_email();

-- Harden has_role: even if an admin row somehow exists, only the allowed email resolves as admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        _role <> 'admin'
        OR EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = _user_id AND lower(u.email) = 'emransha952@gmail.com'
        )
      )
  )
$$;


-- File: 20260717062116_1ee3456e-4b8a-4c34-94c9-edfc69e3e8e0.sql

DROP POLICY IF EXISTS "Public read products bucket" ON storage.objects;
CREATE POLICY "Public read products bucket"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated upload products bucket" ON storage.objects;
CREATE POLICY "Authenticated upload products bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated update products bucket" ON storage.objects;
CREATE POLICY "Authenticated update products bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated delete products bucket" ON storage.objects;
CREATE POLICY "Authenticated delete products bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');


-- File: 20260717064831_e0ed9ef7-4bcc-4ba8-9e07-aa33c55ba908.sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS option_slug text, ADD COLUMN IF NOT EXISTS option_name text;

-- File: 20260717071959_74180922-cdec-4980-a405-ec6d6916dcf0.sql

-- Extend vendors with modern marketplace fields
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS alt_phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS thana text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Bangladesh',
  ADD COLUMN IF NOT EXISTS business_type text,        -- individual | proprietorship | partnership | company
  ADD COLUMN IF NOT EXISTS trade_license text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_routing text,
  ADD COLUMN IF NOT EXISTS mobile_banking_type text,  -- bkash | nagad | rocket | upay | none
  ADD COLUMN IF NOT EXISTS mobile_banking_number text,
  ADD COLUMN IF NOT EXISTS nid_front_url text,
  ADD COLUMN IF NOT EXISTS nid_back_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS main_category text,
  ADD COLUMN IF NOT EXISTS expected_products integer,
  ADD COLUMN IF NOT EXISTS agreed_terms boolean NOT NULL DEFAULT false;


-- File: 20260719181357_a44c6f6f-8dd2-4ccc-9bf9-d483c8339b66.sql

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  from_value text,
  to_value text,
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs (created_at DESC);

-- Generic status-change logger
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_entity text := TG_ARGV[0];
  v_from text;
  v_to text;
BEGIN
  v_from := COALESCE(OLD.status::text, '');
  v_to := COALESCE(NEW.status::text, '');
  IF v_from IS NOT DISTINCT FROM v_to THEN
    RETURN NEW;
  END IF;
  IF v_actor IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  END IF;
  INSERT INTO public.admin_audit_logs (actor_id, actor_email, entity_type, entity_id, action, from_value, to_value, note, metadata)
  VALUES (
    v_actor, v_email, v_entity, NEW.id, 'status_change', v_from, v_to,
    CASE WHEN v_entity = 'dropshipper' AND NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
         THEN NEW.rejection_reason
         WHEN v_entity = 'dropshipper_payout' AND NEW.admin_note IS DISTINCT FROM OLD.admin_note
         THEN NEW.admin_note
         ELSE NULL END,
    jsonb_build_object(
      'txn_reference', to_jsonb(NEW) -> 'txn_reference',
      'paid_at', to_jsonb(NEW) -> 'paid_at'
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_orders_status ON public.orders;
CREATE TRIGGER trg_audit_orders_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('order');

DROP TRIGGER IF EXISTS trg_audit_ds_earnings_status ON public.dropshipper_earnings;
CREATE TRIGGER trg_audit_ds_earnings_status
  AFTER UPDATE OF status ON public.dropshipper_earnings
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('dropshipper_earning');

DROP TRIGGER IF EXISTS trg_audit_ds_payouts_status ON public.dropshipper_payouts;
CREATE TRIGGER trg_audit_ds_payouts_status
  AFTER UPDATE OF status ON public.dropshipper_payouts
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('dropshipper_payout');

DROP TRIGGER IF EXISTS trg_audit_ds_status ON public.dropshippers;
CREATE TRIGGER trg_audit_ds_status
  AFTER UPDATE OF status ON public.dropshippers
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('dropshipper');


-- File: 20260720095221_58e943b7-6855-432b-bbd9-9e86ab2b6946.sql

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


-- File: 20260720105959_3a3b52ac-3f2a-4912-a8e7-63247c6e875a.sql
ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- File: 20260720110502_0b72c00a-b09f-4fa0-9b18-e2450bf7fc86.sql
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- File: 20260720151931_a4bcb160-4d06-4443-b3ef-04ee7c504ebf.sql

CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events(event_name, created_at DESC);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated, anon;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert analytics" ON public.analytics_events FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "admins can view analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- File: 20260720153343_16e3b2c9-a8c6-4d1e-9f05-c126c51c3ec9.sql
CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
 RETURNS TABLE(id uuid, order_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; new_num text; uid uuid := auth.uid(); it jsonb; pid uuid; q int;
BEGIN
  IF _payload IS NULL THEN RAISE EXCEPTION 'payload required'; END IF;
  IF COALESCE(_payload->>'customer_name','') = '' OR COALESCE(_payload->>'customer_phone','') = '' OR COALESCE(_payload->>'address','') = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF jsonb_typeof(_payload->'items') <> 'array' OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;
  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address, district, thana,
    items, subtotal, delivery_fee, total, payment_method, payment_type,
    txn_id, sender_phone, paid_amount, notes, vendor_id, user_id
  ) VALUES (
    _payload->>'customer_name', _payload->>'customer_phone',
    NULLIF(_payload->>'customer_email',''), _payload->>'address',
    NULLIF(_payload->>'district',''), NULLIF(_payload->>'thana',''),
    COALESCE(_payload->'items','[]'::jsonb),
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'delivery_fee')::numeric, 0),
    COALESCE((_payload->>'total')::numeric, 0),
    COALESCE(_payload->>'payment_method','cod'),
    NULLIF(_payload->>'payment_type',''), NULLIF(_payload->>'txn_id',''),
    NULLIF(_payload->>'sender_phone',''),
    COALESCE((_payload->>'paid_amount')::numeric, 0),
    NULLIF(_payload->>'notes',''),
    NULLIF(_payload->>'vendor_id','')::uuid, uid
  )
  RETURNING orders.id, orders.order_number INTO new_id, new_num;

  -- Auto-decrement stock (skip permanent "In stock" sentinel = 999999)
  FOR it IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    pid := NULLIF(it->>'id','')::uuid;
    q := GREATEST(COALESCE((it->>'qty')::int, 1), 1);
    IF pid IS NOT NULL THEN
      UPDATE public.products
         SET stock = GREATEST(stock - q, 0)
       WHERE id = pid AND stock < 999999 AND stock > 0;
    END IF;
  END LOOP;

  id := new_id; order_number := new_num; RETURN NEXT;
END; $function$;

-- File: 20260720153518_4cba6c87-c7ad-4477-a73f-3cecc6fbd3ad.sql
CREATE OR REPLACE FUNCTION public.restock_on_cancel_refund()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE it jsonb; pid uuid; q int; old_s text; new_s text;
BEGIN
  old_s := lower(COALESCE(OLD.status, ''));
  new_s := lower(COALESCE(NEW.status, ''));
  IF new_s = old_s THEN RETURN NEW; END IF;
  -- Only restock when transitioning INTO cancelled/refunded from a non-restocked state
  IF new_s NOT IN ('cancelled','canceled','refunded') THEN RETURN NEW; END IF;
  IF old_s IN ('cancelled','canceled','refunded') THEN RETURN NEW; END IF;

  IF jsonb_typeof(NEW.items) = 'array' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      pid := NULLIF(it->>'id','')::uuid;
      q := GREATEST(COALESCE((it->>'qty')::int, 1), 1);
      IF pid IS NOT NULL THEN
        UPDATE public.products
           SET stock = stock + q
         WHERE id = pid AND stock < 999999;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_restock_on_cancel_refund ON public.orders;
CREATE TRIGGER trg_restock_on_cancel_refund
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restock_on_cancel_refund();

-- File: 20260721060227_465ab8de-e51c-41a8-8bc3-5258cd36ded0.sql
CREATE OR REPLACE FUNCTION public.place_order(_payload jsonb)
 RETURNS TABLE(id uuid, order_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; new_num text; uid uuid := auth.uid(); it jsonb; pid uuid; q int;
BEGIN
  IF _payload IS NULL THEN RAISE EXCEPTION 'payload required'; END IF;
  IF COALESCE(_payload->>'customer_name','') = '' OR COALESCE(_payload->>'customer_phone','') = '' OR COALESCE(_payload->>'address','') = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;
  IF jsonb_typeof(_payload->'items') <> 'array' OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;
  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address, district, thana,
    items, subtotal, delivery_fee, total, payment_method, payment_type,
    txn_id, sender_phone, paid_amount, notes, vendor_id, user_id
  ) VALUES (
    _payload->>'customer_name', _payload->>'customer_phone',
    NULLIF(_payload->>'customer_email',''), _payload->>'address',
    NULLIF(_payload->>'district',''), NULLIF(_payload->>'thana',''),
    COALESCE(_payload->'items','[]'::jsonb),
    COALESCE((_payload->>'subtotal')::numeric, 0),
    COALESCE((_payload->>'delivery_fee')::numeric, 0),
    COALESCE((_payload->>'total')::numeric, 0),
    COALESCE(_payload->>'payment_method','cod'),
    NULLIF(_payload->>'payment_type',''), NULLIF(_payload->>'txn_id',''),
    NULLIF(_payload->>'sender_phone',''),
    COALESCE((_payload->>'paid_amount')::numeric, 0),
    NULLIF(_payload->>'notes',''),
    NULLIF(_payload->>'vendor_id','')::uuid, uid
  )
  RETURNING orders.id, orders.order_number INTO new_id, new_num;

  FOR it IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    pid := NULLIF(it->>'id','')::uuid;
    q := GREATEST(COALESCE((it->>'qty')::int, 1), 1);
    IF pid IS NOT NULL THEN
      UPDATE public.products p
         SET stock = GREATEST(p.stock - q, 0)
       WHERE p.id = pid AND p.stock < 999999 AND p.stock > 0;
    END IF;
  END LOOP;

  place_order.id := new_id;
  place_order.order_number := new_num;
  RETURN NEXT;
END; $function$;

