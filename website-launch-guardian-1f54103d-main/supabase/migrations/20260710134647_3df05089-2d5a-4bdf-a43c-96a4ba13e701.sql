
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
