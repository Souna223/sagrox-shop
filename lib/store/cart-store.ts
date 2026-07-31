"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  variationId?: string;
  variationName?: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  quantity: number;
  stock: number;
};

type CartState = {
  items: CartItem[];
  lastUpdated: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variationId?: string) => void;
  updateQuantity: (productId: string, variationId: string | undefined, quantity: number) => void;
  clear: () => void;
  getSubtotal: () => number;
  getCount: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastUpdated: 0,

      addItem: (item, quantity = 1) => {
        const items = [...get().items];
        const key = (i: CartItem) => `${i.productId}:${i.variationId ?? ""}`;
        const existing = items.find((i) => key(i) === key(item as CartItem));

        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, Math.max(existing.stock, 1));
          existing.quantity = newQty;
          existing.price = item.price;
        } else {
          items.push({ ...item, quantity: Math.min(quantity, Math.max(item.stock, 1)) });
        }

        set({ items, lastUpdated: Date.now() });
      },

      removeItem: (productId, variationId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && (i.variationId ?? "") === (variationId ?? "")),
          ),
          lastUpdated: Date.now(),
        });
      },

      updateQuantity: (productId, variationId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variationId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && (i.variationId ?? "") === (variationId ?? "")
              ? { ...i, quantity: Math.min(quantity, Math.max(i.stock, 1)) }
              : i,
          ),
          lastUpdated: Date.now(),
        });
      },

      clear: () => set({ items: [], lastUpdated: Date.now() }),

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      getCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "wbsite-cart",
    },
  ),
);
