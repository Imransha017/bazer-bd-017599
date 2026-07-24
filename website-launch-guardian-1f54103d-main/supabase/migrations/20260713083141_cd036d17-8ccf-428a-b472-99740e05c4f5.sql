CREATE OR REPLACE FUNCTION public.admin_get_user_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE em text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  SELECT email INTO em FROM auth.users WHERE id = _user_id LIMIT 1;
  RETURN em;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_user_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;