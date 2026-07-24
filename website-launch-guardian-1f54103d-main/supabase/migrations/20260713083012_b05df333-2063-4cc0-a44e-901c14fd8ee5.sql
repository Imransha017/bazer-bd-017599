GRANT EXECUTE ON FUNCTION public.attribute_order_to_dropshipper(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_order_to_affiliate(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_order_to_affiliate(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_dropshipper_click(text, text, text, text, text) TO anon, authenticated;