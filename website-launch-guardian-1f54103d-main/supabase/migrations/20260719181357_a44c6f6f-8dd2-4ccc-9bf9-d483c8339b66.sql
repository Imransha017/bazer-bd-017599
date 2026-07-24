
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
