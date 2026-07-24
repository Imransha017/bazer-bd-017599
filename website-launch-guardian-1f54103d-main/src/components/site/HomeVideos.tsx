import { useEffect, useState } from "react";
import { PlayCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VideoBanner = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string; // video URL
  link_url: string;
  button_label: string | null;
  button_link: string | null;
};

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1&playsinline=1` : null;
}

export function HomeVideos() {
  const [items, setItems] = useState<VideoBanner[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("banners")
        .select("*")
        .eq("active", true)
        .eq("placement", "home_video")
        .order("sort_order");
      setItems((data as VideoBanner[]) ?? []);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-none pt-3">
      <div className="overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-3 shadow-card md:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-white md:text-base">
            <PlayCircle className="size-4 md:size-5" /> Featured Videos
          </h2>
          <span className="text-[10px] text-white/70 md:text-[11px]">Sponsored</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
          {items.map((v) => {
            const yt = youtubeEmbed(v.image_url);
            const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(v.image_url) || !!yt;
            return (
              <div key={v.id} className="group relative overflow-hidden rounded-md bg-black shadow-lg ring-1 ring-white/10">
                <div className="relative aspect-video">
                  {yt ? (
                    <iframe
                      src={yt}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={v.title}
                    />
                  ) : isVideo ? (
                    <video
                      src={v.image_url}
                      className="absolute inset-0 h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img src={v.image_url} alt={v.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 md:p-3">
                    <p className="text-xs font-extrabold text-white md:text-sm">{v.title}</p>
                    {v.subtitle ? <p className="mt-0.5 truncate text-[10px] text-white/85 md:text-xs">{v.subtitle}</p> : null}
                  </div>
                  {(v.button_label || v.link_url) ? (
                    <a
                      href={v.button_link || v.link_url || "#"}
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-900 shadow-md backdrop-blur hover:bg-white md:right-3 md:top-3 md:px-3 md:py-1.5 md:text-xs"
                    >
                      {v.button_label || "Shop now"} <ChevronRight className="size-3 md:size-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
