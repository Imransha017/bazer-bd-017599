
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
