"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { round } from "@/lib/prices";

type ProductResult = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
  variations: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    imageUrl: string | null;
  }[];
};

type KitItemForm = {
  productId: string;
  variationId: string | null;
  quantity: number;
  productName: string;
  productSku: string;
  unitPrice: number;
  stock: number;
  variationName: string | null;
  imageUrl: string | null;
};

type InitialItem = {
  productId: string;
  variationId: string | null;
  quantity: number;
  productName: string;
  productSku: string;
  productPrice: number;
  productStock: number;
  variationName: string | null;
  variationSku: string | null;
  variationPrice: number | null;
  variationStock: number | null;
};

type KitFormProps = {
  kitId?: string;
  initial?: {
    name: string;
    slug: string;
    sku: string;
    description: string | null;
    image: string | null;
    price: number | null;
    discountPercent: number | null;
    status: string;
    seoTitle: string | null;
    seoDescription: string | null;
    items: InitialItem[];
  };
};

const num = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v);

function ProductPicker({
  onSelect,
}: {
  onSelect: (product: ProductResult, variationId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/kits/products?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.ok) {
          setResults(json.data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.trim().length >= 2) {
              setLoading(true);
            } else {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar produto por nome, SKU ou slug..."
          className="pl-9"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id} className="border-b last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      if (p.variations.length > 0) {
                        onSelect(p, p.variations[0]?.id ?? null);
                      } else {
                        onSelect(p, null);
                      }
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.sku}
                        {p.variations.length > 0 ? ` • ${p.variations.length} variações` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatBRL(p.price)}</p>
                      <p className="text-xs text-muted-foreground">{p.stock} em estoque</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function KitForm({ kitId, initial }: KitFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");

  const initialPrice = initial?.price ?? null;
  const initialDiscount = initial?.discountPercent ?? null;
  const [priceMode, setPriceMode] = useState<"sum" | "fixed" | "discount">(
    initialPrice != null ? "fixed" : initialDiscount != null ? "discount" : "sum",
  );
  const [price, setPrice] = useState(num(initialPrice));
  const [discountPercent, setDiscountPercent] = useState(num(initialDiscount));

  const [items, setItems] = useState<KitItemForm[]>(
    initial?.items.map((i) => ({
      productId: i.productId,
      variationId: i.variationId,
      quantity: i.quantity,
      productName: i.productName,
      productSku: i.productSku,
      unitPrice: i.variationPrice ?? i.productPrice,
      stock: i.variationStock ?? i.productStock,
      variationName: i.variationName,
      imageUrl: null,
    })) ?? [],
  );

  const [imageInput, setImageInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basePrice = round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

  let unitPrice = basePrice;
  let compareAtPrice: number | null = null;
  if (priceMode === "fixed") {
    const fixed = price === "" ? 0 : Number(price);
    unitPrice = round(fixed);
    compareAtPrice = basePrice > unitPrice ? basePrice : null;
  } else if (priceMode === "discount") {
    const pct = discountPercent === "" ? 0 : Number(discountPercent);
    unitPrice = round(basePrice * (1 - pct / 100));
    compareAtPrice = pct > 0 ? basePrice : null;
  }

  const maxQuantity =
    items.length === 0
      ? 0
      : Math.floor(Math.min(...items.map((i) => Math.floor(i.stock / i.quantity))));

  const economy = compareAtPrice && compareAtPrice > unitPrice ? compareAtPrice - unitPrice : 0;

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    setImage(url);
    setImageInput("");
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; data?: { url?: string }; error?: string };
      const url = data.data?.url;
      if (!res.ok || !data.ok || !url) {
        toast.error(data.error ?? "Erro ao enviar a imagem.");
        return;
      }
      setImage(url);
      toast.success("Imagem publicada!");
    } catch {
      toast.error("Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const updateItem = (index: number, patch: Partial<KitItemForm>) => {
    setItems(items.map((i, idx) => (idx === index ? { ...i, ...patch } : i)));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (product: ProductResult, variationId: string | null) => {
    const variation = variationId
      ? product.variations.find((v) => v.id === variationId)
      : null;
    setItems([
      ...items,
      {
        productId: product.id,
        variationId: variationId ?? null,
        quantity: 1,
        productName: product.name,
        productSku: product.sku,
        unitPrice: variation ? variation.price : product.price,
        stock: variation ? variation.stock : product.stock,
        variationName: variation ? variation.name : null,
        imageUrl: variation?.imageUrl ?? product.image,
      },
    ]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Adicione ao menos um item ao kit.");
      return;
    }
    if (priceMode === "fixed" && price === "") {
      toast.error("Informe o preço fixo do kit.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || undefined,
        sku,
        description: description || undefined,
        image: image || undefined,
        price: priceMode === "fixed" ? Number(price) : null,
        discountPercent: priceMode === "discount" ? Number(discountPercent || 0) : null,
        status,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variationId: i.variationId,
          quantity: i.quantity,
        })),
      };

      const res = await fetch(kitId ? `/api/admin/kits/${kitId}` : "/api/admin/kits", {
        method: kitId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Erro ao salvar o kit. Tente novamente.");
        return;
      }

      toast.success(kitId ? "Kit atualizado!" : "Kit criado!");
      router.push("/admin/kits");
      router.refresh();
    } catch {
      toast.error("Falha ao salvar o kit. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{kitId ? "Editar kit" : "Novo kit"}</h1>
          <p className="text-sm text-muted-foreground">
            {kitId ? "Atualize as informações do kit." : "Monte um kit com produtos da loja."}
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar kit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações básicas</CardTitle>
          <CardDescription>Nome, identificação e descrição do kit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Deixe vazio para gerar automaticamente" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Imagem principal</Label>
            <div className="flex gap-2">
              <Input
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="Cole a URL da imagem"
              />
              <Button type="button" variant="outline" onClick={addImage}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {image ? (
                <div className="relative size-16 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="size-full object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 text-destructive"
                    onClick={() => setImage("")}
                    aria-label="Remover imagem"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={uploadFile}
              />
              <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? "Enviando..." : "Enviar imagem do computador"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v ?? "DRAFT")}
              items={[
                { label: "Rascunho", value: "DRAFT" },
                { label: "Ativo", value: "ACTIVE" },
                { label: "Inativo", value: "INACTIVE" },
              ]}
            >
              <SelectTrigger className="h-9 w-full sm:w-64">
                <SelectValue className="pr-6">
                  {status === "DRAFT" ? "Rascunho" : status === "ACTIVE" ? "Ativo" : "Inativo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preço</CardTitle>
          <CardDescription>
            Escolha como o preço do kit é calculado. O estoque disponível é limitado pelo item com
            menor disponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Modo de preço</Label>
            <Select
              value={priceMode}
              onValueChange={(v) => setPriceMode((v ?? "sum") as "sum" | "fixed" | "discount")}
              items={[
                { label: "Soma dos itens", value: "sum" },
                { label: "Preço fixo", value: "fixed" },
                { label: "Desconto sobre a soma", value: "discount" },
              ]}
            >
              <SelectTrigger className="h-9 w-full sm:w-64">
                <SelectValue className="pr-6">
                  {priceMode === "sum"
                    ? "Soma dos itens"
                    : priceMode === "fixed"
                      ? "Preço fixo"
                      : "Desconto sobre a soma"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">Soma dos itens</SelectItem>
                <SelectItem value="fixed">Preço fixo</SelectItem>
                <SelectItem value="discount">Desconto sobre a soma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {priceMode === "fixed" ? (
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="price">Preço fixo (R$) *</Label>
              <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
          ) : null}

          {priceMode === "discount" ? (
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="discountPercent">Desconto (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          ) : null}

          <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Soma dos itens</p>
              <p className="font-semibold">{formatBRL(basePrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preço do kit</p>
              <p className="font-bold text-primary">{formatBRL(unitPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Economia</p>
              <p className="font-semibold text-emerald-600">
                {economy > 0 ? `-${formatBRL(economy)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponível</p>
              <p className={`font-semibold ${maxQuantity <= 0 ? "text-destructive" : ""}`}>
                {maxQuantity <= 0 ? "Esgotado" : maxQuantity}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do kit</CardTitle>
          <CardDescription>
            Busque produtos da loja para compor o kit. Se o produto tiver variações, a primeira é
            selecionada por padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={index} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="size-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {item.productName}
                          {item.variationName ? ` — ${item.variationName}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.productSku} • {formatBRL(item.unitPrice)} •{" "}
                          {item.stock <= 0 ? (
                            <span className="font-semibold text-destructive">esgotado</span>
                          ) : (
                            `${item.stock} em estoque`
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade no kit</Label>
                      <Input
                        type="number"
                        min="1"
                        className="h-9 w-24"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </div>
                    <p className="mt-4 text-sm font-semibold">
                      {formatBRL(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum item adicionado. Busque produtos abaixo para compor o kit.
            </p>
          )}
          <ProductPicker onSelect={selectProduct} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">Título SEO</Label>
            <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription">Descrição SEO</Label>
            <Textarea id="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/kits")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar kit
        </Button>
      </div>
    </form>
  );
}
