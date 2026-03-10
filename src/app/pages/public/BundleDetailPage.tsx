import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../../../lib/db';
import type { Bundle, Brand, Promotion, Product } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { useCartStore } from '../../../lib/store';
import { Button } from '../../components/ui/Button';
import { Minus, Plus, ShoppingBag, Truck, ShieldCheck, ArrowLeft, Package } from 'lucide-react';

export default function BundleDetailPage() {
  const { slug } = useParams();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [bundleItems, setBundleItems] = useState<{product: Product, quantity: number}[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [basePrice, setBasePrice] = useState(0);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const allBundles = await db.getBundles();
      const b = allBundles.find(x => x.slug === slug);
      
      if (b) {
        setBundle(b);
        
        // Load Brand
        if (b.brandId) {
             const allBrands = await db.getBrands();
             const br = allBrands.find(x => x.id === b.brandId);
             if (br) setBrand(br);
        }

        // Load Items & Calc Base Price
        const allProducts = await db.getProducts();
        const items = [];
        let priceSum = 0;
        
        for (const item of b.items) {
           const p = allProducts.find(x => x.id === item.productId);
           if (p) {
              items.push({ product: p, quantity: item.quantity });
              priceSum += p.priceMinor * item.quantity;
           }
        }
        setBundleItems(items);
        setBasePrice(b.priceMinor || priceSum);

        // Load Stock
        const stock = await db.getBundleStock(b);
        setAvailable(stock);

        // Load Promo
        const promo = await db.getBestPromotion(b.id, 'bundle', []);
        setPromotion(promo);
      }
      setLoading(false);
    }
    loadData();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;
  if (!bundle) return <div className="min-h-screen flex items-center justify-center bg-ivory">Bundle not found</div>;

  const finalPrice = promotion 
    ? (promotion.discountType === 'percent' 
        ? Math.round(basePrice * (1 - promotion.discountValue / 100))
        : Math.max(0, basePrice - promotion.discountValue))
    : basePrice;
    
  const isSale = finalPrice < basePrice;

  const handleAddToCart = () => {
    if (available <= 0) return;
    for(let i=0; i<qty; i++) {
        addItem({
            id: bundle.id,
            type: 'bundle',
            title: bundle.title,
            price: finalPrice / 100,
            currency: bundle.currency,
            image: bundle.heroImageUrl || '',
            maxStock: available,
        });
    }
    setQty(1);
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
                  {bundle.heroImageUrl ? (
                     <img src={bundle.heroImageUrl} alt={bundle.title} className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                     <span className="bg-white text-charcoal border border-charcoal text-xs uppercase tracking-widest px-3 py-1">Bundle</span>
                     {isSale && (
                        <span className="bg-red-600 text-white text-xs uppercase tracking-widest px-3 py-1">Sale</span>
                     )}
                  </div>
               </div>
            </div>

            {/* Info */}
            <div>
               {brand && (
                  <Link to={`/shop?brand=${brand.id}`} className="text-gold uppercase tracking-widest text-sm font-semibold mb-2 block hover:underline">
                     {brand.name}
                  </Link>
               )}
               <h1 className="font-display text-4xl md:text-5xl mb-4 text-charcoal">{bundle.title}</h1>
               
               <div className="flex items-center gap-4 mb-6">
                  {isSale && (
                     <span className="text-xl text-gray-400 line-through font-serif">
                        {formatCurrency(basePrice / 100, bundle.currency)}
                     </span>
                  )}
                  <span className={`text-2xl font-medium ${isSale ? 'text-red-600' : 'text-charcoal'}`}>
                     {formatCurrency(finalPrice / 100, bundle.currency)}
                  </span>
               </div>

               <div className="prose prose-sm prose-stone mb-8">
                  <p>{bundle.description}</p>
               </div>

               {/* Included Items */}
               <div className="bg-gray-50 p-6 mb-8 border border-gray-100">
                  <h3 className="text-sm uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                     <Package className="w-4 h-4" /> Included in this set:
                  </h3>
                  <ul className="space-y-3">
                     {bundleItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                           <span className="font-mono text-gold bg-white px-2 border border-gray-200">{item.quantity}x</span>
                           <Link to={`/shop/product/${item.product.slug}`} className="hover:underline">
                              {item.product.title}
                           </Link>
                        </li>
                     ))}
                  </ul>
               </div>

               {/* Stock */}
               <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 border-y border-gray-100 py-4">
                  <span className={available > 0 ? "text-green-600" : "text-red-600"}>
                     {available > 0 ? `In Stock (${available} sets available)` : "Out of Stock"}
                  </span>
               </div>

               {/* Add to Cart */}
               <div className="flex gap-4 mb-8">
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
                     onClick={handleAddToCart} 
                     disabled={available <= 0}
                     className="flex-1 h-12 bg-charcoal text-white uppercase tracking-widest hover:bg-gold hover:text-charcoal disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                     {available > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
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
