CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are publicly readable"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id, settings) VALUES (1, '{
  "brand": {
    "name": "Bazar BD",
    "tagline": "Bangladesh''s premium online marketplace",
    "logo_url": "",
    "favicon_url": ""
  },
  "header": {
    "top_bar_enabled": true,
    "top_bar_text": "Free delivery on orders over ৳2000 — Shop now!",
    "nav_links": [
      {"label": "Home", "href": "/", "sort": 1},
      {"label": "Categories", "href": "/categories", "sort": 2},
      {"label": "Dropshipping", "href": "/dropshipping", "sort": 3},
      {"label": "Become a Vendor", "href": "/become-vendor", "sort": 4}
    ],
    "show_search": true,
    "show_wishlist": true,
    "show_cart": true,
    "show_account": true
  },
  "footer": {
    "columns": [
      {"title": "Customer Care", "links": [
        {"label": "Help Center", "href": "#"},
        {"label": "How to Buy", "href": "#"},
        {"label": "Returns & Refunds", "href": "#"},
        {"label": "Contact Us", "href": "#"}
      ]},
      {"title": "Bazar", "links": [
        {"label": "About Bazar", "href": "#"},
        {"label": "Careers", "href": "#"},
        {"label": "Bazar Blog", "href": "#"},
        {"label": "Press", "href": "#"}
      ]}
    ],
    "payment_badges": [
      {"label": "bKash", "bg": "#E2136E", "fg": "#ffffff"},
      {"label": "Nagad", "bg": "#EC1C24", "fg": "#ffffff"},
      {"label": "Rocket", "bg": "#8B2C8B", "fg": "#ffffff"},
      {"label": "VISA", "bg": "#1A1F71", "fg": "#F7B600"},
      {"label": "MasterCard", "bg": "#ffffff", "fg": "#EB001B"},
      {"label": "COD", "bg": "#16a34a", "fg": "#ffffff"}
    ],
    "app_links": {
      "app_store": "",
      "google_play": ""
    },
    "contact": {
      "email": "support@bazar-bd.com",
      "phone": "+880 1XXX-XXXXXX",
      "address": "Dhaka, Bangladesh"
    },
    "social": {
      "facebook": "",
      "instagram": "",
      "youtube": "",
      "twitter": ""
    },
    "copyright_text": "© Bazar Clone — Demo storefront built with Lovable."
  }
}'::jsonb);