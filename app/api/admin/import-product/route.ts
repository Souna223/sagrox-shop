import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { importProductFromUrl } from "@/lib/product-import";
import { slugify } from "@/lib/format";
import { ensureUniqueSlug } from "@/lib/admin-products";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { url?: string; sku?: string };
    const url = body.url?.trim();
    if (!url) return fail("Informe a URL do produto.", 422);

    const data = await importProductFromUrl(url);

    const name = data.name;
    const slug = await ensureUniqueSlug(slugify(name));
    const baseSku =
      body.sku?.trim() ||
      `IMP-${Date.now().toString(36).toUpperCase()}`;

    const existingBySlug = await prisma.product.findUnique({ where: { slug } });
    if (existingBySlug) {
      return fail(`Já existe um produto importado com o nome "${name}".`, 409);
    }

    const sku = await ensureUniqueSku(baseSku);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        description: data.description || null,
        shortDescription: data.description
          ? data.description.replace(/\s+/g, " ").trim().slice(0, 160)
          : null,
        status: "DRAFT",
        visibility: "VISIBLE",
        stock: 0,
        lowStockThreshold: 5,
        images: {
          create: data.images.slice(0, 8).map((img, index) => ({
            url: img,
            sortOrder: index,
            isMain: index === 0,
          })),
        },
      },
      select: { id: true, slug: true, name: true, status: true },
    });

    return ok({
      product,
      data,
      source: data.source,
      note:
        "Produto salvo como rascunho. Ele só será exibido na loja quando você clicar em publicar.",
    });
  } catch (error) {
    return handleError(error, "Não foi possível importar o produto.");
  }
}

async function ensureUniqueSku(sku: string): Promise<string> {
  let candidate = sku;
  let i = 1;
  while (await prisma.product.findUnique({ where: { sku: candidate } })) {
    candidate = `${sku}-${i}`;
    i++;
  }
  return candidate;
}