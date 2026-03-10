import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/db';
import type { Product } from '../../../lib/db';
import { useCartStore } from '../../../lib/store';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';
import { formatCurrency } from '../../../lib/utils';
import { Link } from 'react-router';

export default function StudentShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function loadProducts() {
      // Ensure seed
      await db.seedIfNeeded();
      const allProducts = await db.getProducts();
      // Filter active
      setProducts(allProducts.filter(p => p.isActive));
    }
    loadProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    // Check stock
    const stock = product.trackInventory ? await db.getProductStock(product.id) : 999;
    
    if (stock <= 0) {
       toast.error("Out of stock");
       return;
    }

    addItem({
      id: product.id,
      type: 'product',
      title: product.title,
      price: product.priceMinor / 100, // Major units
      currency: product.currency,
      image: product.images?.[0] || '',
      maxStock: stock
    });
    toast.success("Added to cart");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
       <div className="flex items-center justify-between border-b border-gray-100 pb-6">
          <h1 className="text-3xl font-display text-charcoal">Student Store</h1>
          <p className="text-gray-500 font-serif">Kits, tools, and essentials for your courses.</p>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
             <div key={product.id} className="group bg-white border border-gray-100 hover:border-gold/50 transition-colors">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                   <Link to={`/shop/product/${product.slug}`}>
                       {product.images?.[0] ? (
                         <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">No Image</div>
                       )}
                   </Link>
                </div>
                
                <div className="p-4 space-y-2">
                   <p className="text-xs text-gray-400 uppercase tracking-widest">Structura</p>
                   <Link to={`/shop/product/${product.slug}`}>
                      <h3 className="font-display text-lg leading-tight group-hover:text-gold transition-colors truncate">{product.title}</h3>
                   </Link>
                   <div className="flex items-center justify-between pt-2">
                      <p className="font-medium text-charcoal">{formatCurrency(product.priceMinor / 100, product.currency)}</p>
                      <Button size="sm" variant="outline" onClick={() => handleAddToCart(product)} className="text-xs uppercase tracking-widest hover:bg-charcoal hover:text-white transition-colors">
                         Add
                      </Button>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
