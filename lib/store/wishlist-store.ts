"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  items: string[];
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (productId) => {
        const items = get().items.includes(productId)
          ? get().items.filter((id) => id !== productId)
          : [...get().items, productId];
        set({ items });
      },

      remove: (productId) => set({ items: get().items.filter((id) => id !== productId) }),

      has: (productId) => get().items.includes(productId),
    }),
    {
      name: "wbsite-wishlist",
    },
  ),
);
