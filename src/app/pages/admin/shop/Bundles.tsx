import React, { useState, useEffect } from 'react';
import { db, Bundle, Product, Brand } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { generateId, slugify, formatCurrency } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form
  const [formData, setFormData] = useState<Partial<Bundle>>({
    title: '', slug: '', description: '', heroImageUrl: '', 
    priceMinor: 0, currency: 'ZAR', isActive: true, featured: false,
    items: [], brandId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [bu, pr, br] = await Promise.all([db.getBundles(), db.getProducts(), db.getBrands()]);
    setBundles(bu);
    setProducts(pr);
    setBrands(br);
  }

  const handleEdit = (b: Bundle) => {
    setEditingId(b.id);
    setFormData({ ...b });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '', slug: '', description: '', heroImageUrl: '', 
      priceMinor: 0, currency: 'ZAR', isActive: true, featured: false,
      items: [], brandId: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this bundle?')) {
      await db.deleteBundle(id);
      loadData();
      toast.success('Bundle deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const bundle: Bundle = {
        id,
        title: formData.title!,
        slug: formData.slug || slugify(formData.title!),
        description: formData.description || '',
        heroImageUrl: formData.heroImageUrl,
        priceMinor: formData.priceMinor || undefined, // Optional override
        currency: formData.currency || 'ZAR',
        brandId: formData.brandId || undefined,
        isActive: formData.isActive ?? true,
        featured: formData.featured ?? false,
        sortOrder: formData.sortOrder || 0,
        items: formData.items || [],
        createdAt: editingId ? (bundles.find(b => b.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveBundle(bundle);
      toast.success(editingId ? 'Bundle updated' : 'Bundle created');
      handleCancel();
      loadData();
    } catch (error) {
      toast.error('Failed to save bundle');
    }
  };

  const addItem = () => {
     setFormData({...formData, items: [...(formData.items || []), { productId: products[0]?.id || '', quantity: 1 }]});
  };

  const updateItem = (index: number, field: 'productId' | 'quantity', value: any) => {
     const newItems = [...(formData.items || [])];
     newItems[index] = { ...newItems[index], [field]: value };
     setFormData({...formData, items: newItems});
  };

  const removeItem = (index: number) => {
     const newItems = [...(formData.items || [])];
     newItems.splice(index, 1);
     setFormData({...formData, items: newItems});
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Bundles</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Create Bundle
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Bundle' : 'Edit Bundle'}</h2>
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
                 <option value="">None / General</option>
                 {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
            </div>

            <div className="space-y-2 md:col-span-2">
               <Label>Description</Label>
               <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="space-y-2">
               <Label>Price Override (Minor Units)</Label>
               <Input type="number" value={formData.priceMinor || ''} onChange={e => setFormData({...formData, priceMinor: Number(e.target.value)})} placeholder="Leave blank to sum items" />
            </div>

            <div className="space-y-2">
               <Label>Hero Image URL</Label>
               <Input value={formData.heroImageUrl} onChange={e => setFormData({...formData, heroImageUrl: e.target.value})} placeholder="https://..." />
            </div>

            {/* Bundle Items */}
            <div className="md:col-span-2 border p-4 bg-gray-50 rounded">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Bundle Items</h3>
                  <Button type="button" size="sm" onClick={addItem} variant="outline"><Plus className="w-3 h-3 mr-1"/> Add Item</Button>
               </div>
               {formData.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-4 mb-2 items-end">
                     <div className="flex-1">
                        <Label className="text-xs">Product</Label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                        >
                           {products.map(p => <option key={p.id} value={p.id}>{p.title} ({p.sku})</option>)}
                        </select>
                     </div>
                     <div className="w-24">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                     </div>
                     <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
               ))}
               {formData.items?.length === 0 && <p className="text-sm text-gray-500 italic">No items in bundle.</p>}
            </div>

            <div className="flex items-center space-x-2">
               <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} />
               <Label>Active</Label>
            </div>
            
             <div className="flex items-center space-x-2">
               <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
               <Label>Featured</Label>
            </div>

            <div className="md:col-span-2 flex gap-4 pt-4">
              <Button type="submit" className="bg-charcoal text-white">Save Bundle</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200">
        <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
             <tr>
               <th className="p-4">Title</th>
               <th className="p-4">Items</th>
               <th className="p-4">Price</th>
               <th className="p-4">Active</th>
               <th className="p-4 text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {bundles.map(b => (
               <tr key={b.id}>
                 <td className="p-4 font-medium">{b.title}</td>
                 <td className="p-4 text-gray-500">{b.items.length} products</td>
                 <td className="p-4 font-mono">
                   {b.priceMinor ? formatCurrency(b.priceMinor/100, b.currency) : 'Computed'}
                 </td>
                 <td className="p-4">
                   <span className={`w-2 h-2 rounded-full inline-block ${b.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                 </td>
                 <td className="p-4 text-right space-x-2">
                   <button onClick={() => handleEdit(b)} className="text-gray-400 hover:text-charcoal"><Edit2 className="w-4 h-4"/></button>
                   <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
}
