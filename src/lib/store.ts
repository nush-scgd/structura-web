import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Compatible with DB Product/Bundle but simplified for UI
export interface CartItemType {
  id: string; // The ID of the item (productId or bundleId)
  type: 'product' | 'bundle';
  title: string;
  price: number; // Price in MAJOR units (e.g. 100.00)
  currency: string;
  image: string;
  quantity: number;
  maxStock: number; // To prevent adding more than available
}

interface CartState {
  items: CartItemType[];
  isOpen: boolean;
  currency: string | null;
  error: string | null;
  
  // Actions
  addItem: (item: Omit<CartItemType, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  clearError: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currency: null,
      error: null,
      
      addItem: (newItem) => {
        const { items, currency } = get();
        
        // Check currency lock
        if (items.length > 0 && currency && currency !== newItem.currency) {
          set({ 
            error: `Your cart contains items in ${currency}. Please clear your cart to add items in ${newItem.currency}.`,
            isOpen: true
          });
          return;
        }

        const existingItem = items.find((item) => item.id === newItem.id);

        if (existingItem) {
          // Check stock limit
          if (existingItem.quantity >= newItem.maxStock) {
             set({ 
                error: `Sorry, only ${newItem.maxStock} available.`,
                isOpen: true 
             });
             return;
          }

          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            isOpen: true,
            error: null,
            currency: currency || newItem.currency
          });
        } else {
          set({ 
            items: [...items, { ...newItem, quantity: 1 }], 
            isOpen: true,
            error: null,
            currency: currency || newItem.currency
          });
        }
      },
      
      removeItem: (id) => {
        const newItems = get().items.filter((item) => item.id !== id);
        set({ 
          items: newItems,
          currency: newItems.length === 0 ? null : get().currency 
        });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        
        const item = get().items.find(i => i.id === id);
        if (item && quantity > item.maxStock) {
             set({ error: `Cannot add more than ${item.maxStock} items.` });
             return; // Do not update
        }

        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
          error: null
        });
      },
      
      clearCart: () => set({ items: [], currency: null, error: null }),
      setIsOpen: (isOpen) => set({ isOpen }),
      clearError: () => set({ error: null }),
      total: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    }),
    {
      name: 'structura-cart-v2', // Changed name to reset old cache on clients
    }
  )
);
