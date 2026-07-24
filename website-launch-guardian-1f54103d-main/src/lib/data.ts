// Static demo catalog for the Bazar-style storefront.
// Images are sourced from loremflickr.com (keyword-tagged real photos) so
// the UI looks like a real e-commerce site instead of cartoon emoji.

export type L = { bn: string; en: string };

export type Subcategory = { slug: string; name: L; keyword: string; children?: Subcategory[] };

export type Category = {
  slug: string;
  name: L;
  icon: string;       // small emoji fallback used in chips only
  image: string;      // category tile image
  color: string;
  subcategories: Subcategory[];
};

export type Product = {
  id: string;
  slug?: string;        // when present, use /p/$slug route (DB products)
  title: L;
  price: number;
  mrp: number;
  dropshipper_price?: number | null;
  rating: number;
  reviewCount?: number;
  sold: number;
  category: string;     // category slug
  categoryName?: string;
  subcategory?: string; // subcategory slug
  subcategoryName?: string;
  brand: string;
  sku?: string;
  tags?: string[];
  badge?: "FLASH" | "NEW" | "TOP" | "MALL";
  image: string;        // primary product image
  gallery: string[];    // gallery thumbs
  description: L;
};


const img = (kw: string, seed: number, size = 400) =>
  `https://loremflickr.com/${size}/${size}/${encodeURIComponent(kw)}?lock=${seed}`;

// 3D cartoon-style category icons (Microsoft Fluent Emoji 3D set on jsDelivr).
const icon3d = (name: string) =>
  `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(
    name,
  )}/3D/${name.toLowerCase().replace(/ /g, "_")}_3d.png`;

// Static categories have been removed. Categories and subcategories are now
// derived automatically from synced WordPress/WooCommerce products (see
// src/lib/live-catalog.ts). Kept as an empty array for backward compatibility
// with helpers below.
export const categories: Category[] = [];

type Seed = {
  title: L; brand: string; basePrice: number;
  sub: string; keyword: string;
};

const seeds: Record<string, Seed[]> = {
  electronics: [
    { title: { bn: "শাওমি রেডমি ১৩ ৬/১২৮", en: "Xiaomi Redmi 13 6/128GB" }, brand: "Xiaomi", basePrice: 18999, sub: "mobiles", keyword: "smartphone,redmi" },
    { title: { bn: "স্যামসাং গ্যালাক্সি A15", en: "Samsung Galaxy A15" }, brand: "Samsung", basePrice: 22500, sub: "mobiles", keyword: "samsung,phone" },
    { title: { bn: "ইনফিনিক্স হট ৪০", en: "Infinix Hot 40" }, brand: "Infinix", basePrice: 16999, sub: "mobiles", keyword: "infinix" },
    { title: { bn: "ব্লুটুথ ইয়ারবাড TWS", en: "Bluetooth TWS Earbuds" }, brand: "Soundcore", basePrice: 1850, sub: "headphones", keyword: "earbuds" },
    { title: { bn: "স্মার্ট ওয়াচ T800", en: "Smart Watch T800 Ultra" }, brand: "Mibro", basePrice: 1499, sub: "smartwatch", keyword: "smartwatch" },
    { title: { bn: "আসুস ভিভোবুক ১৫", en: "Asus VivoBook 15 i5" }, brand: "ASUS", basePrice: 65999, sub: "laptops", keyword: "laptop" },
    { title: { bn: "পাওয়ার ব্যাংক ২০০০০ mAh", en: "Power Bank 20000mAh" }, brand: "Anker", basePrice: 2299, sub: "mobiles", keyword: "powerbank" },
    { title: { bn: "ওয়্যারলেস মাউস", en: "Wireless Mouse" }, brand: "Logitech", basePrice: 899, sub: "laptops", keyword: "mouse" },
    { title: { bn: "DSLR ক্যামেরা", en: "DSLR Camera" }, brand: "Canon", basePrice: 54999, sub: "cameras", keyword: "dslr,camera" },
  ],
  "fashion-women": [
    { title: { bn: "প্রিন্টেড থ্রি-পিস", en: "Printed Three-Piece Salwar" }, brand: "Aarong", basePrice: 1899, sub: "salwar", keyword: "salwar" },
    { title: { bn: "জামদানি শাড়ি", en: "Jamdani Saree" }, brand: "Tangail", basePrice: 3499, sub: "saree", keyword: "saree" },
    { title: { bn: "লেদার হ্যান্ডব্যাগ", en: "Leather Handbag" }, brand: "Apex", basePrice: 1299, sub: "bags-w", keyword: "handbag" },
    { title: { bn: "হিজাব সেট ৫ পিস", en: "Hijab Set 5pcs" }, brand: "Naheed", basePrice: 549, sub: "hijab", keyword: "hijab" },
    { title: { bn: "কটন কুর্তি", en: "Cotton Kurti" }, brand: "Sailor", basePrice: 1099, sub: "tops", keyword: "kurti" },
    { title: { bn: "ব্লক প্রিন্ট হিল", en: "Block Print Heels" }, brand: "Bata", basePrice: 1799, sub: "shoes-w", keyword: "heels" },
  ],
  "fashion-men": [
    { title: { bn: "ফরমাল শার্ট স্লিম ফিট", en: "Formal Shirt Slim Fit" }, brand: "Cats Eye", basePrice: 999, sub: "shirts", keyword: "shirt" },
    { title: { bn: "ডেনিম জিন্স", en: "Denim Jeans" }, brand: "Levi's", basePrice: 1599, sub: "jeans", keyword: "jeans" },
    { title: { bn: "স্পোর্টস স্নিকার্স", en: "Sports Sneakers" }, brand: "Bata", basePrice: 1899, sub: "shoes-m", keyword: "sneakers" },
    { title: { bn: "চামড়ার ওয়ালেট", en: "Genuine Leather Wallet" }, brand: "Apex", basePrice: 599, sub: "wallet", keyword: "wallet" },
    { title: { bn: "পোলো টি-শার্ট", en: "Polo T-Shirt" }, brand: "Yellow", basePrice: 749, sub: "tshirts", keyword: "polo,tshirt" },
    { title: { bn: "এমব্রয়ডারি পাঞ্জাবি", en: "Embroidery Panjabi" }, brand: "Sailor", basePrice: 1899, sub: "panjabi", keyword: "panjabi,kurta" },
  ],
  home: [
    { title: { bn: "ইলেকট্রিক কেতলি ১.৮L", en: "Electric Kettle 1.8L" }, brand: "Walton", basePrice: 1199, sub: "kitchen", keyword: "kettle" },
    { title: { bn: "রাইস কুকার ২.৮L", en: "Rice Cooker 2.8L" }, brand: "Vision", basePrice: 2499, sub: "kitchen", keyword: "ricecooker" },
    { title: { bn: "মাইক্রোওয়েভ ২০L", en: "Microwave Oven 20L" }, brand: "Singer", basePrice: 8499, sub: "kitchen", keyword: "microwave" },
    { title: { bn: "কিং সাইজ বেডশিট", en: "King Size Bedsheet" }, brand: "ClassicalHome", basePrice: 1299, sub: "bedding", keyword: "bedsheet" },
    { title: { bn: "এলইডি টেবিল ল্যাম্প", en: "LED Table Lamp" }, brand: "Philips", basePrice: 690, sub: "lighting", keyword: "lamp" },
    { title: { bn: "ড্রিল মেশিন ১৩mm", en: "Drill Machine 13mm" }, brand: "Bosch", basePrice: 3499, sub: "tools", keyword: "drill" },
  ],
  beauty: [
    { title: { bn: "ফেস ক্রিম ৫০g", en: "Face Cream 50g" }, brand: "Pond's", basePrice: 320, sub: "skincare", keyword: "facecream" },
    { title: { bn: "ম্যাট লিপস্টিক সেট", en: "Matte Lipstick Set" }, brand: "Maybelline", basePrice: 890, sub: "makeup", keyword: "lipstick" },
    { title: { bn: "নারিকেল হেয়ার অয়েল", en: "Coconut Hair Oil" }, brand: "Parachute", basePrice: 220, sub: "haircare", keyword: "haircare" },
    { title: { bn: "অরিজিনাল পারফিউম", en: "Original Perfume 100ml" }, brand: "Calvin Klein", basePrice: 2899, sub: "perfume", keyword: "perfume" },
    { title: { bn: "শেভিং কিট", en: "Shaving Kit" }, brand: "Gillette", basePrice: 690, sub: "mens-care", keyword: "shaving" },
  ],
  grocery: [
    { title: { bn: "মিনিকেট চাল ৫ কেজি", en: "Miniket Rice 5kg" }, brand: "Pran", basePrice: 380, sub: "staples", keyword: "rice" },
    { title: { bn: "সয়াবিন তেল ৫ লি", en: "Soybean Oil 5L" }, brand: "Rupchanda", basePrice: 920, sub: "oil", keyword: "oilbottle" },
    { title: { bn: "প্রিমিয়াম চা পাতা ৪০০g", en: "Premium Tea 400g" }, brand: "Ispahani", basePrice: 290, sub: "drinks", keyword: "teabox" },
    { title: { bn: "চকলেট কুকিজ", en: "Chocolate Cookies Combo" }, brand: "Olympic", basePrice: 240, sub: "snacks", keyword: "cookies" },
    { title: { bn: "ডগ ফুড ১.৫ কেজি", en: "Dog Food 1.5kg" }, brand: "Pedigree", basePrice: 690, sub: "pets", keyword: "dogfood" },
  ],
  baby: [
    { title: { bn: "বেবি ডায়াপার মিডিয়াম ৪৪", en: "Baby Diapers Medium 44pcs" }, brand: "Pampers", basePrice: 1199, sub: "diapers", keyword: "diaper" },
    { title: { bn: "নরম টেডি বিয়ার", en: "Soft Teddy Bear" }, brand: "Toy World", basePrice: 599, sub: "toys", keyword: "teddybear" },
    { title: { bn: "ফিডিং বোতল ২৫০ml", en: "Feeding Bottle 250ml" }, brand: "Philips Avent", basePrice: 350, sub: "feeding", keyword: "feedingbottle" },
    { title: { bn: "বেবি রম্পার সেট", en: "Baby Romper Set" }, brand: "Mothercare", basePrice: 890, sub: "baby-fashion", keyword: "babyclothes" },
  ],
  sports: [
    { title: { bn: "ম্যাচ ফুটবল সাইজ ৫", en: "Match Football Size 5" }, brand: "Adidas", basePrice: 1499, sub: "football", keyword: "football,ball" },
    { title: { bn: "ক্রিকেট ব্যাট কাশ্মীর উইলো", en: "Kashmir Willow Cricket Bat" }, brand: "SS", basePrice: 2200, sub: "cricket", keyword: "cricketbat" },
    { title: { bn: "ইয়োগা ম্যাট ৬mm", en: "Yoga Mat 6mm" }, brand: "Reebok", basePrice: 990, sub: "fitness", keyword: "yogamat" },
    { title: { bn: "মাউন্টেন বাইসাইকেল ২৬", en: "Mountain Bicycle 26\"" }, brand: "Veloce", basePrice: 14999, sub: "cycling", keyword: "bicycle" },
  ],
  automotive: [
    { title: { bn: "কার ভ্যাকুয়াম ক্লিনার", en: "Car Vacuum Cleaner" }, brand: "Baseus", basePrice: 1499, sub: "car-acc", keyword: "carvacuum" },
    { title: { bn: "ফুল ফেস বাইক হেলমেট", en: "Full Face Bike Helmet" }, brand: "Studds", basePrice: 2299, sub: "helmet", keyword: "helmet" },
    { title: { bn: "৪T ইঞ্জিন অয়েল ১L", en: "4T Engine Oil 1L" }, brand: "Castrol", basePrice: 599, sub: "oils-auto", keyword: "engineoil" },
  ],
  watches: [
    { title: { bn: "অ্যানালগ পুরুষ ঘড়ি", en: "Men's Analog Watch" }, brand: "Casio", basePrice: 2499, sub: "mens-watch", keyword: "wristwatch" },
    { title: { bn: "গোল্ড প্লেটেড নেকলেস", en: "Gold-Plated Necklace" }, brand: "Apurba", basePrice: 1899, sub: "jewellery", keyword: "necklace" },
    { title: { bn: "পোলারাইজড সানগ্লাস", en: "Polarized Sunglasses" }, brand: "Ray-Ban", basePrice: 1290, sub: "sunglasses", keyword: "sunglasses" },
  ],
  books: [
    { title: { bn: "হুমায়ূন আহমেদ কালেকশন", en: "Bestseller Novel Collection" }, brand: "Sheba", basePrice: 450, sub: "fiction", keyword: "novelbook" },
    { title: { bn: "একাডেমিক টেক্সটবুক", en: "Academic Textbook" }, brand: "Onneshan", basePrice: 380, sub: "academic", keyword: "textbook" },
    { title: { bn: "প্রিমিয়াম নোটবুক সেট", en: "Premium Notebook Set" }, brand: "Matador", basePrice: 180, sub: "stationery", keyword: "notebook" },
  ],
  "tv-appliances": [
    { title: { bn: "৪৩\" স্মার্ট LED টিভি", en: "43\" Smart LED TV" }, brand: "Walton", basePrice: 32999, sub: "tv", keyword: "smarttv" },
    { title: { bn: "ডাবল ডোর রেফ্রিজারেটর", en: "Double Door Refrigerator" }, brand: "Singer", basePrice: 41999, sub: "fridge", keyword: "refrigerator" },
    { title: { bn: "১.৫ টন স্প্লিট এসি", en: "1.5 Ton Split AC" }, brand: "General", basePrice: 62999, sub: "ac", keyword: "airconditioner" },
    { title: { bn: "ফুল অটোমেটিক ওয়াশিং মেশিন", en: "Full Automatic Washing Machine" }, brand: "LG", basePrice: 48999, sub: "washing", keyword: "washingmachine" },
    { title: { bn: "সিলিং ফ্যান ৫৬\"", en: "Ceiling Fan 56\"" }, brand: "Walton", basePrice: 2899, sub: "fan", keyword: "ceilingfan" },
  ],
};

function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const products: Product[] = [];


export const flashSale = products.filter((p) => p.badge === "FLASH" || p.badge === "TOP").slice(0, 8);

export const getProduct = (id: string) => products.find((p) => p.id === id);
export const productsByCategory = (slug: string) => products.filter((p) => p.category === slug);
export const productsBySubcategory = (cat: string, sub: string) =>
  products.filter((p) => p.category === cat && p.subcategory === sub);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const searchProducts = (q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return products.filter(
    (p) =>
      p.title.en.toLowerCase().includes(s) ||
      p.title.bn.includes(s) ||
      p.brand.toLowerCase().includes(s) ||
      p.category.includes(s),
  );
};

export const formatBDT = (n: number) => `৳${n.toLocaleString("en-BD")}`;
