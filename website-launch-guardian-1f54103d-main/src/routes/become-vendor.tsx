import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { applyAsVendor, getMyVendor, vendorSlugify, type Vendor, type VendorApplyInput } from "@/lib/vendor";
import { uploadProductImage } from "@/lib/admin-api";
import { useProductImageUrl } from "@/components/ProductImage";
import { supabase } from "@/integrations/supabase/client";
import { BD_LOCATIONS } from "@/lib/bd-locations";
import { Store, Upload, CheckCircle2, Clock, XCircle, PartyPopper, User, Building2, MapPin, Landmark, ShieldCheck, Globe, Package, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/become-vendor")({
  head: () => ({ meta: [{ title: "Become a Vendor — Bazar BD" }, { name: "description", content: "Open your store on Bazar BD and start selling to thousands of customers." }] }),
  component: Page,
});

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual / Solo Seller" },
  { value: "proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "company", label: "Limited Company" },
];

const MOBILE_BANKING = [
  { value: "", label: "None" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "upay", label: "Upay" },
];

const DISTRICTS = Object.keys(BD_LOCATIONS).sort();

function Page() {
  const { user, loading } = useAuth();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);

  // Auth fields (only when not logged in)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Owner
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dob, setDob] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [nidFront, setNidFront] = useState<string | null>(null);
  const [nidBack, setNidBack] = useState<string | null>(null);

  // Store
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [expectedProducts, setExpectedProducts] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Business
  const [businessType, setBusinessType] = useState("individual");
  const [tradeLicense, setTradeLicense] = useState("");
  const [tin, setTin] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  // Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Payout
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [mbType, setMbType] = useState("");
  const [mbNumber, setMbNumber] = useState("");

  // Social
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  // Terms
  const [agreedTerms, setAgreedTerms] = useState(false);

  const thanaOptions = useMemo(() => (district ? BD_LOCATIONS[district] ?? [] : []), [district]);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    setEmail(user.email ?? "");
    getMyVendor().then(v => { setVendor(v); setChecking(false); });
  }, [user]);

  if (loading || checking) return <SiteLayout><div className="p-12 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;

  if (justSubmitted) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg p-6">
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-amber-50 p-8 text-center shadow-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <PartyPopper className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-primary">অভিনন্দন! 🎉</h1>
            <h2 className="mt-1 text-lg font-bold">Application Submitted</h2>
            <p className="mt-3 text-sm text-foreground">আপনার ভেন্ডর আবেদন সফলভাবে জমা হয়েছে।</p>
            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-left">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Awaiting Admin Approval</span>
              </div>
              <p className="mt-2 text-xs text-amber-900">
                অ্যাডমিন অনুমোদন হলে আপনি লগইন করে ভেন্ডর ড্যাশবোর্ড ব্যবহার করতে পারবেন। ইমেইল কনফার্মেশন প্রয়োজন হলে অনুগ্রহ করে আপনার ইমেইল চেক করুন।
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link to="/" className="rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Back to Home</Link>
              <Link to="/auth" className="rounded border px-6 py-2 text-sm font-bold">Go to Login</Link>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (vendor) {
    const status = vendor.status;
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg p-6">
          <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
            {status === "approved" && <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />}
            {status === "pending" && <Clock className="mx-auto h-12 w-12 text-amber-500" />}
            {(status === "rejected" || status === "suspended") && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
            <h1 className="mt-3 text-xl font-bold">{vendor.store_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Status: <span className="font-semibold capitalize">{status}</span></p>
            {status === "pending" && <p className="mt-3 text-sm">Your application is under review. We'll notify you once approved.</p>}
            {status === "approved" && (
              <Link to="/vendor" className="mt-4 inline-block rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Go to Vendor Dashboard</Link>
            )}
            {status === "rejected" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-destructive">Your application was rejected.</p>
                {vendor.rejection_reason && (
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-left text-xs">
                    <div className="mb-1 font-semibold text-destructive">Reason from admin:</div>
                    <div className="text-foreground">{vendor.rejection_reason}</div>
                  </div>
                )}
              </div>
            )}
            {status === "suspended" && <p className="mt-3 text-sm text-destructive">Your store is suspended.</p>}
          </div>
        </div>
      </SiteLayout>
    );
  }

  // Ensure an authenticated session exists — creates the account on-demand
  // using the Step 1 credentials so image uploads can pass storage RLS.
  const ensureAuth = async (): Promise<boolean> => {
    const { data: existing } = await supabase.auth.getUser();
    if (existing.user) return true;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("প্রথমে উপরে একটি বৈধ ইমেইল দিন, তারপর ইমেজ আপলোড করুন");
      setStep(1);
      return false;
    }
    if (password.length < 6) {
      toast.error("প্রথমে উপরে পাসওয়ার্ড (৬+ অক্ষর) দিন, তারপর ইমেজ আপলোড করুন");
      setStep(1);
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match — উপরে ঠিক করে তারপর আপলোড করুন");
      setStep(1);
      return false;
    }

    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: fullName.trim() },
        },
      });
      if (signUpErr && !/registered|exists/i.test(signUpErr.message)) throw signUpErr;
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        toast.error("Account created. অনুগ্রহ করে ইমেইল কনফার্ম করে লগইন করুন, তারপর আপলোড করুন।");
        return false;
      }
      toast.success("Account created — এখন ইমেজ আপলোড করতে পারবেন");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create account");
      return false;
    }
  };

  const handleUpload = async (file: File, setter: (s: string) => void) => {
    try {
      const ok = await ensureAuth();
      if (!ok) return;
      const url = await uploadProductImage(file);
      setter(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  // ---- Validation per step ----
  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!user) {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Valid email required";
        if (password.length < 6) return "Password must be at least 6 characters";
        if (password !== confirmPassword) return "Passwords do not match";
      }
      if (!fullName.trim()) return "Full name required";
      if (!/^01\d{9}$/.test(phone.trim())) return "Valid 11-digit phone required";
      if (!dob) return "Date of birth required";
      if (!/^(\d{10}|\d{13}|\d{17})$/.test(nidNumber.trim())) return "NID must be 10, 13, or 17 digits";
    }
    if (s === 2) {
      if (!storeName.trim()) return "Store name required";
      if (!slug.trim()) return "Store URL slug required";
    }
    if (s === 3) {
      if (!address.trim()) return "Pickup address required";
      if (!district) return "District required";
      if (!thana) return "Thana / Upazila required";
    }
    if (s === 4) {
      const hasBank = bankName.trim() && bankAccountNumber.trim();
      const hasMb = mbType && mbNumber.trim();
      if (!hasBank && !hasMb) return "Provide either bank account OR mobile banking details for payout";
    }
    if (s === 5) {
      if (!agreedTerms) return "You must agree to the terms";
    }
    return null;
  };

  const next = async () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step === 1 && !user) {
      setSubmitting(true);
      try {
        const ok = await ensureAuth();
        if (!ok) return;
      } finally {
        setSubmitting(false);
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    for (let s = 1; s <= 5; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); toast.error(err); return; }
    }
    setSubmitting(true);
    try {
      // 1) Ensure the user has an auth account (check live session, not stale hook state)
      let signedUpNow = false;
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      if (!existingUser) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName.trim() },
          },
        });
        const alreadyExists = signUpErr && /registered|exists|already/i.test(signUpErr.message);
        const rateLimited = signUpErr && /security purposes|rate/i.test(signUpErr.message);
        if (signUpErr && !alreadyExists && !rateLimited) {
          throw signUpErr;
        }
        signedUpNow = !signUpErr;

        // Try to establish a session immediately so the insert has auth.uid()
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) {
          if (alreadyExists) {
            toast.error("এই ইমেইলে ইতিমধ্যে একটি একাউন্ট আছে। সঠিক পাসওয়ার্ড দিন, অথবা প্রথমে লগইন করে তারপর ভেন্ডর আবেদন করুন।");
          } else if (rateLimited) {
            toast.error("অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন (rate limit)।");
          } else {
            toast.error(signInErr.message || "সাইন-ইন ব্যর্থ হয়েছে।");
          }
          setStep(1);
          return;
        }
      }

      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) {
        toast.error("সেশন তৈরি করা যায়নি। অনুগ্রহ করে প্রথমে লগইন করে তারপর আবেদন করুন।");
        setStep(1);
        return;
      }


      const payload: VendorApplyInput = {
        store_name: storeName.trim(),
        slug: slug.trim() || vendorSlugify(storeName),
        description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        nid_number: nidNumber.trim(),
        date_of_birth: dob,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        full_name: fullName.trim(),
        email: email.trim() || current.email || "",
        whatsapp: whatsapp.trim(),
        alt_phone: altPhone.trim(),
        city: city.trim(),
        district,
        thana,
        postal_code: postalCode.trim(),
        country: "Bangladesh",
        business_type: businessType,
        trade_license: tradeLicense.trim(),
        tin_number: tin.trim(),
        vat_number: vatNumber.trim(),
        bank_name: bankName.trim(),
        bank_account_name: bankAccountName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_branch: bankBranch.trim(),
        bank_routing: bankRouting.trim(),
        mobile_banking_type: mbType,
        mobile_banking_number: mbNumber.trim(),
        nid_front_url: nidFront,
        nid_back_url: nidBack,
        website: website.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        main_category: mainCategory.trim(),
        expected_products: expectedProducts ? Number(expectedProducts) : undefined,
        agreed_terms: agreedTerms,
      };

      await applyAsVendor(payload);
      toast.success(signedUpNow ? "Account created & application submitted!" : "Application submitted!");
      setJustSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const steps = [
    { n: 1, label: "Owner", icon: User },
    { n: 2, label: "Store", icon: Store },
    { n: 3, label: "Address", icon: MapPin },
    { n: 4, label: "Payout", icon: Landmark },
    { n: 5, label: "Review", icon: ShieldCheck },
  ];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl p-3 md:p-6">
        {/* Hero */}
        <div className="mb-4 rounded-2xl bg-gradient-brand p-5 text-brand-foreground shadow-lg md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-white/20">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">Open Your Store on Bazar BD</h1>
              <p className="text-xs opacity-90 md:text-sm">Reach millions of customers — list products, receive orders, get paid.</p>
            </div>
          </div>
          {!user && (
            <div className="mt-3 rounded-lg bg-white/15 p-2.5 text-[11px] backdrop-blur">
              Already have an account? <Link to="/auth" className="font-bold underline">Sign in</Link> to continue your application.
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-4 flex items-center justify-between overflow-x-auto rounded-xl border bg-card p-2">
          {steps.map((s, idx) => {
            const Ico = s.icon;
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} className="flex flex-1 items-center">
                <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`grid size-6 place-items-center rounded-full text-[10px] ${active ? "bg-white/25" : done ? "bg-primary/15" : "bg-muted"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ico className="h-3.5 w-3.5" />}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-6">
          {/* STEP 1: Account + Owner */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionHeader icon={User} title="Owner & Account" subtitle="আপনার পরিচয় ও লগইন তথ্য" />

              {!user && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-primary">Create your login</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Email *">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
                    </Field>
                    <Field label="Password *">
                      <div className="relative">
                        <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls + " pr-9"} placeholder="Min. 6 characters" />
                        <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Confirm Password *">
                      <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Re-type password" />
                    </Field>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Full Name *">
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="As per NID" />
                </Field>
                <Field label="Contact Phone *">
                  <input value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="01XXXXXXXXX" />
                </Field>
                <Field label="WhatsApp Number">
                  <input value={whatsapp} maxLength={14} onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+]/g, ""))} className={inputCls} placeholder="Optional" />
                </Field>
                <Field label="Alternate Phone">
                  <input value={altPhone} maxLength={14} onChange={(e) => setAltPhone(e.target.value.replace(/[^\d+]/g, ""))} className={inputCls} placeholder="Optional" />
                </Field>
                <Field label="Date of Birth *">
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={inputCls} />
                </Field>
                <Field label="NID Number *">
                  <input value={nidNumber} maxLength={17} onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="10 / 13 / 17 digits" />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ImagePick label="NID Front Photo" url={nidFront} onPick={(f) => handleUpload(f, setNidFront)} />
                <ImagePick label="NID Back Photo" url={nidBack} onPick={(f) => handleUpload(f, setNidBack)} />
              </div>
            </div>
          )}

          {/* STEP 2: Store */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionHeader icon={Store} title="Store Details" subtitle="আপনার দোকানের পরিচয়" />

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Store Name *">
                  <input value={storeName} onChange={(e) => { setStoreName(e.target.value); if (!slug) setSlug(vendorSlugify(e.target.value)); }} className={inputCls} placeholder="e.g. Rahim's Electronics" />
                </Field>
                <Field label="Store URL *">
                  <div className="flex items-center overflow-hidden rounded-lg border">
                    <span className="bg-muted px-2 py-2 text-[11px] text-muted-foreground">/store/</span>
                    <input value={slug} onChange={(e) => setSlug(vendorSlugify(e.target.value))} className="w-full bg-transparent px-2 py-2 text-sm font-mono outline-none" />
                  </div>
                </Field>
                <Field label="Main Category">
                  <input value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={inputCls} placeholder="e.g. Fashion, Electronics" />
                </Field>
                <Field label="Expected # of Products">
                  <input type="number" min={0} value={expectedProducts} onChange={(e) => setExpectedProducts(e.target.value)} className={inputCls} placeholder="e.g. 50" />
                </Field>
              </div>

              <Field label="Store Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Tell customers about your store" />
              </Field>

              <div className="rounded-xl border border-dashed p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Building2 className="h-4 w-4 text-primary" /> Business Info</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Business Type">
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputCls}>
                      {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Trade License Number">
                    <input value={tradeLicense} onChange={(e) => setTradeLicense(e.target.value)} className={inputCls} placeholder="Optional for individuals" />
                  </Field>
                  <Field label="TIN Number">
                    <input value={tin} onChange={(e) => setTin(e.target.value)} className={inputCls} placeholder="Optional" />
                  </Field>
                  <Field label="VAT Registration">
                    <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={inputCls} placeholder="Optional" />
                  </Field>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ImagePick label="Store Logo" url={logoUrl} onPick={(f) => handleUpload(f, setLogoUrl)} />
                <ImagePick label="Store Banner" url={bannerUrl} onPick={(f) => handleUpload(f, setBannerUrl)} />
              </div>
            </div>
          )}

          {/* STEP 3: Address & Social */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionHeader icon={MapPin} title="Pickup Address & Social" subtitle="পণ্য পিকআপ ও সোশ্যাল লিংক" />

              <Field label="Pickup / Warehouse Address *">
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputCls} placeholder="House, Road, Area" />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="District *">
                  <select value={district} onChange={(e) => { setDistrict(e.target.value); setThana(""); }} className={inputCls}>
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Thana / Upazila *">
                  <select value={thana} onChange={(e) => setThana(e.target.value)} disabled={!district} className={inputCls + " disabled:opacity-50"}>
                    <option value="">Select thana</option>
                    {thanaOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="City / Area">
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="e.g. Mirpur" />
                </Field>
                <Field label="Postal Code">
                  <input value={postalCode} maxLength={10} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} placeholder="e.g. 1216" />
                </Field>
              </div>

              <div className="rounded-xl border border-dashed p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Globe className="h-4 w-4 text-primary" /> Social & Web (optional)</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" /></Field>
                  <Field label="Facebook"><input value={facebook} onChange={(e) => setFacebook(e.target.value)} className={inputCls} placeholder="fb.com/…" /></Field>
                  <Field label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputCls} placeholder="@handle" /></Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Payout */}
          {step === 4 && (
            <div className="space-y-4">
              <SectionHeader icon={Landmark} title="Payout Details" subtitle="বিক্রির টাকা কোথায় পাঠাবো?" />
              <p className="text-[11px] text-muted-foreground">অনুগ্রহ করে ব্যাংক অ্যাকাউন্ট অথবা মোবাইল ব্যাংকিং — যেকোনো একটি (বা উভয়) দিন।</p>

              <div className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold">Bank Account</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Bank Name"><input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} placeholder="e.g. Dutch-Bangla Bank" /></Field>
                  <Field label="Account Holder Name"><input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className={inputCls} /></Field>
                  <Field label="Account Number"><input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={inputCls} /></Field>
                  <Field label="Branch"><input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className={inputCls} /></Field>
                  <Field label="Routing Number"><input value={bankRouting} onChange={(e) => setBankRouting(e.target.value)} className={inputCls} placeholder="9-digit routing" /></Field>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold">Mobile Banking</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Provider">
                    <select value={mbType} onChange={(e) => setMbType(e.target.value)} className={inputCls}>
                      {MOBILE_BANKING.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Account Number">
                    <input value={mbNumber} maxLength={14} onChange={(e) => setMbNumber(e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="01XXXXXXXXX" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & submit */}
          {step === 5 && (
            <div className="space-y-4">
              <SectionHeader icon={ShieldCheck} title="Review & Submit" subtitle="আবেদন যাচাই করে জমা দিন" />

              <div className="grid gap-2 rounded-xl border bg-muted/30 p-4 text-xs">
                <ReviewRow k="Owner" v={fullName} />
                <ReviewRow k="Phone" v={phone} />
                {!user && <ReviewRow k="Email" v={email} />}
                <ReviewRow k="Store" v={storeName + (slug ? ` (/store/${slug})` : "")} />
                <ReviewRow k="Business" v={BUSINESS_TYPES.find((b) => b.value === businessType)?.label ?? businessType} />
                <ReviewRow k="Address" v={[address, thana, district, postalCode].filter(Boolean).join(", ")} />
                <ReviewRow k="Payout" v={[bankName && `${bankName} • ${bankAccountNumber}`, mbType && `${mbType.toUpperCase()} • ${mbNumber}`].filter(Boolean).join(" | ") || "—"} />
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-amber-50/60 p-3">
                <Package className="h-4 w-4 text-amber-700" />
                <p className="text-xs text-amber-900">Default commission: <b>10%</b> per sale (admin may adjust).</p>
              </div>

              <label className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm">
                <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5" />
                <span className="text-xs">I agree to Bazar BD's <b>Vendor Terms</b>, commission policy, and confirm that the information provided is accurate. আমি বাজার-বিডির ভেন্ডর শর্তাবলীতে সম্মত।</span>
              </label>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button onClick={back} disabled={step === 1} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40">Back</button>
            {step < 5 ? (
              <button onClick={next} className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow hover:brightness-110">Next</button>
            ) : (
              <button onClick={submit} disabled={submitting || !agreedTerms} className="rounded-lg bg-gradient-to-r from-primary to-primary/80 px-6 py-2.5 text-sm font-bold text-primary-foreground shadow disabled:opacity-50">
                {submitting ? "Submitting…" : (user ? "Submit Application" : "Create Account & Submit")}
              </button>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30";

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 border-b pb-2">
      <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="max-w-[65%] text-right font-medium">{v || "—"}</span>
    </div>
  );
}

function ImagePick({ label, url, onPick }: { label: string; url: string | null; onPick: (f: File) => void }) {
  const resolved = useProductImageUrl(url);
  return (
    <label className="block cursor-pointer">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 hover:bg-muted">
        {resolved ? <img src={resolved} alt="" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}
