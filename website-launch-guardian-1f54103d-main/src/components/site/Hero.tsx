import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

type Banner = {
  id: string;
  placement: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_label?: string | null;
  button_link?: string | null;
  gradient_from: string;
  gradient_to: string;
};

const fallbackSlides: Banner[] = [
  { id: "f1", placement: "hero_slider", title: "Mobile Mega Offer", subtitle: "", image_url: hero1, link_url: "/category/electronics", gradient_from: "", gradient_to: "" },
  { id: "f2", placement: "hero_slider", title: "Fashion Bonanza", subtitle: "", image_url: hero2, link_url: "/category/fashion-women", gradient_from: "", gradient_to: "" },
  { id: "f3", placement: "hero_slider", title: "Home Essentials", subtitle: "", image_url: hero3, link_url: "/category/home", gradient_from: "", gradient_to: "" },
];

const fallbackSide: Banner[] = [
  { id: "fs1", placement: "hero_side", title: "Audio Fest", subtitle: "From ৳499", image_url: "", link_url: "/category/electronic-acc", gradient_from: "from-violet-500", gradient_to: "to-fuchsia-600" },
  { id: "fs2", placement: "hero_side", title: "Beauty Week", subtitle: "Up to 60% OFF", image_url: "", link_url: "/category/beauty", gradient_from: "from-rose-400", gradient_to: "to-pink-600" },
];

function resolveImg(u: string) {
  if (!u) return "";
  if (u.startsWith("/src/assets/hero-1.jpg")) return hero1;
  if (u.startsWith("/src/assets/hero-2.jpg")) return hero2;
  if (u.startsWith("/src/assets/hero-3.jpg")) return hero3;
  return u;
}

export function Hero() {
  const [slides, setSlides] = useState<Banner[]>(fallbackSlides);
  const [sides, setSides] = useState<Banner[]>(fallbackSide);
  const [i, setI] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .in("placement", ["hero_slider", "hero_side"])
        .order("sort_order");
      if (!data || data.length === 0) return;
      const sl = data.filter((b: any) => b.placement === "hero_slider");
      const sd = data.filter((b: any) => b.placement === "hero_side");
      if (sl.length) setSlides(sl as Banner[]);
      if (sd.length) setSides(sd as Banner[]);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % Math.max(1, slides.length)), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="mx-auto max-w-none pt-3 md:pt-4">
      <div className="grid grid-cols-[1fr_30%] gap-2 md:gap-3 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-md shadow-card">
          <div className="relative aspect-[1920/768]">
            {slides.map((s, idx) => (
              <a
                key={s.id}
                href={s.link_url || "#"}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? "auto" : "none" }}
              >
                <img src={resolveImg(s.image_url)} alt={s.title} className="size-full object-cover" width={1920} height={768} />
                {s.button_label ? (
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = s.button_link || s.link_url || "#"; }}
                    className="absolute bottom-8 left-4 md:left-8 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-lg hover:bg-white md:px-4 md:py-2 md:text-xs"
                  >
                    {s.button_label} <ChevronRight className="size-3.5" />
                  </span>
                ) : null}
              </a>
            ))}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-rows-2 gap-2 md:gap-3">
          {sides.map((b) => (
            <a
              key={b.id}
              href={b.link_url || "#"}
              className={`flex items-center justify-between rounded-md bg-gradient-to-br ${b.gradient_from} ${b.gradient_to} p-2 text-white shadow-card transition hover:scale-[1.02] md:p-4`}
            >
              <div className="min-w-0">
                <p className="hidden text-[11px] uppercase tracking-widest opacity-90 md:block">Daily Deal</p>
                <p className="truncate text-xs font-extrabold leading-tight md:text-lg">{b.title}</p>
                <p className="mt-0.5 truncate text-[10px] md:mt-1 md:text-xs">{b.subtitle}</p>
                {b.button_label ? (
                  <span
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = b.button_link || b.link_url || "#"; }}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-white md:px-2.5 md:py-1 md:text-[11px]"
                  >
                    {b.button_label}
                  </span>
                ) : null}
              </div>
              <ChevronRight className="size-4 shrink-0 opacity-80 md:size-6" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
