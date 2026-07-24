
REVOKE EXECUTE ON FUNCTION public.get_my_vendor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_vendor_id() TO authenticated;
