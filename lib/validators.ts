import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  newsletter: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  newsletter: z.boolean().default(false),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres."),
});

export const addressSchema = z.object({
  label: z.string().optional().default("Principal"),
  zip: z.string().min(8, "CEP inválido."),
  street: z.string().min(2, "Informe a rua."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Informe o bairro."),
  city: z.string().min(2, "Informe a cidade."),
  state: z.string().length(2, "Informe o estado."),
  isDefault: z.boolean().default(false),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
  orderId: z.string().optional(),
});

export const couponCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto."),
  slug: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().min(1, "Informe o SKU."),
  barcode: z.string().optional(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Preço inválido."),
  compareAtPrice: z.coerce.number().optional().nullable(),
  costPrice: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT"),
  visibility: z.enum(["VISIBLE", "HIDDEN"]).default("VISIBLE"),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNew: z.boolean().default(false),
  weight: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  width: z.coerce.number().optional().nullable(),
  length: z.coerce.number().optional().nullable(),
  freeShipping: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.any()).optional(),
  images: z.array(z.string()).default([]),
  variations: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().min(1),
        price: z.coerce.number().optional().nullable(),
        compareAtPrice: z.coerce.number().optional().nullable(),
        stock: z.coerce.number().int().min(0).default(0),
        imageUrl: z.string().optional().nullable(),
        attributes: z.record(z.string(), z.any()).optional(),
        active: z.boolean().default(true),
      }),
    )
    .default([]),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().min(2, "Informe o nome da marca."),
  slug: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z.string().min(2).max(50).transform((v) => v.toUpperCase().trim()),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minAmount: z.coerce.number().optional().nullable(),
  maxDiscount: z.coerce.number().optional().nullable(),
  usageLimit: z.coerce.number().int().optional().nullable(),
  perUserLimit: z.coerce.number().int().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  active: z.boolean().default(true),
  validFor: z.any().optional(),
});

export const flashSaleSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().min(0),
  startsAt: z.string(),
  endsAt: z.string(),
  active: z.boolean().default(true),
  productIds: z.array(z.string()).default([]),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "AWAITING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
  ]),
  notes: z.string().optional(),
});

export const customerNoteSchema = z.object({
  content: z.string().min(1),
});

export const newsletterSchema = z.object({
  email: z.string().email("E-mail inválido."),
  name: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().optional(),
  subject: z.string().min(2, "Informe o assunto."),
  message: z.string().min(10, "Escreva uma mensagem (mínimo 10 caracteres)."),
});

export const cepSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, "CEP inválido."),
});

const checkoutAddressSchema = z.object({
  zip: z.string().min(8, "CEP inválido."),
  street: z.string().min(2, "Informe a rua."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Informe o bairro."),
  city: z.string().min(2, "Informe a cidade."),
  state: z.string().length(2, "Informe o estado."),
});

export const checkoutSchema = z.object({
  email: z.string().email("E-mail inválido."),
  customerName: z.string().min(3, "Informe seu nome completo."),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variationId: z.string().optional().nullable(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Carrinho vazio."),
  shippingAddress: checkoutAddressSchema,
  billingAddress: checkoutAddressSchema.optional(),
  shippingService: z.string().min(1, "Selecione uma opção de envio."),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
  installments: z.number().int().min(1).max(12).optional(),
  card: z
    .object({
      number: z.string().regex(/^\d{12,19}$/, "Número do cartão inválido."),
      holderName: z.string().min(3, "Informe o nome impresso no cartão."),
      expirationMonth: z.string().regex(/^\d{2}$/, "Mês de validade inválido."),
      expirationYear: z.string().regex(/^(?:\d{2}|\d{4})$/, "Ano de validade inválido."),
      cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido."),
    })
    .optional(),
  sessionId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
});

export const shippingSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, "CEP inválido."),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variationId: z.string().optional().nullable(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Informe o cupom."),
  subtotal: z.number().min(0),
});
