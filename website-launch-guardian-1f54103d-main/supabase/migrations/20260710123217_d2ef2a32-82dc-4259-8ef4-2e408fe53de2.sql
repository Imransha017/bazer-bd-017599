
-- Clear existing categories and product links
UPDATE public.products SET category_slug = NULL, category_name = NULL, subcategory_slug = NULL, subcategory_name = NULL;
DELETE FROM public.categories;

-- Insert 12 top-level parent categories (English only, unique slugs)
INSERT INTO public.categories (name, slug, icon, parent_id, sort_order) VALUES
  ('Women''s Fashion',            'womens-fashion',           '👗', NULL, 1),
  ('Men''s Fashion',              'mens-fashion',             '👔', NULL, 2),
  ('Watches, Bags & Jewellery',   'watches-bags-jewellery',   '⌚', NULL, 3),
  ('Mother & Baby',               'mother-baby',              '🍼', NULL, 4),
  ('Home & Lifestyle',            'home-lifestyle',           '🏠', NULL, 5),
  ('Electronic Devices',          'electronic-devices',       '💻', NULL, 6),
  ('TV & Home Appliances',        'tv-home-appliances',       '📺', NULL, 7),
  ('Electronic Accessories',      'electronic-accessories',   '🎧', NULL, 8),
  ('Health & Beauty',             'health-beauty',            '💄', NULL, 9),
  ('Groceries & Pets',            'groceries-pets',           '🛒', NULL, 10),
  ('Sports & Outdoor',            'sports-outdoor',           '⚽', NULL, 11),
  ('Automotive & Motorbike',      'automotive-motorbike',     '🚗', NULL, 12);

-- Insert subcategories via a joined CTE so slugs stay unique (parent-slug prefix)
WITH subs(parent_slug, name, slug, sort_order) AS (
  VALUES
    -- Women's Fashion
    ('womens-fashion','Muslim Wear',            'womens-fashion-muslim-wear',       1),
    ('womens-fashion','Sarees',                 'womens-fashion-sarees',            2),
    ('womens-fashion','Salwar Kameez',          'womens-fashion-salwar-kameez',     3),
    ('womens-fashion','Kurtis & Tunics',        'womens-fashion-kurtis-tunics',     4),
    ('womens-fashion','Tops',                   'womens-fashion-tops',              5),
    ('womens-fashion','Dresses',                'womens-fashion-dresses',           6),
    ('womens-fashion','Traditional Wear',       'womens-fashion-traditional',       7),
    ('womens-fashion','Winter Clothing',        'womens-fashion-winter',            8),
    ('womens-fashion','Lingerie & Sleepwear',   'womens-fashion-lingerie',          9),
    ('womens-fashion','Shoes',                  'womens-fashion-shoes',            10),
    ('womens-fashion','Sandals',                'womens-fashion-sandals',          11),
    ('womens-fashion','Sportswear',             'womens-fashion-sportswear',       12),
    ('womens-fashion','Accessories',            'womens-fashion-accessories',      13),

    -- Men's Fashion
    ('mens-fashion','T-Shirts',                 'mens-fashion-tshirts',             1),
    ('mens-fashion','Polo Shirts',              'mens-fashion-polo',                2),
    ('mens-fashion','Shirts',                   'mens-fashion-shirts',              3),
    ('mens-fashion','Panjabi & Fatua',          'mens-fashion-panjabi',             4),
    ('mens-fashion','Pants',                    'mens-fashion-pants',               5),
    ('mens-fashion','Jeans',                    'mens-fashion-jeans',               6),
    ('mens-fashion','Shorts',                   'mens-fashion-shorts',              7),
    ('mens-fashion','Traditional Wear',         'mens-fashion-traditional',         8),
    ('mens-fashion','Winter Clothing',          'mens-fashion-winter',              9),
    ('mens-fashion','Innerwear & Sleepwear',    'mens-fashion-innerwear',          10),
    ('mens-fashion','Formal Shoes',             'mens-fashion-formal-shoes',       11),
    ('mens-fashion','Sneakers',                 'mens-fashion-sneakers',           12),
    ('mens-fashion','Sandals & Flip-Flops',     'mens-fashion-sandals',            13),
    ('mens-fashion','Sportswear',               'mens-fashion-sportswear',         14),
    ('mens-fashion','Accessories',              'mens-fashion-accessories',        15),

    -- Watches, Bags & Jewellery
    ('watches-bags-jewellery','Men''s Watches',      'wbj-mens-watches',       1),
    ('watches-bags-jewellery','Women''s Watches',    'wbj-womens-watches',     2),
    ('watches-bags-jewellery','Kids Watches',        'wbj-kids-watches',       3),
    ('watches-bags-jewellery','Sunglasses & Eyewear','wbj-eyewear',            4),
    ('watches-bags-jewellery','Women''s Bags',       'wbj-womens-bags',        5),
    ('watches-bags-jewellery','Men''s Bags',         'wbj-mens-bags',          6),
    ('watches-bags-jewellery','Backpacks',           'wbj-backpacks',          7),
    ('watches-bags-jewellery','Luggage',             'wbj-luggage',            8),
    ('watches-bags-jewellery','Fashion Jewellery',   'wbj-fashion-jewellery',  9),
    ('watches-bags-jewellery','Fine Jewellery',      'wbj-fine-jewellery',    10),
    ('watches-bags-jewellery','Wallets',             'wbj-wallets',           11),

    -- Mother & Baby
    ('mother-baby','Diapers & Potty',          'mb-diapers',              1),
    ('mother-baby','Baby Feeding',             'mb-feeding',              2),
    ('mother-baby','Milk Formula',             'mb-milk-formula',         3),
    ('mother-baby','Baby & Toddler Food',      'mb-toddler-food',         4),
    ('mother-baby','Baby Personal Care',       'mb-baby-care',            5),
    ('mother-baby','Baby Clothing',            'mb-baby-clothing',        6),
    ('mother-baby','Baby Gear',                'mb-gear',                 7),
    ('mother-baby','Nursery',                  'mb-nursery',              8),
    ('mother-baby','Maternity Care',           'mb-maternity',            9),
    ('mother-baby','Toys & Games',             'mb-toys-games',          10),
    ('mother-baby','Educational Toys',         'mb-educational-toys',    11),

    -- Home & Lifestyle
    ('home-lifestyle','Bedding & Bath',        'home-bedding-bath',       1),
    ('home-lifestyle','Home Decor',            'home-decor',              2),
    ('home-lifestyle','Kitchenware',           'home-kitchenware',        3),
    ('home-lifestyle','Cookware',              'home-cookware',           4),
    ('home-lifestyle','Dining & Serveware',    'home-dining',             5),
    ('home-lifestyle','Furniture',             'home-furniture',          6),
    ('home-lifestyle','Lighting',              'home-lighting',           7),
    ('home-lifestyle','Tools & DIY',           'home-tools-diy',          8),
    ('home-lifestyle','Laundry & Cleaning',    'home-laundry-cleaning',   9),
    ('home-lifestyle','Storage & Organization','home-storage',           10),
    ('home-lifestyle','Stationery & Crafts',   'home-stationery',        11),
    ('home-lifestyle','Books',                 'home-books',             12),
    ('home-lifestyle','Party Supplies',        'home-party',             13),

    -- Electronic Devices
    ('electronic-devices','Mobiles',                    'ed-mobiles',           1),
    ('electronic-devices','Tablets',                    'ed-tablets',           2),
    ('electronic-devices','Laptops',                    'ed-laptops',           3),
    ('electronic-devices','Desktops',                   'ed-desktops',          4),
    ('electronic-devices','Gaming Consoles',            'ed-gaming-consoles',   5),
    ('electronic-devices','DSLR & Mirrorless Cameras',  'ed-dslr',              6),
    ('electronic-devices','Point & Shoot Cameras',      'ed-cameras',           7),
    ('electronic-devices','Action Cameras',             'ed-action-cams',       8),
    ('electronic-devices','Drones',                     'ed-drones',            9),
    ('electronic-devices','Wearable Tech',              'ed-wearable',         10),
    ('electronic-devices','Smart Watches',              'ed-smartwatch',       11),

    -- TV & Home Appliances
    ('tv-home-appliances','Televisions',        'tvha-tvs',              1),
    ('tv-home-appliances','Home Audio',         'tvha-home-audio',       2),
    ('tv-home-appliances','Projectors',         'tvha-projectors',       3),
    ('tv-home-appliances','Air Conditioners',   'tvha-ac',               4),
    ('tv-home-appliances','Refrigerators',      'tvha-fridge',           5),
    ('tv-home-appliances','Freezers',           'tvha-freezer',          6),
    ('tv-home-appliances','Washing Machines',   'tvha-washing',          7),
    ('tv-home-appliances','Kitchen Appliances', 'tvha-kitchen-app',      8),
    ('tv-home-appliances','Microwaves & Ovens', 'tvha-microwaves',       9),
    ('tv-home-appliances','Water Purifiers',    'tvha-water-purifiers', 10),
    ('tv-home-appliances','Vacuum Cleaners',    'tvha-vacuum',          11),
    ('tv-home-appliances','Fans',               'tvha-fans',            12),
    ('tv-home-appliances','Irons',              'tvha-irons',           13),
    ('tv-home-appliances','Personal Care Appliances','tvha-personal',   14),

    -- Electronic Accessories
    ('electronic-accessories','Mobile Accessories',   'ea-mobile-acc',       1),
    ('electronic-accessories','Phone Cases',          'ea-phone-cases',      2),
    ('electronic-accessories','Screen Protectors',    'ea-screen-prot',      3),
    ('electronic-accessories','Chargers & Cables',    'ea-chargers',         4),
    ('electronic-accessories','Power Banks',          'ea-power-banks',      5),
    ('electronic-accessories','Headphones & Earbuds', 'ea-headphones',       6),
    ('electronic-accessories','Bluetooth Speakers',   'ea-bt-speakers',      7),
    ('electronic-accessories','Wearable Accessories', 'ea-wearable-acc',     8),
    ('electronic-accessories','Camera Accessories',   'ea-camera-acc',       9),
    ('electronic-accessories','Storage & Memory',     'ea-storage',         10),
    ('electronic-accessories','Computer Accessories', 'ea-computer-acc',    11),
    ('electronic-accessories','Printers & Ink',       'ea-printers',        12),
    ('electronic-accessories','Networking Devices',   'ea-networking',      13),
    ('electronic-accessories','Gaming Accessories',   'ea-gaming-acc',      14),

    -- Health & Beauty
    ('health-beauty','Skin Care',           'hb-skincare',          1),
    ('health-beauty','Hair Care',           'hb-haircare',          2),
    ('health-beauty','Makeup',              'hb-makeup',            3),
    ('health-beauty','Fragrances',          'hb-fragrances',        4),
    ('health-beauty','Bath & Body',         'hb-bath-body',         5),
    ('health-beauty','Men''s Grooming',     'hb-mens-grooming',     6),
    ('health-beauty','Beauty Tools',        'hb-beauty-tools',      7),
    ('health-beauty','Personal Care',       'hb-personal-care',     8),
    ('health-beauty','Health Supplements',  'hb-supplements',       9),
    ('health-beauty','Medical Supplies',    'hb-medical',          10),
    ('health-beauty','Sexual Wellness',     'hb-sexual-wellness',  11),
    ('health-beauty','Oral Care',           'hb-oral-care',        12),

    -- Groceries & Pets
    ('groceries-pets','Rice, Pasta & Noodles',  'gp-rice-pasta',      1),
    ('groceries-pets','Cooking Essentials',     'gp-cooking',         2),
    ('groceries-pets','Snacks',                 'gp-snacks',          3),
    ('groceries-pets','Beverages',              'gp-beverages',       4),
    ('groceries-pets','Breakfast Foods',        'gp-breakfast',       5),
    ('groceries-pets','Dairy & Chilled',        'gp-dairy',           6),
    ('groceries-pets','Frozen Foods',           'gp-frozen',          7),
    ('groceries-pets','Baking Needs',           'gp-baking',          8),
    ('groceries-pets','Canned & Jarred',        'gp-canned',          9),
    ('groceries-pets','Dog Food & Supplies',    'gp-dog-supplies',   10),
    ('groceries-pets','Cat Food & Supplies',    'gp-cat-supplies',   11),
    ('groceries-pets','Fish & Aquatics',        'gp-fish-aquatics',  12),
    ('groceries-pets','Bird Supplies',          'gp-bird-supplies',  13),

    -- Sports & Outdoor
    ('sports-outdoor','Exercise & Fitness',     'so-fitness',         1),
    ('sports-outdoor','Cycling',                'so-cycling',         2),
    ('sports-outdoor','Team Sports',            'so-team-sports',     3),
    ('sports-outdoor','Cricket',                'so-cricket',         4),
    ('sports-outdoor','Football',               'so-football',        5),
    ('sports-outdoor','Badminton',              'so-badminton',       6),
    ('sports-outdoor','Racket Sports',          'so-racket',          7),
    ('sports-outdoor','Water Sports',           'so-water-sports',    8),
    ('sports-outdoor','Camping & Hiking',       'so-camping',         9),
    ('sports-outdoor','Fishing',                'so-fishing',        10),
    ('sports-outdoor','Sports Shoes',           'so-shoes',          11),
    ('sports-outdoor','Sports Apparel',         'so-apparel',        12),
    ('sports-outdoor','Sports Accessories',     'so-accessories',    13),

    -- Automotive & Motorbike
    ('automotive-motorbike','Automotive Tools',     'am-tools',           1),
    ('automotive-motorbike','Car Care',             'am-car-care',        2),
    ('automotive-motorbike','Car Electronics',      'am-car-electronics', 3),
    ('automotive-motorbike','Interior Accessories', 'am-interior',        4),
    ('automotive-motorbike','Exterior Accessories', 'am-exterior',        5),
    ('automotive-motorbike','Car Safety',           'am-car-safety',      6),
    ('automotive-motorbike','Auto Oils & Fluids',   'am-oils',            7),
    ('automotive-motorbike','Auto Parts & Spares',  'am-parts',           8),
    ('automotive-motorbike','Motorbike Helmets',    'am-helmets',         9),
    ('automotive-motorbike','Motorbike Riding Gear','am-riding-gear',    10),
    ('automotive-motorbike','Motorbike Accessories','am-moto-acc',       11),
    ('automotive-motorbike','Motorbike Parts',      'am-moto-parts',     12),
    ('automotive-motorbike','Motorbike Tyres',      'am-moto-tyres',     13)
)
INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT s.name, s.slug, p.id, s.sort_order
FROM subs s
JOIN public.categories p ON p.slug = s.parent_slug;
