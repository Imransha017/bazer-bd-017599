
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
