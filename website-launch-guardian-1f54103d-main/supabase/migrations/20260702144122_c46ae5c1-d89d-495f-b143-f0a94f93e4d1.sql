
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
