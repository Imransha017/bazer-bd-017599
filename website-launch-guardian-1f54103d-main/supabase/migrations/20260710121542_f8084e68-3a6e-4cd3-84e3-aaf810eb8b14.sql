
-- Wipe existing categories (and any product references to them)
UPDATE public.products SET category_slug = NULL, category_name = NULL, subcategory_slug = NULL, subcategory_name = NULL;
DELETE FROM public.categories;

-- Seed Daraz BD taxonomy
WITH parents(name, slug, icon, sort_order) AS (
  VALUES
  ('মহিলাদের ফ্যাশন','womens-fashion','👗',1),
  ('পুরুষদের ফ্যাশন','mens-fashion','👔',2),
  ('শিশুদের ফ্যাশন','kids-fashion','🧒',3),
  ('মোবাইল ও ট্যাবলেট','mobiles-tablets','📱',4),
  ('মোবাইল আনুষাঙ্গিক','mobile-accessories','🎧',5),
  ('ইলেকট্রনিক ডিভাইস','electronic-devices','💻',6),
  ('ইলেকট্রনিক এক্সেসরিজ','electronic-accessories','🔌',7),
  ('টিভি ও হোম অ্যাপ্লায়েন্স','tv-home-appliances','📺',8),
  ('স্বাস্থ্য ও সৌন্দর্য','health-beauty','💄',9),
  ('শিশু ও খেলনা','babies-toys','🧸',10),
  ('মুদি ও পোষা প্রাণী','groceries-pets','🛒',11),
  ('হোম ও লাইফস্টাইল','home-lifestyle','🏠',12),
  ('খেলাধুলা ও আউটডোর','sports-outdoor','⚽',13),
  ('অটোমোটিভ ও মোটরবাইক','automotive-motorbike','🏍️',14),
  ('ওয়াচ, ব্যাগ ও গহনা','watches-bags-jewellery','⌚',15)
)
INSERT INTO public.categories (name, slug, icon, sort_order, parent_id)
SELECT name, slug, icon, sort_order, NULL FROM parents;

-- Subcategories: (parent_slug, name, slug)
WITH subs(parent_slug, name, slug) AS (
  VALUES
  -- Women's Fashion
  ('womens-fashion','মুসলিম ওয়্যার','muslim-wear'),
  ('womens-fashion','পোশাক','womens-clothing'),
  ('womens-fashion','জুতা','womens-shoes'),
  ('womens-fashion','ব্যাগ','womens-bags'),
  ('womens-fashion','গহনা','womens-jewellery'),
  ('womens-fashion','ঘড়ি','womens-watches'),
  ('womens-fashion','অন্তর্বাস ও ঘুমের পোশাক','womens-lingerie-sleepwear'),
  ('womens-fashion','অ্যাক্সেসরিজ','womens-accessories'),

  -- Men's Fashion
  ('mens-fashion','পোশাক','mens-clothing'),
  ('mens-fashion','পাঞ্জাবি ও পাজামা','mens-panjabi-pajama'),
  ('mens-fashion','জুতা','mens-shoes'),
  ('mens-fashion','ঘড়ি','mens-watches'),
  ('mens-fashion','ব্যাগ ও ওয়ালেট','mens-bags-wallets'),
  ('mens-fashion','অন্তর্বাস','mens-innerwear'),
  ('mens-fashion','অ্যাক্সেসরিজ','mens-accessories'),

  -- Kids Fashion
  ('kids-fashion','ছেলে শিশুর পোশাক','boys-clothing'),
  ('kids-fashion','মেয়ে শিশুর পোশাক','girls-clothing'),
  ('kids-fashion','শিশুদের জুতা','kids-shoes'),
  ('kids-fashion','শিশুদের অ্যাক্সেসরিজ','kids-accessories'),

  -- Mobiles & Tablets
  ('mobiles-tablets','স্মার্টফোন','smartphones'),
  ('mobiles-tablets','ফিচার ফোন','feature-phones'),
  ('mobiles-tablets','ট্যাবলেট','tablets'),
  ('mobiles-tablets','স্মার্ট ওয়াচ','smart-watches'),
  ('mobiles-tablets','ব্যবহৃত ফোন','used-phones'),

  -- Mobile Accessories
  ('mobile-accessories','পাওয়ার ব্যাংক','power-banks'),
  ('mobile-accessories','চার্জার ও ক্যাবল','chargers-cables'),
  ('mobile-accessories','হেডফোন ও ইয়ারফোন','headphones-earphones'),
  ('mobile-accessories','ব্লুটুথ হেডসেট','bluetooth-headsets'),
  ('mobile-accessories','ফোন কেস ও কভার','phone-cases'),
  ('mobile-accessories','স্ক্রিন প্রটেক্টর','screen-protectors'),
  ('mobile-accessories','সেলফি স্টিক ও ট্রাইপড','selfie-sticks-tripods'),
  ('mobile-accessories','স্মার্ট ব্যান্ড','fitness-bands'),

  -- Electronic Devices
  ('electronic-devices','ল্যাপটপ','laptops'),
  ('electronic-devices','ডেস্কটপ কম্পিউটার','desktops'),
  ('electronic-devices','ক্যামেরা','cameras'),
  ('electronic-devices','ড্রোন','drones'),
  ('electronic-devices','প্রিন্টার','printers'),
  ('electronic-devices','মনিটর','monitors'),
  ('electronic-devices','গেমিং কনসোল','gaming-consoles'),

  -- Electronic Accessories
  ('electronic-accessories','মাউস ও কীবোর্ড','mouse-keyboards'),
  ('electronic-accessories','ল্যাপটপ ব্যাগ','laptop-bags'),
  ('electronic-accessories','স্টোরেজ ও পেন ড্রাইভ','storage-pen-drives'),
  ('electronic-accessories','নেটওয়ার্ক ডিভাইস','networking'),
  ('electronic-accessories','কম্পিউটার এক্সেসরিজ','computer-accessories'),
  ('electronic-accessories','ক্যামেরা এক্সেসরিজ','camera-accessories'),
  ('electronic-accessories','ক্যাবল ও কনভার্টার','cables-converters'),

  -- TV & Home Appliances
  ('tv-home-appliances','টেলিভিশন','televisions'),
  ('tv-home-appliances','ফ্রিজ','refrigerators'),
  ('tv-home-appliances','ওয়াশিং মেশিন','washing-machines'),
  ('tv-home-appliances','এয়ার কন্ডিশনার','air-conditioners'),
  ('tv-home-appliances','মাইক্রোওয়েভ ওভেন','microwave-ovens'),
  ('tv-home-appliances','ব্লেন্ডার ও জুসার','blenders-juicers'),
  ('tv-home-appliances','রাইস কুকার','rice-cookers'),
  ('tv-home-appliances','ইলেকট্রিক ফ্যান','electric-fans'),
  ('tv-home-appliances','ইলেকট্রিক আয়রন','irons'),
  ('tv-home-appliances','ওয়াটার পিউরিফায়ার','water-purifiers'),

  -- Health & Beauty
  ('health-beauty','মেকআপ','makeup'),
  ('health-beauty','স্কিন কেয়ার','skin-care'),
  ('health-beauty','হেয়ার কেয়ার','hair-care'),
  ('health-beauty','পারফিউম ও সুগন্ধি','perfumes-fragrances'),
  ('health-beauty','পার্সোনাল কেয়ার','personal-care'),
  ('health-beauty','ওরাল কেয়ার','oral-care'),
  ('health-beauty','মেডিকেল সাপ্লাই','medical-supplies'),
  ('health-beauty','সেক্সুয়াল ওয়েলনেস','sexual-wellness'),

  -- Babies & Toys
  ('babies-toys','ডায়াপার ও নার্সিং','diapers-nursing'),
  ('babies-toys','বেবি ফর্মুলা ও ফুড','baby-food'),
  ('babies-toys','বেবি গিয়ার','baby-gear'),
  ('babies-toys','বেবি ও টডলার পোশাক','baby-clothing'),
  ('babies-toys','খেলনা','toys'),
  ('babies-toys','পাজল ও গেমস','puzzles-games'),

  -- Groceries & Pets
  ('groceries-pets','চাল, ডাল ও তেল','rice-dal-oil'),
  ('groceries-pets','মশলা ও সিজনিং','spices-seasoning'),
  ('groceries-pets','স্ন্যাকস ও বিস্কুট','snacks-biscuits'),
  ('groceries-pets','চা ও কফি','tea-coffee'),
  ('groceries-pets','পানীয়','beverages'),
  ('groceries-pets','পোষা প্রাণীর খাবার','pet-food'),
  ('groceries-pets','পোষা প্রাণীর অ্যাক্সেসরিজ','pet-accessories'),

  -- Home & Lifestyle
  ('home-lifestyle','বেডিং ও বাথ','bedding-bath'),
  ('home-lifestyle','হোম ডেকর','home-decor'),
  ('home-lifestyle','ফার্নিচার','furniture'),
  ('home-lifestyle','কিচেনওয়্যার','kitchenware'),
  ('home-lifestyle','ডাইনিং ও সার্ভিং','dining-serving'),
  ('home-lifestyle','লাইটিং','lighting'),
  ('home-lifestyle','টুলস ও হার্ডওয়্যার','tools-hardware'),
  ('home-lifestyle','গার্ডেনিং','gardening'),
  ('home-lifestyle','স্টেশনারি ও ক্রাফটস','stationery-crafts'),
  ('home-lifestyle','লন্ড্রি ও ক্লিনিং','laundry-cleaning'),

  -- Sports & Outdoor
  ('sports-outdoor','স্পোর্টস পোশাক','sports-clothing'),
  ('sports-outdoor','স্পোর্টস জুতা','sports-shoes'),
  ('sports-outdoor','ফিটনেস ইকুইপমেন্ট','fitness-equipment'),
  ('sports-outdoor','সাইক্লিং','cycling'),
  ('sports-outdoor','আউটডোর ও ক্যাম্পিং','outdoor-camping'),
  ('sports-outdoor','টিম স্পোর্টস','team-sports'),

  -- Automotive & Motorbike
  ('automotive-motorbike','মোটরবাইক এক্সেসরিজ','motorbike-accessories'),
  ('automotive-motorbike','মোটরবাইক পার্টস','motorbike-parts'),
  ('automotive-motorbike','হেলমেট','helmets'),
  ('automotive-motorbike','কার এক্সেসরিজ','car-accessories'),
  ('automotive-motorbike','কার ইলেকট্রনিক্স','car-electronics'),
  ('automotive-motorbike','কার কেয়ার','car-care'),

  -- Watches, Bags & Jewellery
  ('watches-bags-jewellery','পুরুষদের ঘড়ি','mens-watches-cat'),
  ('watches-bags-jewellery','মহিলাদের ঘড়ি','womens-watches-cat'),
  ('watches-bags-jewellery','সানগ্লাস ও চশমা','sunglasses-eyewear'),
  ('watches-bags-jewellery','ট্রাভেল ব্যাগ ও লাগেজ','travel-bags-luggage'),
  ('watches-bags-jewellery','ফাইন জুয়েলারি','fine-jewellery'),
  ('watches-bags-jewellery','ফ্যাশন জুয়েলারি','fashion-jewellery')
)
INSERT INTO public.categories (name, slug, sort_order, parent_id)
SELECT s.name, s.slug, row_number() OVER (PARTITION BY s.parent_slug), p.id
FROM subs s JOIN public.categories p ON p.slug = s.parent_slug;
