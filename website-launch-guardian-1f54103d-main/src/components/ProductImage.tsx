import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const PRODUCT_BUCKET = "products";
const SIGNED_URL_SECONDS = 60 * 60 * 24;
const CACHE_BUFFER_MS = 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const signedUrlCache = new Map<string, CacheEntry>();
const pendingSignedUrls = new Map<string, Promise<string>>();

export function getProductStoragePath(value?: string | null) {
  const src = value?.trim();
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return "";

  const marker = `/storage/v1/object/public/${PRODUCT_BUCKET}/`;
  const privateMarker = `/storage/v1/object/authenticated/${PRODUCT_BUCKET}/`;
  const signMarker = `/storage/v1/object/sign/${PRODUCT_BUCKET}/`;

  try {
    const url = new URL(src);
    const decodedPath = decodeURIComponent(url.pathname);
    for (const part of [marker, privateMarker, signMarker]) {
      const index = decodedPath.indexOf(part);
      if (index !== -1) return decodedPath.slice(index + part.length).replace(/^\/+/, "");
    }
    return "";
  } catch {
    if (src.startsWith(`${PRODUCT_BUCKET}/`)) return src.slice(PRODUCT_BUCKET.length + 1);
    if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) return src;
    return "";
  }
}

function cachedSignedUrl(path: string) {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt - CACHE_BUFFER_MS > Date.now()) return cached.url;
  return "";
}

export async function resolveProductImageUrl(value?: string | null) {
  const src = value?.trim() ?? "";
  const path = getProductStoragePath(src);
  if (!path) return src;

  const cached = cachedSignedUrl(path);
  if (cached) return cached;

  const pending = pendingSignedUrls.get(path);
  if (pending) return pending;

  const request = supabase.storage
    .from(PRODUCT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) return src;
      signedUrlCache.set(path, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000,
      });
      return data.signedUrl;
    })
    .finally(() => pendingSignedUrls.delete(path));

  pendingSignedUrls.set(path, request);
  return request;
}

export function useProductImageUrl(src?: string | null) {
  const [url, setUrl] = useState(() => {
    const path = getProductStoragePath(src);
    return path ? cachedSignedUrl(path) : src?.trim() ?? "";
  });

  useEffect(() => {
    let cancelled = false;
    const path = getProductStoragePath(src);
    setUrl(path ? cachedSignedUrl(path) : src?.trim() ?? "");
    resolveProductImageUrl(src).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return url;
}

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

export function ProductImage({ src, alt = "", className, ...props }: ProductImageProps) {
  const url = useProductImageUrl(src);

  if (!url) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)} role="img" aria-label={alt || "Product image"}>
        <span className="px-2 text-center text-[10px] font-medium">Image</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} {...props} />;
}