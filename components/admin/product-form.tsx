"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; name: string };

type VariationForm = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  imageUrl: string;
  active: boolean;
};

type ProductFormProps = {
  productId?: string;
  initial?: {
    name: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    sku: string;
    barcode: string | null;
    brandId: string | null;
    categoryId: string | null;
    price: number;
    compareAtPrice: number | null;
    costPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    status: string;
    visibility: string;
    isFeatured: boolean;
    isBestSeller: boolean;
    isNew: boolean;
    freeShipping: boolean;
    weight: number | null;
    height: number | null;
    width: number | null;
    length: number | null;
    seoTitle: string | null;
    seoDescription: string | null;
    tags: string[];
    images: { url: string; alt: string | null }[];
    variations: {
      name: string;
      sku: string;
      price: number | null;
      compareAtPrice: number | null;
      stock: number;
      imageUrl: string | null;
      active: boolean;
    }[];
  };
  categories: Option[];
  brands: Option[];
};

const num = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v);

function VariationEditor({
  variations,
  onChange,
}: {
  variations: VariationForm[];
  onChange: (next: VariationForm[]) => void;
}) {
  const update = (index: number, patch: Partial<VariationForm>) => {
    onChange(variations.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  return (
    <div className="space-y-3">
      {variations.map((v, index) => (
        <div key={index} className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Variação {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange(variations.filter((_, i) => i !== index))}
              aria-label="Remover variação"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={v.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Ex.: Preto, 42, 128GB"
              />
            </div>
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input
                value={v.sku}
                onChange={(e) => update(index, { sku: e.target.value })}
                placeholder="Ex.: FONE-BLK-42"
              />
            </div>
            <div className="space-y-1">
              <Label>Preço</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={v.price}
                onChange={(e) => update(index, { price: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>De (preço de comparação)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={v.compareAtPrice}
                onChange={(e) => update(index, { compareAtPrice: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Estoque</Label>
              <Input
                type="number"
                min="0"
                value={v.stock}
                onChange={(e) => update(index, { stock: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Imagem (URL)</Label>
              <Input
                value={v.imageUrl}
                onChange={(e) => update(index, { imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={v.active}
              onCheckedChange={(checked) => update(index, { active: !!checked })}
            />
            Variação ativa
          </label>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...variations, { name: "", sku: "", price: "", compareAtPrice: "", stock: "0", imageUrl: "", active: true }])
        }
      >
        <Plus className="size-4" /> Adicionar variação
      </Button>
    </div>
  );
}

export function ProductForm({ productId, initial, categories, brands }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [price, setPrice] = useState(num(initial?.price));
  const [compareAtPrice, setCompareAtPrice] = useState(num(initial?.compareAtPrice));
  const [costPrice, setCostPrice] = useState(num(initial?.costPrice));
  const [stock, setStock] = useState(num(initial?.stock ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(num(initial?.lowStockThreshold ?? 5));
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "VISIBLE");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isBestSeller, setIsBestSeller] = useState(initial?.isBestSeller ?? false);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [freeShipping, setFreeShipping] = useState(initial?.freeShipping ?? false);
  const [weight, setWeight] = useState(num(initial?.weight));
  const [height, setHeight] = useState(num(initial?.height));
  const [width, setWidth] = useState(num(initial?.width));
  const [length, setLength] = useState(num(initial?.length));
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [tagsText, setTagsText] = useState(initial?.tags.join(", ") ?? "");
  const [images, setImages] = useState<string[]>(initial?.images.map((i) => i.url) ?? []);
  const [persistedImages, setPersistedImages] = useState<string[]>(
    initial?.images.map((i) => i.url) ?? [],
  );
  const [variations, setVariations] = useState<VariationForm[]>(
    initial?.variations.map((v) => ({
      name: v.name,
      sku: v.sku,
      price: num(v.price),
      compareAtPrice: num(v.compareAtPrice),
      stock: String(v.stock),
      imageUrl: v.imageUrl ?? "",
      active: v.active,
    })) ?? [],
  );
  const [imageInput, setImageInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const imagesDirty =
    images.length !== persistedImages.length || images.some((u, i) => u !== persistedImages[i]);

  const persistImagesNow = async (urls: string[]) => {
    if (!productId) return;
    const cleaned = urls.filter(Boolean);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: cleaned }),
      });
      if (res.ok) {
        setPersistedImages(cleaned);
      } else {
        toast.error("Falha ao publicar a imagem automaticamente. Clique em \"Salvar produto\".");
      }
    } catch {
      toast.error("Falha ao publicar a imagem automaticamente. Clique em \"Salvar produto\".");
    }
  };

  useEffect(() => {
    if (!imagesDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [imagesDirty]);

  const deleteUpload = (url: string) => {
    if (!url.startsWith("/uploads/") && !url.startsWith("https://res.cloudinary.com/")) return;
    fetch("/api/admin/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    const next = [...images, url];
    setImages(next);
    setImageInput("");
    persistImagesNow(next);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao enviar a imagem.");
        return;
      }
      const next = [...images, data.url as string];
      setImages(next);
      persistImagesNow(next);
      toast.success("Imagem publicada!");
    } catch {
      toast.error("Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const startReplace = (index: number) => {
    setReplacingIndex(index);
    replaceInputRef.current?.click();
  };

  const replaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;
    const oldUrl = images[replacingIndex];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao enviar a imagem.");
        return;
      }
      const next = images.map((img, i) => (i === replacingIndex ? (data.url as string) : img));
      setImages(next);
      persistImagesNow(next);
      deleteUpload(oldUrl);
      toast.success("Imagem substituída e publicada!");
    } catch {
      toast.error("Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
      setReplacingIndex(null);
      e.target.value = "";
    }
  };

  const toNumber = (v: string) => (v === "" ? undefined : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || undefined,
        shortDescription: shortDescription || undefined,
        description: description || undefined,
        sku,
        barcode: barcode || undefined,
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        price: toNumber(price),
        compareAtPrice: toNumber(compareAtPrice),
        costPrice: toNumber(costPrice),
        stock: Number(stock || 0),
        lowStockThreshold: Number(lowStockThreshold || 0),
        status,
        visibility,
        isFeatured,
        isBestSeller,
        isNew,
        freeShipping,
        weight: toNumber(weight),
        height: toNumber(height),
        width: toNumber(width),
        length: toNumber(length),
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        images: images.filter(Boolean),
        variations: variations.map((v) => ({
          name: v.name,
          sku: v.sku,
          price: v.price === "" ? undefined : Number(v.price),
          compareAtPrice: v.compareAtPrice === "" ? undefined : Number(v.compareAtPrice),
          stock: Number(v.stock || 0),
          imageUrl: v.imageUrl || undefined,
          active: v.active,
        })),
      };

      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.redirected || res.type === "opaqueredirect") {
        toast.error("Sua sessão expirou. Faça login novamente e tente salvar.");
        return;
      }

      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Erro ao salvar o produto. Tente novamente.");
        return;
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado!");
      router.push("/admin/produtos");
      router.refresh();
    } catch {
      toast.error("Falha ao salvar o produto. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {productId ? "Editar produto" : "Novo produto"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {productId ? "Atualize as informações do produto." : "Cadastre um novo produto na loja."}
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações básicas</CardTitle>
          <CardDescription>Nome, descrição e identificação do produto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
                items={categories.map((c) => ({ label: c.name, value: c.id }))}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue className="pr-6">
                    {categories.find((c) => c.id === categoryId)?.name ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marca</Label>
              <Select
                value={brandId}
                onValueChange={(v) => setBrandId(v ?? "")}
                items={brands.map((b) => ({ label: b.name, value: b.id }))}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue className="pr-6">
                    {brands.find((b) => b.id === brandId)?.name ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Descrição curta</Label>
            <Textarea
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição completa</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preço e estoque</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compareAtPrice">De (R$)</Label>
              <Input id="compareAtPrice" type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">Custo (R$)</Label>
              <Input id="costPrice" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="stock">Estoque</Label>
              <Input id="stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lowStockThreshold">Alerta de estoque baixo</Label>
              <Input id="lowStockThreshold" type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input id="weight" type="number" step="0.001" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input id="height" type="number" step="0.01" min="0" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="width">Largura (cm)</Label>
              <Input id="width" type="number" step="0.01" min="0" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="length">Comprimento (cm)</Label>
              <Input id="length" type="number" step="0.01" min="0" value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                <SelectTrigger className="h-9 w-full">
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
            <div className="space-y-1.5">
              <Label>Visibilidade</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v ?? "VISIBLE")}
                items={[
                  { label: "Visível", value: "VISIBLE" },
                  { label: "Oculto", value: "HIDDEN" },
                ]}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue className="pr-6">
                    {visibility === "VISIBLE" ? "Visível" : "Oculto"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISIBLE">Visível</SelectItem>
                  <SelectItem value="HIDDEN">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={isFeatured} onCheckedChange={(v) => setIsFeatured(!!v)} /> Em destaque
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={isBestSeller} onCheckedChange={(v) => setIsBestSeller(!!v)} /> Mais vendido
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={isNew} onCheckedChange={(v) => setIsNew(!!v)} /> Lançamento
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={freeShipping} onCheckedChange={(v) => setFreeShipping(!!v)} /> Frete grátis
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagens</CardTitle>
          <CardDescription>
            A primeira imagem é usada como principal. Depois de adicionar as imagens, clique em
            &ldquo;Salvar produto&rdquo; para publicá-las.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={replaceFile}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={uploadFile}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? "Enviando..." : "Enviar imagem do computador"}
            </Button>
          </div>
          {images.length > 0 ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((url, index) => (
                <li key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1 rounded-full bg-background/80 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => {
                      const next = images.filter((_, i) => i !== index);
                      deleteUpload(images[index]);
                      setImages(next);
                      persistImagesNow(next);
                    }}
                    aria-label="Remover imagem"
                  >
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute bottom-1 right-1 rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => startReplace(index)}
                    aria-label="Substituir imagem"
                    disabled={uploading}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                  {index === 0 ? (
                    <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
                      Principal
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada.</p>
          )}
          {imagesDirty ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Alterações de imagem ainda não salvas. Clique em &ldquo;Salvar produto&rdquo; para
              publicá-las.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variações</CardTitle>
          <CardDescription>Ex.: cores, tamanhos. O estoque das variações pode ser gerenciado aqui.</CardDescription>
        </CardHeader>
        <CardContent>
          <VariationEditor variations={variations} onChange={setVariations} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO e tags</CardTitle>
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
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="promoção, lançamento, verão" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/produtos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar produto
        </Button>
      </div>
    </form>
  );
}
