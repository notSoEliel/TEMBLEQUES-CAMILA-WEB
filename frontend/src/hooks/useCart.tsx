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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prevUser, setPrevUser] = useState<string | undefined>(undefined);

  // Load cart when auth is ready or user changes
  useEffect(() => {
    if (authLoading) return;

    const cartKey = user ? `cart_${user.id}` : "cart_guest";
    
    // Logic to handle user switching or initial load
    if (user?.id !== prevUser) {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems([]);
      }
      setPrevUser(user?.id);
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
