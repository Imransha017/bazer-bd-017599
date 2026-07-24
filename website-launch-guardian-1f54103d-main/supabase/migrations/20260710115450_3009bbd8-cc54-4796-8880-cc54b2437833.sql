
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
