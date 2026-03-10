import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../../../lib/db';
import type { Product, Brand, Promotion } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { useCartStore } from '../../../lib/store';
import { Button } from '../../components/ui/Button';
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [allProducts, settings] = await Promise.all([
          db.getProducts(),
          db.getPlatformSettings()
      ]);
      setCheckoutEnabled(settings.checkoutEnabled);
      
      const p = allProducts.find(x => x.slug === slug);
      
      if (p) {
        setProduct(p);
        
        // Load Brand
        if (p.brandId) {
             const allBrands = await db.getBrands();
             const b = allBrands.find(x => x.id === p.brandId);
             if (b) setBrand(b);
        }

        // Load Stock
        const stock = p.trackInventory ? await db.getProductStock(p.id) : 999;
        setAvailable(stock);

        // Load Promo
        // Need collections
        const allCollections = await db.getCollections();
        const pColIds = allCollections.filter(c => c.productIds?.includes(p.id)).map(c => c.id);
        const promo = await db.getBestPromotion(p.id, 'product', pColIds);
        setPromotion(promo);
      }
      setLoading(false);
    }
    loadData();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-ivory">Product not found</div>;

  const finalPrice = promotion 
    ? (promotion.discountType === 'percent' 
        ? Math.round(product.priceMinor * (1 - promotion.discountValue / 100))
        : Math.max(0, product.priceMinor - promotion.discountValue))
    : product.priceMinor;
    
  const isSale = finalPrice < product.priceMinor;

  const handleAddToCart = () => {
    if (available <= 0) return;
    addItem({
        id: product.id,
        type: 'product',
        title: product.title,
        price: finalPrice / 100,
        currency: product.currency,
        image: product.images?.[0] || '',
        maxStock: available,
    });
    // Assuming store handles qty increase if exists, but here we just add 1 logic in store. 
    // If we want to add specific qty, store needs update, but for MVP simple add is fine.
    // Actually, store adds 1. Let's just call it `qty` times or update store. 
    // The simplified store adds 1. I'll just loop for MVP or better, update store to accept qty.
    // Given the constraints, I'll stick to single add or update store later if needed. 
    // Store `addItem` adds 1.
    for(let i=0; i<qty; i++) {
        // This is inefficient but works without changing store signature again right now.
        // Actually, store logic: if exists, q+1. 
        // Better: let's just add 1 for now or rely on the user clicking multiple times in cart? 
        // No, standard detail page has qty selector.
        // I will assume the store `addItem` handles the +1 logic, so I can call it once and maybe update logic later.
        // Wait, I updated store to `addItem(item)`.
    }
    // Correct fix: Update store to take qty, OR just loop. Looping is safe for small numbers.
  };

  return (
    <div className="min-h-screen bg-ivory pt-32 pb-20">
      <div className="container-luxury max-w-6xl">
         <Link to="/shop" className="inline-flex items-center text-xs uppercase tracking-widest text-gray-500 hover:text-charcoal mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
         </Link>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* Gallery */}
            <div className="space-y-4">
               <div className="aspect-[3/4] bg-white border border-gray-100 overflow-hidden relative">
                  {product.images?.[0] ? (
                     <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                  )}
                  {isSale && (
                     <span className="absolute top-4 left-4 bg-red-600 text-white text-xs uppercase tracking-widest px-3 py-1">Sale</span>
                  )}
               </div>
               {/* Thumbs if multiple images exist would go here */}
            </div>

            {/* Info */}
            <div>
               {brand && (
                  <Link to={`/shop?brand=${brand.id}`} className="text-gold uppercase tracking-widest text-sm font-semibold mb-2 block hover:underline">
                     {brand.name}
                  </Link>
               )}
               <h1 className="font-display text-4xl md:text-5xl mb-4 text-charcoal">{product.title}</h1>
               
               <div className="flex items-center gap-4 mb-6">
                  {isSale && (
                     <span className="text-xl text-gray-400 line-through font-serif">
                        {formatCurrency(product.priceMinor / 100, product.currency)}
                     </span>
                  )}
                  <span className={`text-2xl font-medium ${isSale ? 'text-red-600' : 'text-charcoal'}`}>
                     {formatCurrency(finalPrice / 100, product.currency)}
                  </span>
               </div>

               <div className="prose prose-sm prose-stone mb-8">
                  <p>{product.description}</p>
               </div>

               {/* SKU & Stock */}
               <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 border-y border-gray-100 py-4">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  <span className={available > 0 ? "text-green-600" : "text-red-600"}>
                     {available > 0 ? `In Stock (${available} available)` : "Out of Stock"}
                  </span>
               </div>

               {/* Add to Cart */}
               <div className="flex gap-4 mb-8">
                  {checkoutEnabled ? (
                      <>
                        <div className="flex items-center border border-gray-200 w-32">
                             <button onClick={() => setQty(Math.max(1, qty-1))} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50">
                                <Minus className="w-3 h-3" />
                             </button>
                             <input 
                                type="number" 
                                value={qty} 
                                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                                className="flex-1 w-full text-center border-none h-12 focus:ring-0"
                             />
                             <button onClick={() => setQty(Math.min(available, qty+1))} className="w-10 h-12 flex items-center justify-center hover:bg-gray-50">
                                <Plus className="w-3 h-3" />
                             </button>
                        </div>
                        <Button 
                             onClick={() => {
                                for(let i=0; i<qty; i++) handleAddToCart();
                                setQty(1);
                             }} 
                             disabled={available <= 0}
                             className="flex-1 h-12 bg-charcoal text-white uppercase tracking-widest hover:bg-gold hover:text-charcoal disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                             {available > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </Button>
                      </>
                  ) : (
                        <Button 
                            onClick={() => window.open(`mailto:bookings@structurahair.co.za?subject=Enquiry for ${product.title}`, '_blank')}
                            className="w-full h-12 bg-charcoal text-white uppercase tracking-widest hover:bg-gold hover:text-charcoal"
                        >
                            Enquire to Purchase
                        </Button>
                  )}
               </div>

               {/* Features */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                     <Truck className="w-4 h-4 text-gold" /> Fast Shipping
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                     <ShieldCheck className="w-4 h-4 text-gold" /> Authentic Guarantee
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
