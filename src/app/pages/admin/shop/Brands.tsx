import React, { useState, useEffect } from 'react';
import { db, Brand } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { generateId } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form
  const [formData, setFormData] = useState<Partial<Brand>>({
    name: '',
    description: '',
    logoUrl: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const data = await db.getBrands();
    setBrands(data.sort((a,b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({ ...brand });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', logoUrl: '', isActive: true });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this brand?')) {
      await db.deleteBrand(id);
      loadData();
      toast.success('Brand deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const brand: Brand = {
        id,
        name: formData.name!,
        description: formData.description,
        logoUrl: formData.logoUrl,
        isActive: formData.isActive ?? true,
        createdAt: editingId ? (brands.find(b => b.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveBrand(brand);
      toast.success(editingId ? 'Brand updated' : 'Brand created');
      handleCancel();
      loadData();
    } catch (error) {
      toast.error('Failed to save brand');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Brands</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Brand
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Brand' : 'Edit Brand'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})} placeholder="https://..." />
            </div>

            <div className="flex items-center space-x-2">
               <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} />
               <Label>Active</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="bg-charcoal text-white">Save Brand</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map(brand => (
          <div key={brand.id} className="bg-white border border-gray-200 p-6 flex flex-col items-center text-center hover:border-gold transition-colors">
             {brand.logoUrl ? (
               <img src={brand.logoUrl} alt={brand.name} className="h-16 object-contain mb-4" />
             ) : (
               <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-xl font-display text-gray-400">
                 {brand.name.substring(0,1)}
               </div>
             )}
             <h3 className="font-display text-xl mb-2">{brand.name}</h3>
             <p className="text-sm text-gray-500 mb-4">{brand.description || 'No description'}</p>
             <div className="mt-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(brand)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(brand.id)}>Delete</Button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
