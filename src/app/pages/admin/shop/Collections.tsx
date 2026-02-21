import React, { useState, useEffect } from 'react';
import { db, Collection, Brand } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { generateId, slugify } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form
  const [formData, setFormData] = useState<Partial<Collection>>({
    name: '',
    slug: '',
    description: '',
    bannerImageUrl: '',
    isActive: true,
    sortOrder: 0,
    brandId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cData, bData] = await Promise.all([db.getCollections(), db.getBrands()]);
    setCollections(cData.sort((a,b) => a.sortOrder - b.sortOrder));
    setBrands(bData);
  }

  const handleEdit = (c: Collection) => {
    setEditingId(c.id);
    setFormData({ ...c });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '', description: '', bannerImageUrl: '', isActive: true, sortOrder: 0, brandId: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this collection?')) {
      await db.deleteCollection(id);
      loadData();
      toast.success('Collection deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const collection: Collection = {
        id,
        name: formData.name!,
        slug: formData.slug || slugify(formData.name!),
        description: formData.description,
        bannerImageUrl: formData.bannerImageUrl,
        brandId: formData.brandId || undefined,
        isActive: formData.isActive ?? true,
        sortOrder: Number(formData.sortOrder),
        productIds: formData.productIds || [], // Persist existing associations
        bundleIds: formData.bundleIds || [],
        createdAt: editingId ? (collections.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveCollection(collection);
      toast.success(editingId ? 'Collection updated' : 'Collection created');
      handleCancel();
      loadData();
    } catch (error) {
      toast.error('Failed to save collection');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Collections</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Collection
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Collection' : 'Edit Collection'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value, slug: slugify(e.target.value)})} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <Label>Brand (Optional)</Label>
              <select 
                className="w-full p-2 border border-gray-300 rounded"
                value={formData.brandId || ''}
                onChange={e => setFormData({...formData, brandId: e.target.value})}
              >
                <option value="">None / General</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
               <Label>Sort Order</Label>
               <Input type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: Number(e.target.value)})} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Banner Image URL</Label>
              <Input value={formData.bannerImageUrl} onChange={e => setFormData({...formData, bannerImageUrl: e.target.value})} placeholder="https://..." />
            </div>

            <div className="flex items-center space-x-2">
               <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} />
               <Label>Active</Label>
            </div>

            <div className="md:col-span-2 flex gap-4 pt-4">
              <Button type="submit" className="bg-charcoal text-white">Save Collection</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs font-medium">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Products</th>
              <th className="p-4">Sort</th>
              <th className="p-4">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {collections.map(c => (
              <tr key={c.id}>
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-gray-500">{c.slug}</td>
                <td className="p-4 text-gray-500">{brands.find(b => b.id === c.brandId)?.name || '-'}</td>
                <td className="p-4 text-gray-500">{c.productIds?.length || 0}</td>
                <td className="p-4 text-gray-500">{c.sortOrder}</td>
                <td className="p-4">
                  <span className={`w-2 h-2 rounded-full inline-block ${c.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleEdit(c)} className="text-gray-400 hover:text-charcoal"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
