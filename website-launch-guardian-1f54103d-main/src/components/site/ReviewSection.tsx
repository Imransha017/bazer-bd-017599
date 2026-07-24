import { useEffect, useState } from "react";
import { Star, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  user_id: string;
  created_at: string;
};

type Author = { id: string; full_name: string | null; avatar_url: string | null };

export function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,rating,comment,user_id,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    setReviews(list);
    setLoading(false);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: auth } = await (supabase as any).rpc("get_review_authors", { _ids: ids });
      const map: Record<string, Author> = {};
      for (const a of (auth ?? []) as Author[]) map[a.id] = a;
      setAuthors(map);
    }
  };

  useEffect(() => {
    if (!isUuid) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isUuid]);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  useEffect(() => {
    if (myReview) { setRating(myReview.rating); setComment(myReview.comment ?? ""); }
  }, [myReview?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!user) return toast.error("Please sign in to write a review");
    if (!isUuid) return toast.error("Reviews unavailable for demo products");
    if (!comment.trim()) return toast.error("Please write a comment");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").upsert(
      { product_id: productId, user_id: user.id, rating, comment: comment.trim() },
      { onConflict: "product_id,user_id" },
    );
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(myReview ? "Review updated!" : "Review submitted!");
    load();
  };

  const del = async () => {
    if (!myReview) return;
    if (!confirm("Delete your review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", myReview.id);
    if (error) return toast.error(error.message);
    setComment(""); setRating(5);
    toast.success("Review deleted");
    load();
  };

  const nameOf = (uid: string) => authors[uid]?.full_name?.trim() || `User ${uid.slice(0, 6)}`;

  return (
    <div className="space-y-4">
      {/* Summary + distribution */}
      <div className="grid gap-3 rounded border border-border p-4 sm:grid-cols-[auto_1fr]">
        <div className="text-center sm:border-r sm:pr-4">
          <p className="text-4xl font-bold text-primary">{avg.toFixed(1)}</p>
          <div className="flex justify-center text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-4 ${i < Math.round(avg) ? "fill-amber-400" : "fill-muted stroke-muted-foreground"}`} />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="space-y-1">
          {dist.map(({ n, count }) => {
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right">{n}</span>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write / edit review */}
      {isUuid && (
        <div className="rounded border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{myReview ? "Update your review" : "Write a review"}</p>
            {myReview && (
              <button onClick={del} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <Trash2 className="size-3.5" /> Delete
              </button>
            )}
          </div>
          {!user ? (
            <p className="text-xs text-muted-foreground">
              <Link to="/auth" className="text-primary underline">Sign in</Link> to write a review.
            </p>
          ) : (
            <>
              <div className="mb-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
                    <Star className={`size-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
                <span className="ml-2 self-center text-xs text-muted-foreground">{rating} / 5</span>
              </div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                placeholder="Share your experience..."
                className="w-full rounded border border-border bg-background p-2 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{comment.length}/500</span>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : myReview ? "Update Review" : "Submit Review"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="rounded border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const a = authors[r.user_id];
            return (
              <div key={r.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-start gap-2">
                  {a?.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
                      <UserIcon className="size-4" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{nameOf(r.user_id)}</span>
                      <span className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`size-3 ${j < r.rating ? "fill-amber-400" : "fill-muted stroke-muted-foreground"}`} />
                        ))}
                      </span>
                      <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-foreground">{r.comment}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
