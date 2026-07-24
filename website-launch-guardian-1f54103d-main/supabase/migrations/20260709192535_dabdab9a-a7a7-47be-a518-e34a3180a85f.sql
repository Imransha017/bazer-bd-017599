DROP POLICY IF EXISTS "click insert public" ON public.affiliate_clicks;
REVOKE INSERT ON public.affiliate_clicks FROM anon, authenticated;