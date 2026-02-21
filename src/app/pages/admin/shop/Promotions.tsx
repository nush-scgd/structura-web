import React, { useState, useEffect } from 'react';
import { db, Promotion, Product, Collection, Bundle } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { generateId } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form
  const [formData, setFormData] = useState<Partial<Promotion>>({
    name: '', code: '', active: true, discountType: 'percent', discountValue: 0, priority: 0,
    startAt: '', endAt: '', productIds: [], collectionIds: [], bundleIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [pr, p, c, b] = await Promise.all([db.getPromotions(), db.getProducts(), db.getCollections(), db.getBundles()]);
    setPromotions(pr.sort((a,b) => b.priority - a.priority));
    setProducts(p);
    setCollections(c);
    setBundles(b);
  }

  const handleEdit = (prom: Promotion) => {
    setEditingId(prom.id);
    setFormData({ ...prom });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '', code: '', active: true, discountType: 'percent', discountValue: 0, priority: 0,
      startAt: '', endAt: '', productIds: [], collectionIds: [], bundleIds: []
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this promotion?')) {
      await db.deletePromotion(id);
      loadData();
      toast.success('Promotion deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const promotion: Promotion = {
        id,
        name: formData.name!,
        code: formData.code,
        active: formData.active ?? true,
        discountType: formData.discountType as 'percent' | 'fixed',
        discountValue: Number(formData.discountValue),
        priority: Number(formData.priority),
        startAt: formData.startAt || undefined,
        endAt: formData.endAt || undefined,
        productIds: formData.productIds || [],
        collectionIds: formData.collectionIds || [],
        bundleIds: formData.bundleIds || [],
        createdAt: editingId ? (promotions.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.savePromotion(promotion);
      toast.success(editingId ? 'Promotion updated' : 'Promotion created');
      handleCancel();
      loadData();
    } catch (error) {
      toast.error('Failed to save promotion');
    }
  };

  const toggleSelection = (field: 'productIds' | 'collectionIds' | 'bundleIds', id: string) => {
      const current = formData[field] || [];
      const newSelection = current.includes(id) 
         ? current.filter(x => x !== id)
         : [...current, id];
      setFormData({...formData, [field]: newSelection});
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Promotions</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Promotion
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Promotion' : 'Edit Promotion'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <Label>Name</Label>
               <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
             </div>

             <div className="space-y-2">
               <Label>Code (Optional)</Label>
               <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
             </div>

             <div className="space-y-2">
               <Label>Discount Type</Label>
               <select className="w-full p-2 border border-gray-300 rounded" value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value as any})}>
                 <option value="percent">Percentage (%)</option>
                 <option value="fixed">Fixed Amount (Minor Units)</option>
               </select>
             </div>

             <div className="space-y-2">
               <Label>Value</Label>
               <Input type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})} required />
             </div>

             <div className="space-y-2">
               <Label>Start Date</Label>
               <Input type="datetime-local" value={formData.startAt || ''} onChange={e => setFormData({...formData, startAt: e.target.value})} />
             </div>

             <div className="space-y-2">
               <Label>End Date</Label>
               <Input type="datetime-local" value={formData.endAt || ''} onChange={e => setFormData({...formData, endAt: e.target.value})} />
             </div>

             <div className="space-y-2">
               <Label>Priority (Higher wins)</Label>
               <Input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: Number(e.target.value)})} />
             </div>

             <div className="flex items-center space-x-2 pt-8">
               <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
               <Label>Active</Label>
             </div>

             {/* Applicability Selectors */}
             <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-semibold">Applies To:</h3>
                
                <div className="grid grid-cols-3 gap-6">
                   <div>
                      <Label className="mb-2 block">Collections</Label>
                      <div className="border p-2 max-h-40 overflow-y-auto bg-gray-50 rounded">
                         {collections.map(c => (
                            <label key={c.id} className="flex items-center space-x-2 mb-1 cursor-pointer">
                               <input type="checkbox" checked={formData.collectionIds?.includes(c.id)} onChange={() => toggleSelection('collectionIds', c.id)} />
                               <span className="text-sm">{c.name}</span>
                            </label>
                         ))}
                      </div>
                   </div>
                   
                   <div>
                      <Label className="mb-2 block">Products</Label>
                      <div className="border p-2 max-h-40 overflow-y-auto bg-gray-50 rounded">
                         {products.map(p => (
                            <label key={p.id} className="flex items-center space-x-2 mb-1 cursor-pointer">
                               <input type="checkbox" checked={formData.productIds?.includes(p.id)} onChange={() => toggleSelection('productIds', p.id)} />
                               <span className="text-sm truncate" title={p.title}>{p.title}</span>
                            </label>
                         ))}
                      </div>
                   </div>

                   <div>
                      <Label className="mb-2 block">Bundles</Label>
                      <div className="border p-2 max-h-40 overflow-y-auto bg-gray-50 rounded">
                         {bundles.map(b => (
                            <label key={b.id} className="flex items-center space-x-2 mb-1 cursor-pointer">
                               <input type="checkbox" checked={formData.bundleIds?.includes(b.id)} onChange={() => toggleSelection('bundleIds', b.id)} />
                               <span className="text-sm truncate" title={b.title}>{b.title}</span>
                            </label>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="md:col-span-2 flex gap-4 pt-4 border-t border-gray-100">
               <Button type="submit" className="bg-charcoal text-white">Save Promotion</Button>
               <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
             </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200">
        <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
             <tr>
               <th className="p-4">Name</th>
               <th className="p-4">Type</th>
               <th className="p-4">Value</th>
               <th className="p-4">Status</th>
               <th className="p-4 text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {promotions.map(p => {
               const now = new Date().getTime();
               let status = 'Active';
               if (!p.active) status = 'Inactive';
               else if (p.startAt && new Date(p.startAt).getTime() > now) status = 'Scheduled';
               else if (p.endAt && new Date(p.endAt).getTime() < now) status = 'Expired';

               return (
                 <tr key={p.id}>
                   <td className="p-4 font-medium">{p.name}</td>
                   <td className="p-4 text-gray-500 capitalize">{p.discountType}</td>
                   <td className="p-4 font-mono">{p.discountValue}</td>
                   <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs 
                        ${status === 'Active' ? 'bg-green-100 text-green-800' : 
                          status === 'Inactive' ? 'bg-gray-100 text-gray-600' :
                          status === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {status}
                      </span>
                   </td>
                   <td className="p-4 text-right space-x-2">
                     <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-charcoal"><Edit2 className="w-4 h-4"/></button>
                     <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
      </div>
    </div>
  );
}
