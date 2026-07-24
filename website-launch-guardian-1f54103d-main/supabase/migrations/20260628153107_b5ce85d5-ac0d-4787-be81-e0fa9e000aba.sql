
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement TEXT NOT NULL DEFAULT 'hero_slider',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  gradient_from TEXT NOT NULL DEFAULT 'from-violet-500',
  gradient_to TEXT NOT NULL DEFAULT 'to-fuchsia-600',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners" ON public.banners
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.banners (placement, title, subtitle, image_url, link_url, sort_order) VALUES
  ('hero_slider', 'Mobile Mega Offer', '', '/src/assets/hero-1.jpg', '/category/electronics', 1),
  ('hero_slider', 'Fashion Bonanza', '', '/src/assets/hero-2.jpg', '/category/fashion-women', 2),
  ('hero_slider', 'Home Essentials', '', '/src/assets/hero-3.jpg', '/category/home', 3);

INSERT INTO public.banners (placement, title, subtitle, link_url, gradient_from, gradient_to, sort_order) VALUES
  ('hero_side', 'Audio Fest', 'From ৳499', '/category/electronic-acc', 'from-violet-500', 'to-fuchsia-600', 1),
  ('hero_side', 'Beauty Week', 'Up to 60% OFF', '/category/beauty', 'from-rose-400', 'to-pink-600', 2);
