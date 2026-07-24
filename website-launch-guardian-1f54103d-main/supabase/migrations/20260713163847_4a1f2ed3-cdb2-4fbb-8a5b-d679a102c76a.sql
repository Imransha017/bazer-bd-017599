-- Remove WordPress Sync system and all products
DROP TABLE IF EXISTS public.wp_sync_logs CASCADE;
DROP TABLE IF EXISTS public.wp_connections CASCADE;

-- Clean product-dependent references first, then delete all products
DELETE FROM public.dropshipper_products;
DELETE FROM public.wishlists;
DELETE FROM public.reviews;
DELETE FROM public.products;