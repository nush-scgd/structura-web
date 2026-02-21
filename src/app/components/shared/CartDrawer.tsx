import React, { useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../../lib/store';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../ui/Button';
import { Link, useNavigate } from 'react-router';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, total, currency, error, clearError, clearCart } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  // Clear error when drawer closes if you want, or keep it.
  // Better to let user clear it or clear it when they fix the issue.

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-ivory shadow-2xl z-50 flex flex-col border-l border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur">
              <h2 className="text-xl font-display">Your Cart ({items.length})</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-b border-red-100 p-4 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium mb-1">Currency Mismatch</p>
                  <p className="text-xs text-red-600 leading-relaxed mb-3">
                    {error}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => clearCart()}
                      className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                    >
                      Clear Cart & Start New
                    </button>
                    <button 
                      onClick={() => clearError()}
                      className="text-xs text-red-500 hover:text-red-700 underline px-2 py-1.5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-gray-400">
                  <ShoppingBag className="w-12 h-12 stroke-1" />
                  <p className="font-serif">Your cart is currently empty.</p>
                  <Button variant="outline" onClick={onClose}>Continue Shopping</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-24 bg-gray-100 overflow-hidden rounded-sm flex-shrink-0 relative">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-display text-base leading-tight pr-4">{item.title}</h3>
                            <p className="font-serif text-sm whitespace-nowrap">{formatCurrency(item.price, currency || 'USD')}</p>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{item.category}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-gray-200 rounded-sm">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-50 transition-colors text-gray-500"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-50 transition-colors text-gray-500"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white space-y-4">
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Currency</span>
                      <span className="uppercase font-medium text-charcoal">{currency}</span>
                   </div>
                   <div className="flex justify-between items-center text-xl font-display">
                      <span>Subtotal</span>
                      <span>{formatCurrency(total(), currency || 'USD')}</span>
                   </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Shipping and taxes calculated at checkout.
                </p>
                <Button className="w-full bg-charcoal text-white hover:bg-black py-4" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
