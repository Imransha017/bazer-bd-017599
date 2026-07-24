
-- Remove admin role from anyone who isn't the allowed email
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE lower(email) = 'emransha952@gmail.com');

-- Guard trigger: prevent granting admin to any other account
CREATE OR REPLACE FUNCTION public.enforce_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE em text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT lower(email) INTO em FROM auth.users WHERE id = NEW.user_id;
    IF em IS DISTINCT FROM 'emransha952@gmail.com' THEN
      RAISE EXCEPTION 'admin role is restricted to the designated administrator';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_email_trg ON public.user_roles;
CREATE TRIGGER enforce_admin_email_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_email();

-- Harden has_role: even if an admin row somehow exists, only the allowed email resolves as admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        _role <> 'admin'
        OR EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = _user_id AND lower(u.email) = 'emransha952@gmail.com'
        )
      )
  )
$$;
