import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, Product, Brand, Collection } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { generateId, slugify, formatCurrency } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminProducts() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Form
  const [formData, setFormData] = useState<Partial<Product> & { collectionIds: string[] }>({
    title: '',
    slug: '',
    description: '',
    priceMinor: 0,
    currency: 'ZAR',
    compareAtPriceMinor: 0,
    sku: '',
    brandId: '',
    isActive: true,
    trackInventory: true,
    featured: false,
    images: [],
    collectionIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pData, bData, cData] = await Promise.all([
      db.getProducts(),
      db.getBrands(),
      db.getCollections()
    ]);
    setProducts(pData);
    setBrands(bData);
    setCollections(cData);
  }

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    // Find collections this product belongs to
    const linkedCols = collections.filter(c => c.productIds?.includes(p.id)).map(c => c.id);
    
    setFormData({
      ...p,
      collectionIds: linkedCols
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '', slug: '', description: '', priceMinor: 0, currency: 'ZAR',
      compareAtPriceMinor: 0, sku: '', brandId: '', isActive: true, 
      trackInventory: true, featured: false, images: [], collectionIds: []
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this product?')) {
      await db.deleteProduct(id);
      loadData();
      toast.success('Product deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const product: Product = {
        id,
        title: formData.title!,
        slug: formData.slug || slugify(formData.title!),
        description: formData.description || '',
        priceMinor: Number(formData.priceMinor),
        currency: formData.currency || 'ZAR',
        compareAtPriceMinor: formData.compareAtPriceMinor ? Number(formData.compareAtPriceMinor) : undefined,
        sku: formData.sku,
        brandId: formData.brandId || undefined,
        isActive: formData.isActive ?? true,
        trackInventory: formData.trackInventory ?? true,
        featured: formData.featured ?? false,
        sortOrder: formData.sortOrder || 0,
        images: formData.images || [],
        createdAt: editingId ? (products.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveProduct(product);

      // Update Collections Relations
      const selectedIds = formData.collectionIds || [];
      
      // Add to new
      for (const col of collections) {
         const hasProduct = col.productIds?.includes(id);
         const shouldHave = selectedIds.includes(col.id);
         
         if (shouldHave && !hasProduct) {
            col.productIds = [...(col.productIds || []), id];
            await db.saveCollection(col);
         } else if (!shouldHave && hasProduct) {
            col.productIds = col.productIds.filter(pid => pid !== id);
            await db.saveCollection(col);
         }
      }

      // Initialize Inventory if new
      if (!editingId) {
         await db.updateInventory(id, 0, 'Initial creation');
      }

      toast.success(editingId ? 'Product updated' : 'Product created');
      handleCancel();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save product');
    }
  };

  const filteredProducts = products.filter(p => 
     p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Products</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-8 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Product' : 'Edit Product'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             <div className="space-y-2 md:col-span-2">
               <Label>Title</Label>
               <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value, slug: slugify(e.target.value)})} required />
             </div>

             <div className="space-y-2">
               <Label>Slug</Label>
               <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />
             </div>

             <div className="space-y-2">
               <Label>Brand</Label>
               <select className="w-full p-2 border border-gray-300 rounded" value={formData.brandId || ''} onChange={e => setFormData({...formData, brandId: e.target.value})}>
                 <option value="">Select Brand</option>
                 {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
             </div>

             <div className="space-y-2 md:col-span-2">
               <Label>Description</Label>
               <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
             </div>

             <div className="space-y-2">
               <Label>Price (Minor Units)</Label>
               <Input type="number" value={formData.priceMinor} onChange={e => setFormData({...formData, priceMinor: Number(e.target.value)})} required />
             </div>

             <div className="space-y-2">
               <Label>Compare At Price (Minor, Optional)</Label>
               <Input type="number" value={formData.compareAtPriceMinor || ''} onChange={e => setFormData({...formData, compareAtPriceMinor: Number(e.target.value)})} />
             </div>

             <div className="space-y-2">
               <Label>SKU</Label>
               <Input value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
             </div>

             <div className="space-y-2">
                <Label>Main Image URL</Label>
                <Input value={formData.images?.[0] || ''} onChange={e => setFormData({...formData, images: [e.target.value]})} placeholder="https://..." />
             </div>

             <div className="space-y-2 md:col-span-2">
                <Label>Collections</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border p-4 rounded bg-gray-50 max-h-40 overflow-y-auto">
                   {collections.map(col => (
                     <label key={col.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.collectionIds?.includes(col.id)}
                          onChange={e => {
                             if (e.target.checked) {
                                setFormData({...formData, collectionIds: [...(formData.collectionIds || []), col.id]});
                             } else {
                                setFormData({...formData, collectionIds: formData.collectionIds?.filter(id => id !== col.id)});
                             }
                          }}
                        />
                        <span>{col.name}</span>
                     </label>
                   ))}
                </div>
             </div>

             <div className="md:col-span-2 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                   <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} />
                   <Label>Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                   <Switch checked={formData.trackInventory} onCheckedChange={(checked) => setFormData({...formData, trackInventory: checked})} />
                   <Label>Track Inventory</Label>
                </div>
                <div className="flex items-center space-x-2">
                   <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
                   <Label>Featured</Label>
                </div>
             </div>

             <div className="md:col-span-2 flex gap-4 pt-4 border-t border-gray-100">
               <Button type="submit" className="bg-charcoal text-white">Save Product</Button>
               <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
             </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200">
         <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="pl-9" />
            </div>
         </div>
         <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
             <tr>
               <th className="p-4">Image</th>
               <th className="p-4">Title</th>
               <th className="p-4">Brand</th>
               <th className="p-4">Price</th>
               <th className="p-4">Active</th>
               <th className="p-4 text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {filteredProducts.map(p => (
               <tr key={p.id}>
                 <td className="p-4">
                   <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" />}
                   </div>
                 </td>
                 <td className="p-4 font-medium">
                   {p.title}
                   {p.featured && <span className="ml-2 text-[10px] bg-gold text-white px-1 rounded">FEATURED</span>}
                 </td>
                 <td className="p-4 text-gray-500">{brands.find(b => b.id === p.brandId)?.name || '-'}</td>
                 <td className="p-4 font-mono">{formatCurrency(p.priceMinor / 100, p.currency)}</td>
                 <td className="p-4">
                    <span className={`w-2 h-2 rounded-full inline-block ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                 </td>
                 <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-charcoal"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
}
