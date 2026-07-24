DELETE FROM public.order_status_history;
DELETE FROM public.affiliate_commissions;
DELETE FROM public.dropshipper_earnings;
DELETE FROM public.orders;
UPDATE public.vendors SET total_sales = 0, total_orders = 0;
UPDATE public.dropshippers SET total_orders = 0, total_earned = 0, total_paid = 0;
UPDATE public.affiliates SET total_orders = 0, total_earned = 0, total_paid = 0;