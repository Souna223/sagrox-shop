"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublishProductButton({
  productId,
  slug,
  disabled,
}: {
  productId: string;
  slug: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/publish`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Não foi possível publicar o produto.");
        return;
      }
      toast.success("Produto publicado na loja.");
      router.push(`/produtos/${slug}`);
      router.refresh();
    } catch {
      toast.error("Falha ao publicar o produto.");
    } finally {
      setLoading(false);
    }
  };

  if (disabled) return null;

  return (
    <Button type="button" onClick={handlePublish} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      {loading ? "Publicando..." : "Publicar na loja"}
    </Button>
  );
}