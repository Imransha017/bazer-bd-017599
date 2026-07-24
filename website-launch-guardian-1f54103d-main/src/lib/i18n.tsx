import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "bn" | "en";

type Dict = Record<string, { bn: string; en: string }>;

const DICT: Dict = {
  // Nav & header
  search_placeholder: { bn: "পণ্য খুঁজুন...", en: "Search in Bazar" },
  login: { bn: "লগইন", en: "Login" },
  signup: { bn: "সাইন আপ", en: "Sign Up" },
  logout: { bn: "লগআউট", en: "Sign out" },
  cart: { bn: "কার্ট", en: "Cart" },
  home: { bn: "হোম", en: "Home" },
  categories: { bn: "ক্যাটাগরি", en: "Categories" },
  account: { bn: "অ্যাকাউন্ট", en: "Account" },
  wishlist: { bn: "উইশলিস্ট", en: "Wishlist" },
  orders: { bn: "অর্ডার", en: "Orders" },
  track_order: { bn: "অর্ডার ট্র্যাক", en: "Track Order" },
  sell_on_bazar: { bn: "বাজারে বিক্রি করুন", en: "Sell on Bazar" },

  // Product / cart
  flash_sale: { bn: "ফ্ল্যাশ সেল", en: "Flash Sale" },
  ends_in: { bn: "শেষ হবে", en: "Ends In" },
  shop_more: { bn: "আরও দেখুন", en: "More" },
  add_to_cart: { bn: "কার্টে যোগ করুন", en: "Add to Cart" },
  buy_now: { bn: "অর্ডার করুন", en: "Order Now" },
  free_shipping: { bn: "ফ্রি ডেলিভারি", en: "Free Shipping" },
  cod: { bn: "ক্যাশ অন ডেলিভারি", en: "Cash on Delivery" },
  warranty: { bn: "৭ দিন রিটার্ন", en: "7-Day Return" },
  sold: { bn: "বিক্রি হয়েছে", en: "sold" },
  off: { bn: "ছাড়", en: "OFF" },
  for_you: { bn: "আপনার জন্য", en: "Just For You" },
  top_categories: { bn: "সকল ক্যাটাগরি", en: "All Categories" },
  view_all: { bn: "সব দেখুন", en: "View All" },
  empty_cart: { bn: "আপনার কার্ট খালি", en: "Your cart is empty" },
  continue_shopping: { bn: "কেনাকাটা চালিয়ে যান", en: "Continue Shopping" },
  subtotal: { bn: "মোট", en: "Subtotal" },
  checkout: { bn: "চেকআউট", en: "Checkout" },
  qty: { bn: "পরিমাণ", en: "Qty" },
  remove: { bn: "মুছে ফেলুন", en: "Remove" },
  product_details: { bn: "পণ্যের বিবরণ", en: "Product Details" },
  description: { bn: "বিবরণ", en: "Description" },
  specifications: { bn: "স্পেসিফিকেশন", en: "Specifications" },
  reviews: { bn: "রিভিউ", en: "Reviews" },
  rating: { bn: "রেটিং", en: "Rating" },
  brand: { bn: "ব্র্যান্ড", en: "Brand" },
  added_to_cart: { bn: "কার্টে যোগ হয়েছে", en: "Added to cart" },
  no_results: { bn: "কোন পণ্য পাওয়া যায়নি", en: "No products found" },
  results_for: { bn: "ফলাফল", en: "Results for" },
  hours: { bn: "ঘঃ", en: "h" },
  mins: { bn: "মিঃ", en: "m" },
  secs: { bn: "সেঃ", en: "s" },
  all: { bn: "সব", en: "All" },
  products: { bn: "পণ্য", en: "products" },
  no_products: { bn: "কোন পণ্য পাওয়া যায়নি", en: "No products in this section." },

  // Auth
  welcome_back: { bn: "আবার স্বাগতম!", en: "Welcome back!" },
  create_new_account: { bn: "নতুন অ্যাকাউন্ট তৈরি করুন", en: "Create a new account" },
  invalid_phone: { bn: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)", en: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)" },
  account_created: { bn: "অ্যাকাউন্ট তৈরি হয়েছে! Email verify করুন (প্রয়োজন হলে)।", en: "Account created! Please verify your email (if required)." },

  // Common
  loading: { bn: "লোড হচ্ছে…", en: "Loading…" },
  save: { bn: "সেভ", en: "Save" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  close: { bn: "বন্ধ", en: "Close" },
  activate: { bn: "একটিভ করুন", en: "Activate" },
  deactivate: { bn: "নিষ্ক্রিয় করুন", en: "Deactivate" },
  live: { bn: "লাইভ", en: "Live" },
  pending: { bn: "পেন্ডিং", en: "Pending" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en";
    setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  const t = (k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k);
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}

export function pick<T extends { bn: string; en: string }>(v: T, lang: Lang) {
  return v[lang];
}
