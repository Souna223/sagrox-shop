import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Role,
  ProductStatus,
  ProductVisibility,
  CouponType,
  AnalyticsEventType,
} from "@/generated/prisma/enums";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "wbsite";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const ORDER_STATUS: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  PROCESSING: "Em processamento",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-800 border-orange-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-teal-100 text-teal-800 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-800 border-gray-200",
};

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["AWAITING_PAYMENT", "PAID", "PROCESSING", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED"];

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto bancário",
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PROCESSING: "Em processamento",
  APPROVED: "Aprovado",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Estorno",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
  CUSTOMER: "Cliente",
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const PRODUCT_VISIBILITY_LABEL: Record<ProductVisibility, string> = {
  VISIBLE: "Visível",
  HIDDEN: "Oculto",
};

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  PERCENT: "Porcentagem (%)",
  FIXED: "Valor fixo (R$)",
  FREE_SHIPPING: "Frete grátis",
};

export const ANALYTICS_EVENT_LABEL: Record<AnalyticsEventType, string> = {
  PAGE_VIEW: "Visualização de página",
  VIEW_CONTENT: "Visualização de produto",
  SEARCH: "Busca",
  ADD_TO_CART: "Adicionou ao carrinho",
  REMOVE_FROM_CART: "Removeu do carrinho",
  BEGIN_CHECKOUT: "Iniciou checkout",
  ADD_PAYMENT_INFO: "Adicionou forma de pagamento",
  PURCHASE: "Compra",
  LEAD: "Lead",
  WISHLIST: "Lista de desejos",
  LOGIN: "Login",
  SIGNUP: "Cadastro",
  CONTACT: "Contato",
  SHARE: "Compartilhamento",
  CUSTOM: "Personalizado",
};

export const BRAZIL_STATES = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
] as const;

export const BR_STATE_NAMES: Record<string, string> = BRAZIL_STATES.reduce(
  (acc, s) => ({ ...acc, [s.uf]: s.nome }),
  {},
);

export const INSTALLMENT_LIMITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const MIN_INSTALLMENT_VALUE = 5;

export const SESSION_COOKIE = "wbsite.session";
export const CART_COOKIE = "wbsite.cart";

export const APP_MAX_URL = "https://api.appmax.com.br/v3";
