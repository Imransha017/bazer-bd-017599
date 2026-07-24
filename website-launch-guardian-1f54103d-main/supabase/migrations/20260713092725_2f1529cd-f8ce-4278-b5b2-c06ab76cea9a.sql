
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
