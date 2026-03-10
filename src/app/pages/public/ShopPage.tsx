import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { db } from '../../../lib/db';
import type { Product, Bundle, Brand, Collection, Promotion } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { useCartStore } from '../../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

interface ShopItem {
   id: string;
   type: 'product' | 'bundle';
   title: string;
   slug: string;
   priceMinor: number;
   compareAtPriceMinor?: number; // Base strikethrough
   currency: string;
   image: string;
   brandName?: string;
   available: number;
   promotion?: Promotion;
   featured: boolean;
   createdAt: string;
}

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const filterBrand = searchParams.get('brand') || 'all';
  const filterCollection = searchParams.get('collection') || 'all';
  const filterType = searchParams.get('type') || 'all'; // all, product, bundle
  const sort = searchParams.get('sort') || 'featured'; // featured, newest, price-asc, price-desc
  const searchQuery = searchParams.get('q') || '';

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Seed first
    await db.seedIfNeeded();

    const [products, bundles, allBrands, allCollections, allPromos] = await Promise.all([
       db.getProducts(), db.getBundles(), db.getBrands(), db.getCollections(), db.getPromotions()
    ]);
    
    // Process Products
    const productItems: ShopItem[] = [];
    for (const p of products) {
       if (!p.isActive) continue;
       const stock = p.trackInventory ? await db.getProductStock(p.id) : 999;
       
       // Find Promo
       // Need to find collections this product belongs to
       const productCollectionIds = allCollections.filter(c => c.productIds?.includes(p.id)).map(c => c.id);
       const promo = await db.getBestPromotion(p.id, 'product', productCollectionIds);

       productItems.push({
          id: p.id,
          type: 'product',
          title: p.title,
          slug: p.slug,
          priceMinor: p.priceMinor,
          compareAtPriceMinor: p.compareAtPriceMinor,
          currency: p.currency,
          image: p.images?.[0] || '',
          brandName: allBrands.find(b => b.id === p.brandId)?.name,
          available: stock,
          promotion: promo || undefined,
          featured: p.featured,
          createdAt: p.createdAt
       });
    }

    // Process Bundles
    const bundleItems: ShopItem[] = [];
    for (const b of bundles) {
       if (!b.isActive) continue;
       const stock = await db.getBundleStock(b);
       
       // If price override is set, use it. Else sum items (simplified here, assumption: db stores override or we'd calc)
       let price = b.priceMinor || 0;
       if (!price) {
          // Quick calc sum of parts
          for (const item of b.items) {
             const prod = products.find(p => p.id === item.productId);
             if (prod) price += prod.priceMinor * item.quantity;
          }
       }

       // Find Promo
       const promo = await db.getBestPromotion(b.id, 'bundle', []);

       bundleItems.push({
          id: b.id,
          type: 'bundle',
          title: b.title,
          slug: b.slug,
          priceMinor: price,
          currency: b.currency,
          image: b.heroImageUrl || '',
          brandName: allBrands.find(br => br.id === b.brandId)?.name,
          available: stock,
          promotion: promo || undefined,
          featured: b.featured,
          createdAt: b.createdAt
       });
    }

    setItems([...productItems, ...bundleItems]);
    setBrands(allBrands);
    setCollections(allCollections);
    setLoading(false);
  }

  // Filtering
  const filteredItems = items.filter(item => {
     // Search
     if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
     
     // Brand
     if (filterBrand !== 'all') {
        // Need brand ID map really, but let's match name for simplicity or refetch id
        // In reality, item.brandName is display. Let's assume filterBrand passes ID.
        // Actually, let's match loosely or fix the item data structure to hold brandId.
        // Fixing item structure above is better, but for now let's match name if needed or assume UI passes ID.
        // Let's pass Brand ID in UI.
        // Wait, item only has brandName. Let's fix.
        // Re-mapping brandName logic locally:
        const brandId = brands.find(b => b.name === item.brandName)?.id;
        if (brandId !== filterBrand) return false; 
     }

     // Collection
     if (filterCollection !== 'all') {
        const col = collections.find(c => c.id === filterCollection);
        if (col) {
           if (item.type === 'product' && !col.productIds?.includes(item.id)) return false;
           if (item.type === 'bundle' && !col.bundleIds?.includes(item.id)) return false;
        }
     }

     // Type
     if (filterType !== 'all' && item.type !== filterType) return false;

     return true;
  }).sort((a, b) => {
     switch (sort) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'price-asc': return getFinalPrice(a) - getFinalPrice(b);
        case 'price-desc': return getFinalPrice(b) - getFinalPrice(a);
        default: // featured
           return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
     }
  });

  function getFinalPrice(item: ShopItem) {
     if (!item.promotion) return item.priceMinor;
     if (item.promotion.discountType === 'percent') {
        return Math.round(item.priceMinor * (1 - item.promotion.discountValue / 100));
     }
     return Math.max(0, item.priceMinor - item.promotion.discountValue);
  }

  const handleAddToCart = (item: ShopItem) => {
     if (item.available <= 0) return;
     const finalPrice = getFinalPrice(item);
     addItem({
        id: item.id,
        type: item.type,
        title: item.title,
        price: finalPrice / 100, // Convert to major
        currency: item.currency,
        image: item.image,
        maxStock: item.available
     });
     // Optional toast handled by store or add here
  };

  return (
    <div className="min-h-screen bg-ivory">
       {/* Hero */}
       <div className="bg-charcoal text-ivory py-20 px-6 text-center">
          <h1 className="font-display text-5xl md:text-6xl mb-4">The Collection</h1>
          <p className="font-serif text-gray-400 max-w-2xl mx-auto">
             Curated essentials for the modern aesthetic. Explore our range of premium haircare and exclusive bundles.
          </p>
       </div>

       {/* Controls */}
       <div className="sticky top-20 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="container-luxury py-4 flex flex-col lg:flex-row gap-4 justify-between items-center">
             
             {/* Search */}
             <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-9 bg-gray-50 border-gray-200"
                  value={searchQuery}
                  onChange={e => setSearchParams(prev => { prev.set('q', e.target.value); return prev; })}
                />
             </div>

             {/* Filters */}
             <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                <select 
                   className="p-2 border border-gray-300 rounded text-sm bg-white"
                   value={filterBrand}
                   onChange={e => setSearchParams(prev => { prev.set('brand', e.target.value); return prev; })}
                >
                   <option value="all">All Brands</option>
                   {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <select 
                   className="p-2 border border-gray-300 rounded text-sm bg-white"
                   value={filterCollection}
                   onChange={e => setSearchParams(prev => { prev.set('collection', e.target.value); return prev; })}
                >
                   <option value="all">All Collections</option>
                   {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <select 
                   className="p-2 border border-gray-300 rounded text-sm bg-white"
                   value={filterType}
                   onChange={e => setSearchParams(prev => { prev.set('type', e.target.value); return prev; })}
                >
                   <option value="all">All Types</option>
                   <option value="product">Products</option>
                   <option value="bundle">Bundles</option>
                </select>

                <select 
                   className="p-2 border border-gray-300 rounded text-sm bg-white"
                   value={sort}
                   onChange={e => setSearchParams(prev => { prev.set('sort', e.target.value); return prev; })}
                >
                   <option value="featured">Featured</option>
                   <option value="newest">Newest</option>
                   <option value="price-asc">Price: Low to High</option>
                   <option value="price-desc">Price: High to Low</option>
                </select>
             </div>
          </div>
       </div>

       {/* Grid */}
       <div className="container-luxury py-16">
          {loading ? (
             <div className="text-center py-20 text-gray-400">Loading collection...</div>
          ) : filteredItems.length === 0 ? (
             <div className="text-center py-20 text-gray-400 italic">No products found matching your criteria.</div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                {filteredItems.map(item => {
                   const finalPrice = getFinalPrice(item);
                   const isSale = finalPrice < item.priceMinor;
                   
                   return (
                      <div key={item.id} className="group flex flex-col">
                         {/* Image */}
                         <div className="relative aspect-[3/4] bg-gray-100 mb-4 overflow-hidden">
                            <Link to={`/shop/${item.type}/${item.slug}`}>
                               {item.image ? (
                                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                               )}
                            </Link>
                            
                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                               {item.available <= 0 && (
                                  <span className="bg-charcoal text-white text-[10px] uppercase tracking-widest px-2 py-1">Out of Stock</span>
                               )}
                               {item.type === 'bundle' && (
                                  <span className="bg-white text-charcoal border border-charcoal text-[10px] uppercase tracking-widest px-2 py-1">Bundle</span>
                               )}
                               {isSale && (
                                  <span className="bg-red-600 text-white text-[10px] uppercase tracking-widest px-2 py-1">Sale</span>
                               )}
                            </div>

                            {/* Add to Cart Overlay */}
                            <button 
                               onClick={() => handleAddToCart(item)}
                               disabled={item.available <= 0}
                               className="absolute bottom-0 left-0 w-full bg-charcoal text-white py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 uppercase tracking-widest text-xs disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gold hover:text-charcoal"
                            >
                               {item.available > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                         </div>

                         {/* Details */}
                         <div className="flex-1">
                            <p className="text-xs text-gold uppercase tracking-widest mb-1">{item.brandName}</p>
                            <Link to={`/shop/${item.type}/${item.slug}`}>
                               <h3 className="font-display text-lg leading-tight mb-2 hover:text-gold transition-colors">{item.title}</h3>
                            </Link>
                            <div className="flex items-center gap-3">
                               {isSale && (
                                  <span className="text-gray-400 line-through text-sm font-serif">
                                     {formatCurrency(item.priceMinor / 100, item.currency)}
                                  </span>
                               )}
                               <span className={`font-medium ${isSale ? 'text-red-600' : 'text-charcoal'}`}>
                                  {formatCurrency(finalPrice / 100, item.currency)}
                               </span>
                            </div>
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
       </div>
    </div>
  );
}
