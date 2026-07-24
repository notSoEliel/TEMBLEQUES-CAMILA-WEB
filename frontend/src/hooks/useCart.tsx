import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  name_en?: string;
  image: string;
  size: string;
  quantity: number;
  price: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  stock: number;
  category: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalDeposit: number;
  getAvailableStock: (productId: string, size: string, dbStock: number) => number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readCart(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as CartItem[] : [];
  } catch {
    return [];
  }
}

function mergeCartItems(accountItems: CartItem[], guestItems: CartItem[]): CartItem[] {
  const merged = [...accountItems];

  for (const guestItem of guestItems) {
    const existingIndex = merged.findIndex((item) =>
      item.productId === guestItem.productId
      && item.size === guestItem.size
      && item.startDate === guestItem.startDate
      && item.endDate === guestItem.endDate,
    );

    if (existingIndex === -1) {
      merged.push(guestItem);
      continue;
    }

    const existingItem = merged[existingIndex];
    merged[existingIndex] = {
      ...existingItem,
      quantity: Math.min(existingItem.stock, existingItem.quantity + guestItem.quantity),
    };
  }

  return merged;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prevUser, setPrevUser] = useState<string | null | undefined>(undefined);

  // Load cart when auth is ready or user changes
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;
    const cartKey = user ? `cart_${user.id}` : "cart_guest";
    
    // Logic to handle user switching or initial load
    if (currentUserId !== prevUser) {
      const accountItems = readCart(localStorage.getItem(cartKey));
      const guestItems = user ? readCart(localStorage.getItem("cart_guest")) : [];
      const nextItems = user ? mergeCartItems(accountItems, guestItems) : accountItems;

      setItems(nextItems);

      if (user && guestItems.length > 0) {
        localStorage.setItem(cartKey, JSON.stringify(nextItems));
        localStorage.removeItem("cart_guest");
      }

      setPrevUser(currentUserId);
    }
    
    setIsLoading(false);
  }, [authLoading, user, prevUser]);

  // Save cart changes
  useEffect(() => {
    if (isLoading || authLoading) return;
    
    const cartKey = user ? `cart_${user.id}` : "cart_guest";
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, user, isLoading, authLoading]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.startDate === item.startDate &&
          i.endDate === item.endDate
      );

      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: Math.min(i.stock, i.quantity + item.quantity) } : i
        );
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(i.stock, Math.max(1, quantity)) } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalDeposit = items.reduce((acc, item) => acc + item.depositAmount * item.quantity, 0);

  const getAvailableStock = (productId: string, size: string, dbStock: number) => {
    const inCart = items
      .filter((i) => i.productId === productId && i.size === size)
      .reduce((acc, i) => acc + i.quantity, 0);
    return Math.max(0, dbStock - inCart);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        totalDeposit,
        getAvailableStock,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
