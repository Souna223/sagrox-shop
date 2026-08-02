"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { useI18n } from "@/lib/i18n/provider";

export function ProductCarousel({ products }: { products: ProductCardData[] }) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-carousel-item]");
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-carousel-item
            className="w-[15rem] shrink-0 snap-start sm:w-[16rem]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => scrollByAmount(-1)}
          aria-label={t.home.previousProducts}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => scrollByAmount(1)}
          aria-label={t.home.nextProducts}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
