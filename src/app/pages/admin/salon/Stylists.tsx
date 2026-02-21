import React, { useState, useEffect } from 'react';
import { db, Stylist } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Check, X, User } from 'lucide-react';
import { generateId } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminStylists() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Stylist>>({
    name: '',
    titleLine: '',
    bio: '',
    profileImageUrl: '',
    isActive: true
  });

  useEffect(() => {
    loadStylists();
  }, []);

  async function loadStylists() {
    setLoading(true);
    const data = await db.getStylists();
    setStylists(data);
    setLoading(false);
  }

  const handleEdit = (stylist: Stylist) => {
    setEditingId(stylist.id);
    setFormData({ ...stylist });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      titleLine: '',
      bio: '',
      profileImageUrl: '',
      isActive: true
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this stylist?')) {
      await db.deleteStylist(id);
      loadStylists();
      toast.success('Stylist deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || generateId();
      const stylist: Stylist = {
        id,
        name: formData.name!,
        titleLine: formData.titleLine,
        bio: formData.bio,
        profileImageUrl: formData.profileImageUrl,
        isActive: formData.isActive ?? true,
        createdAt: editingId ? (stylists.find(s => s.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveStylist(stylist);
      toast.success(editingId ? 'Stylist updated' : 'Stylist created');
      handleCancel();
      loadStylists();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save stylist');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Stylists</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Stylist
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Stylist' : 'Edit Stylist'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Title / Role</Label>
              <Input 
                value={formData.titleLine} 
                onChange={e => setFormData({...formData, titleLine: e.target.value})} 
                placeholder="e.g. Senior Stylist"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea 
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Image URL</Label>
              <Input 
                value={formData.profileImageUrl} 
                onChange={e => setFormData({...formData, profileImageUrl: e.target.value})} 
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center space-x-2">
               <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
               />
               <Label>Active (Visible on site)</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="bg-charcoal text-white">Save Stylist</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stylists.map(stylist => (
          <div key={stylist.id} className={`bg-white border ${stylist.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-75'} p-6 flex flex-col`}>
             <div className="flex items-start gap-4 mb-4">
               <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                  {stylist.profileImageUrl ? (
                    <img src={stylist.profileImageUrl} alt={stylist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
               </div>
               <div>
                 <h3 className="font-display text-xl">{stylist.name}</h3>
                 <p className="text-sm text-gold">{stylist.titleLine}</p>
                 {!stylist.isActive && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Inactive</span>}
               </div>
             </div>
             <p className="text-gray-500 text-sm line-clamp-3 mb-6 flex-grow">{stylist.bio}</p>
             <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(stylist)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(stylist.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
