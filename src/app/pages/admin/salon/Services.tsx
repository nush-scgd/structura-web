import React, { useState, useEffect } from 'react';
import { db, Service, Stylist } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { generateId, formatCurrency } from '../../../../lib/utils';
import { Switch } from '../../../components/ui/switch';

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStylist, setFilterStylist] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    category: '',
    description: '',
    priceMinor: 0,
    currency: 'ZAR',
    durationMinutes: 60,
    isActive: true,
    stylistId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sData, stData] = await Promise.all([db.getServices(), db.getStylists()]);
      setServices(sData ?? []);
      setStylists(stData ?? []);
    } catch (err) {
      console.error('Failed to load services/stylists:', err);
      toast.error('Failed to load services');
      setServices([]);
      setStylists([]);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({ ...service });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      priceMinor: 0,
      currency: 'ZAR',
      durationMinutes: 60,
      isActive: true,
      stylistId: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this service?')) {
      await db.deleteService(id);
      loadData();
      toast.success('Service deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.stylistId) {
        toast.error("Please select a stylist");
        return;
      }

      const id = editingId || generateId();
      const service: Service = {
        id,
        stylistId: formData.stylistId,
        category: formData.category!,
        name: formData.name!,
        description: formData.description,
        priceMinor: Number(formData.priceMinor),
        currency: formData.currency || 'ZAR',
        durationMinutes: Number(formData.durationMinutes),
        sortOrder: formData.sortOrder || 0,
        isActive: formData.isActive ?? true,
        images: formData.images || [],
        createdAt: editingId ? (services.find(s => s.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await db.saveService(service);
      toast.success(editingId ? 'Service updated' : 'Service created');
      handleCancel();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save service');
    }
  };

  // Filtering Logic
  const filteredServices = services
    .filter((service) => {
      const name = String(service.name ?? "").toLowerCase();
      const category = String(service.category ?? "").toLowerCase();
      const q = String(searchQuery ?? "").toLowerCase();

      const matchesSearch = name.includes(q) || category.includes(q);
      const matchesCategory = filterCategory === 'all' || String(service.category ?? '') === filterCategory;
      const matchesStylist = filterStylist === 'all' || String(service.stylistId ?? '') === filterStylist;

      return matchesSearch && matchesCategory && matchesStylist;
    })
    .sort((a, b) => {
      const catA = String(a.category ?? "");
      const catB = String(b.category ?? "");
      const byCategory = catA.localeCompare(catB);
      if (byCategory !== 0) return byCategory;
      return (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    });

  const categories = Array.from(
    new Set(
      services
        .map((s) => s.category)
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Salon Services</h1>
        {!editingId && (
          <Button onClick={() => setEditingId('new')}>
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
        )}
      </div>

      {editingId && (
        <div className="bg-white p-8 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
           <h2 className="text-xl font-medium mb-6">{editingId === 'new' ? 'New Service' : 'Edit Service'}</h2>
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                 <Label>Stylist</Label>
                 <select 
                   className="w-full p-2 border border-gray-300 rounded"
                   value={formData.stylistId}
                   onChange={e => setFormData({...formData, stylistId: e.target.value})}
                   required
                 >
                   <option value="">Select Stylist</option>
                   {stylists.map(s => (
                     <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <Label>Category</Label>
                 <Input 
                   value={formData.category} 
                   onChange={e => setFormData({...formData, category: e.target.value})} 
                   placeholder="e.g. Cutting"
                   required
                 />
              </div>

              <div className="space-y-2 md:col-span-2">
                 <Label>Service Name</Label>
                 <Input 
                   value={formData.name} 
                   onChange={e => setFormData({...formData, name: e.target.value})} 
                   required
                 />
              </div>

              <div className="space-y-2 md:col-span-2">
                 <Label>Description</Label>
                 <Textarea 
                   value={formData.description} 
                   onChange={e => setFormData({...formData, description: e.target.value})} 
                 />
              </div>

              <div className="space-y-2">
                 <Label>Price (Minor Units, e.g. 1000 = 10.00)</Label>
                 <Input 
                   type="number"
                   value={formData.priceMinor} 
                   onChange={e => setFormData({...formData, priceMinor: Number(e.target.value)})} 
                   required
                 />
              </div>

              <div className="space-y-2">
                 <Label>Currency</Label>
                 <select 
                   className="w-full p-2 border border-gray-300 rounded"
                   value={formData.currency}
                   onChange={e => setFormData({...formData, currency: e.target.value})}
                 >
                   <option value="ZAR">ZAR (R)</option>
                   <option value="USD">USD ($)</option>
                   <option value="EUR">EUR (€)</option>
                 </select>
              </div>
              
              <div className="space-y-2">
                 <Label>Duration (Minutes)</Label>
                 <Input 
                   type="number"
                   value={formData.durationMinutes} 
                   onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})} 
                 />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                 <Switch 
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                 />
                 <Label>Active Service</Label>
              </div>

              <div className="md:col-span-2 flex gap-4 pt-4 border-t border-gray-100">
                <Button type="submit" className="bg-charcoal text-white">Save Service</Button>
                <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
              </div>
           </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
           <Input 
             placeholder="Search services..." 
             className="pl-9 bg-gray-50 border-gray-200"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
         </div>
         <select 
           className="p-2 border border-gray-300 rounded text-sm w-full md:w-auto"
           value={filterCategory}
           onChange={e => setFilterCategory(e.target.value)}
         >
           <option value="all">All Categories</option>
           {categories.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <select 
           className="p-2 border border-gray-300 rounded text-sm w-full md:w-auto"
           value={filterStylist}
           onChange={e => setFilterStylist(e.target.value)}
         >
           <option value="all">All Stylists</option>
           {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
         </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs font-medium">
            <tr>
              <th className="p-4">Service Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Stylist</th>
              <th className="p-4">Price</th>
              <th className="p-4 text-center">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredServices.map(service => {
              const stylist = stylists.find(s => s.id === service.stylistId);
              return (
                <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-charcoal">{service.name}</td>
                  <td className="p-4 text-gray-600">{service.category}</td>
                  <td className="p-4 text-gray-600">{stylist?.name || 'Unknown'}</td>
                  <td className="p-4 font-mono text-gray-600">{formatCurrency(service.priceMinor / 100, service.currency)}</td>
                  <td className="p-4 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${service.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleEdit(service)} className="text-gray-400 hover:text-charcoal p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 italic">No services found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
