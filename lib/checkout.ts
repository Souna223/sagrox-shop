import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { applyCouponDiscount, round } from "@/lib/prices";
import { isValidCEP } from "@/lib/br";
import { getShippingMethods } from "@/lib/shipping-methods";
import type { Prisma } from "@/generated/prisma/client";

export type CheckoutItemInput = {
  productId: string;
  variationId?: string | null;
  quantity: number;
};

export type ResolvedCartItem = {
  productId: string;
  variationId: string | null;
  productSlug: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  stock: number;
  freeShipping: boolean;
  weightGrams: number;
};

export type ShippingOption = {
  code: string;
  service: string;
  price: number;
  deliveryDays: number;
  deliveryBusinessDays: number;
};

export async function resolveCartItems(items: CheckoutItemInput[]): Promise<ResolvedCartItem[]> {
  if (!items.length) throw new Error("Carrinho vazio.");

  const grouped = new Map<string, { productId: string; variationId: string | null; quantity: number }>();
  for (const item of items) {
    if (!item.productId || item.quantity < 1) continue;
    const key = `${item.productId}:${item.variationId ?? ""}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else grouped.set(key, { productId: item.productId, variationId: item.variationId ?? null, quantity: item.quantity });
  }

  const productIds = [...new Set([...grouped.keys()].map((k) => k.split(":")[0]))];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE", visibility: "VISIBLE" },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      freeShipping: true,
      weight: true,
      images: { where: { isMain: true }, take: 1, select: { url: true } },
    },
  });

  const requestedVariationIds = [...grouped.values()]
    .filter((v) => v.variationId)
    .map((v) => v.variationId as string);

  const variations =
    requestedVariationIds.length > 0
      ? await prisma.productVariation.findMany({
          where: { id: { in: requestedVariationIds } },
          select: { id: true, productId: true, name: true, sku: true, price: true, compareAtPrice: true, stock: true, imageUrl: true },
        })
      : [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const variationByKey = new Map(variations.map((v) => [`${v.productId}:${v.id}`, v]));

  const resolved: ResolvedCartItem[] = [];

  for (const { productId, variationId, quantity } of grouped.values()) {
    const product = productById.get(productId);
    if (!product) throw new Error("Um dos produtos não está mais disponível.");

    const variation = variationId ? variationByKey.get(`${productId}:${variationId}`) : null;
    if (variationId && !variation) throw new Error("Variação do produto não disponível.");

    const unitPrice = variation?.price ? Number(variation.price) : Number(product.price);
    const compareAtPrice = variation?.compareAtPrice ?? product.compareAtPrice;
    const stock = variation ? variation.stock : product.stock;

    if (stock < quantity) {
      const label = variation ? `${product.name} (${variation.name})` : product.name;
      throw new Error(`Estoque insuficiente para "${label}". Restam ${stock} unidade${stock === 1 ? "" : "s"}.`);
    }

    resolved.push({
      productId,
      variationId,
      productSlug: product.slug,
      name: variation ? `${product.name} — ${variation.name}` : product.name,
      sku: variation ? variation.sku : product.sku,
      imageUrl: variation?.imageUrl ?? product.images[0]?.url ?? null,
      unitPrice,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      quantity,
      stock,
      freeShipping: product.freeShipping,
      weightGrams: product.weight ? Math.round(Number(product.weight) * 1000) : 0,
    });
  }

  return resolved;
}

export function cartSubtotal(items: ResolvedCartItem[]): number {
  return round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
}

export async function getShippingOptions(cep: string, items: ResolvedCartItem[]): Promise<ShippingOption[]> {
  if (!isValidCEP(cep)) throw new Error("CEP inválido.");
  const settings = await getSettings();
  const subtotal = cartSubtotal(items);
  const allFreeShipping = items.every((i) => i.freeShipping);
  const freeThreshold = settings.freeShippingThreshold;

  const options: ShippingOption[] = [];
  const methods = await getShippingMethods();

  if (settings.shippingEnabled) {
    const freeEligible = allFreeShipping || (freeThreshold > 0 && subtotal >= freeThreshold);
    if (freeEligible) {
      options.push({ code: "FREE", service: "Frete Grátis", price: 0, deliveryDays: 5, deliveryBusinessDays: 5 });
    }
    for (const method of methods) {
      if (!method.active) continue;
      options.push({
        code: method.code,
        service: method.service,
        price: method.price,
        deliveryDays: method.deliveryDays,
        deliveryBusinessDays: method.deliveryDays,
      });
    }
  }

  if (options.length === 0) {
    options.push({ code: "STORE", service: "Retirada na loja", price: 0, deliveryDays: 1, deliveryBusinessDays: 1 });
  }

  return options;
}

export type ValidatedCoupon = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  maxDiscount: number | null;
  discount: number;
  freeShipping: boolean;
};

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string | null,
): Promise<ValidatedCoupon> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error("Informe um cupom.");

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) throw new Error("Cupom inválido ou inativo.");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("Este cupom ainda não está ativo.");
  if (coupon.expiresAt && coupon.expiresAt < now) throw new Error("Este cupom expirou.");

  if (coupon.minAmount && subtotal < Number(coupon.minAmount)) {
    throw new Error(`Valor mínimo para este cupom: R$ ${Number(coupon.minAmount).toFixed(2).replace(".", ",")}.`);
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Este cupom atingiu o limite de usos.");
  }
  if (userId && coupon.perUserLimit) {
    const usages = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (usages >= coupon.perUserLimit) throw new Error("Você já utilizou este cupom.");
  }

  const result = applyCouponDiscount(subtotal, {
    type: coupon.type,
    value: Number(coupon.value),
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
  });

  return {
    code: normalized,
    type: coupon.type,
    value: Number(coupon.value),
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    discount: result.discount,
    freeShipping: result.freeShipping,
  };
}

export type CreateOrderInput = {
  email: string;
  customerName: string;
  customerCpf?: string | null;
  phone?: string | null;
  userId?: string | null;
  items: CheckoutItemInput[];
  shippingAddress: Prisma.InputJsonValue;
  billingAddress?: Prisma.InputJsonValue | null;
  shippingService: string;
  shippingEstimateDays?: number | null;
  couponCode?: string | null;
  paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  installments?: number | null;
  sessionId?: string | null;
  ip?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
};

export type CreatedOrderResult = {
  orderId: string;
  orderNumber: number;
  total: number;
  shippingFee: number;
  discount: number;
  subtotal: number;
  paymentMethod: string | null;
  status: string;
  paymentStatus: string;
};

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrderResult> {
  const items = await resolveCartItems(input.items);
  const subtotal = cartSubtotal(items);

  let coupon: ValidatedCoupon | null = null;
  if (input.couponCode) {
    coupon = await validateCoupon(input.couponCode, subtotal, input.userId);
  }

  const shippingOptions = await getShippingOptions((input.shippingAddress as { zip?: string }).zip ?? "", items);
  const shippingOption = shippingOptions.find((o) => o.code === input.shippingService);
  if (!shippingOption) throw new Error("Opção de envio inválida.");

  let shippingFee = shippingOption.price;
  if (coupon?.freeShipping) shippingFee = 0;

  const discount = coupon?.discount ?? 0;
  const total = round(subtotal - discount + shippingFee);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: input.userId ?? null,
        email: input.email.toLowerCase(),
        customerName: input.customerName,
        customerCpf: input.customerCpf ?? null,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        subtotal,
        discount,
        shippingFee,
        total,
        paymentMethod: input.paymentMethod,
        installments: input.installments ?? null,
        billingAddress: input.billingAddress ?? input.shippingAddress,
        shippingAddress: input.shippingAddress,
        shippingService: shippingOption.service,
        shippingEstimateDays: shippingOption.deliveryDays,
        couponCode: coupon?.code ?? null,
        sessionId: input.sessionId ?? null,
        ip: input.ip ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? null,
        utmContent: input.utmContent ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            name: item.name,
            sku: item.sku,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: round(item.unitPrice * item.quantity),
          })),
        },
        payments: {
          create: {
            gateway: "APPMax",
            method: input.paymentMethod,
            status: "PENDING",
            amount: total,
            installments: input.installments ?? null,
          },
        },
      },
      select: { id: true, number: true },
    });

    for (const item of items) {
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          type: "RESERVED",
          orderId: created.id,
          note: "Pedido criado",
        },
      });
    }

    if (coupon) {
      const dbCoupon = await tx.coupon.findUnique({ where: { code: coupon.code } });
      if (dbCoupon) {
        await tx.coupon.update({ where: { id: dbCoupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponUsage.create({
          data: { couponId: dbCoupon.id, orderId: created.id, userId: input.userId ?? null },
        });
      }
    }

    return created;
  });

  return {
    orderId: order.id,
    orderNumber: order.number,
    total,
    shippingFee,
    discount,
    subtotal,
    paymentMethod: input.paymentMethod,
    status: "AWAITING_PAYMENT",
    paymentStatus: "PENDING",
  };
}
