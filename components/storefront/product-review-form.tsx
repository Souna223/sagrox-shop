"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

export function ProductReviewForm({ productSlug }: { productSlug: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError(t.productDetail.ratingRequired);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/products/${productSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || null, comment: comment.trim() || null }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(data.error ?? t.productDetail.reviewFailed);
      }

      toast.success(t.productDetail.reviewSubmitted);
      setRating(0);
      setHoverRating(0);
      setTitle("");
      setComment("");
    } catch (err) {
      const message = err instanceof Error ? err.message : t.productDetail.reviewFailed;
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <div>
        <Label className="text-sm font-medium">
          {t.productDetail.yourRating} <span className="text-destructive">*</span>
        </Label>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
              aria-label={`${star} ${t.productDetail.reviews}`}
            >
              <Star
                className={`size-7 ${star <= (hoverRating || rating) ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-title" className="text-sm font-medium">
          {t.productDetail.reviewTitle}
        </Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="review-comment" className="text-sm font-medium">
          {t.productDetail.reviewComment}
        </Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          className="mt-1.5 resize-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? t.productDetail.submittingReview : t.productDetail.submitReview}
      </Button>
    </form>
  );
}
