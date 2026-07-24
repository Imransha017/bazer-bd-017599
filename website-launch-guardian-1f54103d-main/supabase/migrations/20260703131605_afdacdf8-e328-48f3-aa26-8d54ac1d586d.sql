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