import { prisma } from "@/lib/prisma";

export function cleanReviewerName(raw: string): string {
  const s = (raw ?? "").trim().replace(/\d+/g, "").trim();
  if (!s) return "Anônimo";
  if (/[*#]/.test(s)) return "Anônimo";
  if (/^[-_•·.—–|,;.\s]+$/.test(s)) return "Anônimo";
  if (s.length < 2) return "Anônimo";
  return s;
}

export async function recomputeProductRating(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });

  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: avg, ratingCount: count },
  });
}
