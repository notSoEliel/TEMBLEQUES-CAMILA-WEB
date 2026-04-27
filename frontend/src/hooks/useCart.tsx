import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  quantity: number;
  price: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalDeposit: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

import { useAuth } from "./useAuth";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cartKey = user ? `cart_${user.id}` : "cart_guest";

  const [items, setItems] = useState<CartItem[]>(() => {
    // Initial load will just use guest cart or wait for effect
    return [];
  });

  const [prevUser, setPrevUser] = useState(user?.id);

  // Load cart when user changes, and clear on logout
  useEffect(() => {
    // If user logged out
    if (prevUser && !user) {
      localStorage.removeItem("cart_guest");
      localStorage.removeItem(`cart_${prevUser}`);
      setItems([]);
    } else {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems([]);
      }
    }
    setPrevUser(user?.id);
  }, [user, cartKey, prevUser]);

  // Save cart when items change
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, cartKey]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      // Check if item with same productId, size, and dates already exists
      const existing = prev.find(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.startDate === item.startDate &&
          i.endDate === item.endDate
      );

      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
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
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalDeposit = items.reduce((acc, item) => acc + item.depositAmount * item.quantity, 0);

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
