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