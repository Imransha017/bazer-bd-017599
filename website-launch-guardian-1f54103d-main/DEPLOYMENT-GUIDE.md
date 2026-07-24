# 🚀 ওয়েবসাইট ডিপ্লয়মেন্ট গাইড (বাংলা)

## সম্পূর্ণ ধাপে ধাপে গাইড - GitHub → Supabase → Vercel

---

## 📌 ধাপ ১: প্রয়োজনীয় অ্যাকাউন্ট তৈরি করা

### 1️⃣ GitHub অ্যাকাউন্ট তৈরি (ফ্রি)
1. ওয়েবসাইটে যান: https://github.com/signup
2. আপনার ইমেইল দিন এবং একটি ইউজারনেম ও পাসওয়ার্ড তৈরি করুন
3. ইমেইল ভেরিফাই করুন
4. **Free plan** সিলেক্ট করুন (এটাই যথেষ্ট)

### 2️⃣ Supabase অ্যাকাউন্ট তৈরি (ফ্রি)
1. ওয়েবসাইটে যান: https://supabase.com/dashboard/sign-up
2. GitHub দিয়ে সাইন আপ করুন (সহজ উপায়)
3. অথবা ইমেইল দিয়ে সাইন আপ করুন
4. **Free Tier** ($0/month) - এতে আছে:
   - 500MB ডাটাবেস
   - 1GB Storage
   - 50,000 monthly active users
   - SSL/TLS automatically

### 3️⃣ Vercel অ্যাকাউন্ট তৈরি (ফ্রি)
1. ওয়েবসাইটে যান: https://vercel.com/signup
2. GitHub দিয়ে সাইন আপ করুন (সবচেয়ে ভালো)
3. **Hobby plan** (ফ্রি) - এতে আছে:
   - 100GB bandwidth
   - 6000 build minutes/month
   - SSL/TLS automatically
   - Custom domains support

---

## 📌 ধাপ ২: কোড GitHub এ আপলোড করা

### VS Code থেকে GitHub এ Push করার নিয়ম:

```bash
# 1. প্রথমে VS Code টার্মিনাল খুলুন (Terminal > New Terminal)

# 2. Git কনফিগার করুন (একবার করলেই হবে)
git config --global user.name "আপনার নাম"
git config --global user.email "আপনার-ইমেইল@gmail.com"

# 3. GitHub এ নতুন Repository তৈরি করুন:
#    - GitHub এ লগইন করুন
#    - উপরে ডান পাশে "+" আইকনে ক্লিক করুন → "New repository"
#    - Repository name দিন (যেমন: bazar-bd)
#    - "Public" সিলেক্ট করুন
#    - "Create repository" বাটনে ক্লিক করুন

# 4. এখন VS Code টার্মিনালে এই কমান্ডগুলো দিন:
cd "c:/Users/Emran Hossan/Downloads/website-launch-guardian-1f54103d-main"
git init
git add .
git commit -m "Initial commit - Bazar BD e-commerce website"

# 5. GitHub এর সাথে কানেক্ট করুন (আপনার ইউজারনেম ও রিপো নাম দিয়ে):
git branch -M main
git remote add origin https://github.com/আপনার-ইউজারনেম/bazar-bd.git
git push -u origin main
```

---

## 📌 ধাপ ৩: Supabase প্রজেক্ট সেটআপ

### 3.1 Supabase এ নতুন প্রজেক্ট তৈরি

1. **Supabase Dashboard** এ লগইন করুন: https://supabase.com/dashboard
2. **"New project"** বাটনে ক্লিক করুন
3. নিচের তথ্য দিন:
   - **Name**: `bazar-bd` (যেকোনো নাম দিতে পারেন)
   - **Database Password**: একটি শক্তিশালী পাসওয়ার্ড দিন (নোট করে রাখুন!)
   - **Region**: `Singapore` (বাংলাদেশের জন্য সবচেয়ে কাছের)
   - **Pricing Plan**: Free Tier
4. **"Create new project"** ক্লিক করুন
5. **২-৩ মিনিট অপেক্ষা করুন** (প্রজেক্ট তৈরি হতে সময় লাগে)

### 3.2 Environment Variables সংগ্রহ

প্রজেক্ট তৈরি হয়ে গেলে, বাম পাশের মেনু থেকে **Project Settings** (⚙️) এ যান:

1. **Project Settings > API** এ যান
2. নিচের তথ্যগুলো কপি করে নোট করুন:
   
```
   Project URL: https://xxxxxxxxxxxx.supabase.co
   Anon/Public Key: eyJhbGciOiJIUzI1NiIs...
   Service Role Key: eyJhbGciOiJIUzI1NiIs...  (এটি দেখতে "Reveal" বাটনে ক্লিক করুন)
   
```

### 3.3 Database Migrations Run করা

**Option A: Supabase CLI ব্যবহার করে (সহজ)**

```bash
# Supabase CLI ইনস্টল করুন (Windows)
# PowerShell বা CMD Admin mode এ খুলুন:
winget install supabase.cli

# অথবা npm দিয়ে:
npm install -g supabase

# তারপর:
cd "c:/Users/Emran Hossan/Downloads/website-launch-guardian-1f54103d-main"
supabase link --project-ref আপনার-প্রজেক্ট-রেফারেন্স
supabase db push
```

**Option B: Supabase SQL Editor ব্যবহার করে (সহজতর)**

1. Supabase Dashboard এ আপনার প্রজেক্টে যান
2. বাম পাশের মেনু থেকে **SQL Editor** এ ক্লিক করুন
3. **"New Query"** বাটনে ক্লিক করুন
4. নিচের ফাইলগুলোর কন্টেন্ট একে একে কপি করে SQL Editor এ পেস্ট করুন এবং **Run** বাটনে ক্লিক করুন:
   - `supabase/migrations/` ফোল্ডারের সব `.sql` ফাইল
   - **ক্রম অনুযায়ী Run করতে হবে** (ফাইলের নামের তারিখ অনুযায়ী)

### 3.4 Supabase Storage Buckets তৈরি

1. Supabase Dashboard এ **Storage** মেনুতে যান
2. নিচের buckets তৈরি করুন:
   - `product-images` (public)
   - `banners` (public)
   - `vendor-documents` (private)
   - `avatars` (public)
3. প্রতিটি bucket এর জন্য **RLS Policies** সেট করুন:
   - Public buckets: "Allow public read"
   - Private buckets: "Allow authenticated users only"

---

## 📌 ধাপ ৪: Vercel এ ডিপ্লয় করা

### 4.1 Vercel এ প্রজেক্ট ইম্পোর্ট

1. **Vercel Dashboard** এ লগইন করুন: https://vercel.com/dashboard
2. **"Add New..." > "Project"** বাটনে ক্লিক করুন
3. **GitHub** এর সাথে কানেক্ট করুন (Allow permissions)
4. আপনার রিপোজিটরি সিলেক্ট করুন (যেটা GitHub এ push করেছেন)
5. নিচের সেটিংস দিন:

### 4.2 Environment Variables সেট করা

Vercel এর **Environment Variables** সেকশনে নিচের ভেরিয়েবলগুলো যোগ করুন:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_SUPABASE_URL` | আপনার Supabase Project URL | All |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | আপনার Supabase Anon Key | All |
| `SUPABASE_URL` | আপনার Supabase Project URL | All |
| `SUPABASE_PUBLISHABLE_KEY` | আপনার Supabase Anon Key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | আপনার Supabase Service Role Key | All |

### 4.3 Build Settings

```json
{
  "Framework Preset": "Other",
  "Build Command": "npm run build",
  "Output Directory": ".vercel/output/static",
  "Install Command": "npm install",
  "Node.js Version": "22.x"
}
```

### 4.4 Deploy বাটনে ক্লিক করুন!

1. **"Deploy"** বাটনে ক্লিক করুন
2. ২-৩ মিনিট অপেক্ষা করুন
3. ✅ **Congratulations!** আপনার ওয়েবসাইট লাইভ!

---

## 📌 ধাপ ৫: কাস্টম ডোমেইন সেটআপ (ঐচ্ছিক)

### Vercel এ ডোমেইন যোগ করা:

1. Vercel Dashboard এ আপনার প্রজেক্টে যান
2. **Settings > Domains** এ যান
3. আপনার ডোমেইন টাইপ করুন (যেমন: `bazarbd.com`)
4. DNS সেটিংস আপডেট করুন (Vercel নির্দেশনা অনুসরণ করুন)

---

## 📌 ধাপ ৬: প্রথমবার চালু করার পর করণীয়

### 6.1 অ্যাডমিন অ্যাকাউন্ট তৈরি
1. আপনার ওয়েবসাইটে যান (Vercel দেয়া URL)
2. **Sign Up** করে একটি অ্যাকাউন্ট তৈরি করুন
3. Supabase Dashboard এ **SQL Editor** এ গিয়ে Run করুন:
```sql
-- আপনার ইউজার আইডি দিয়ে অ্যাডমিন রোল দিন
INSERT INTO user_roles (user_id, role)
VALUES ('আপনার-ইউজার-আইডি', 'admin');
```

### 6.2 সাইট সেটিংস কনফিগার
1. `/sys-x7k9-control.settings` এ গিয়ে সাইট সেটিংস কনফিগার করুন
2. পেমেন্ট গেটওয়ে সেটআপ করুন
3. শিপিং চার্জ সেটআপ করুন

---

## 🛠️ সমস্যা সমাধান (Troubleshooting)

### সাধারণ সমস্যা ও সমাধান:

| সমস্যা | সমাধান |
|--------|---------|
| **Build fail** | `npm install` করে node_modules আপডেট করুন |
| **Supabase connection error** | Environment Variables চেক করুন |
| **404 error** | Vercel এর `vercel.json` ফাইল চেক করুন |
| **Database error** | SQL migrations properly run হয়েছে কিনা চেক করুন |

### Locally Run করার নিয়ম:
```bash
cd "c:/Users/Emran Hossan/Downloads/website-launch-guardian-1f54103d-main"
npm install
npm run dev
```

---

## 📞 প্রয়োজনীয় লিংকসমূহ

| Service | Link |
|---------|------|
| GitHub Sign Up | https://github.com/signup |
| Supabase Sign Up | https://supabase.com/dashboard/sign-up |
| Vercel Sign Up | https://vercel.com/signup |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## ✅ চেকলিস্ট

- [ ] GitHub অ্যাকাউন্ট তৈরি
- [ ] Supabase অ্যাকাউন্ট তৈরি
- [ ] Vercel অ্যাকাউন্ট তৈরি
- [ ] কোড GitHub এ Push করা
- [ ] Supabase প্রজেক্ট তৈরি
- [ ] Database Migrations Run করা
- [ ] Storage Buckets তৈরি
- [ ] Vercel এ Deploy করা
- [ ] Environment Variables সেট করা
- [ ] অ্যাডমিন অ্যাকাউন্ট তৈরি
- [ ] সাইট কনফিগার করা

---

> **💡 টিপস:** 
> - সবকিছু ফ্রি! কোনো পেমেন্ট লাগবে না
> - প্রতিটি ধাপ শেষে নিশ্চিত হয়ে নিন যে কাজ হয়েছে
> - কোনো সমস্যা হলে আমাকে জানান, আমি সাহায্য করব
