import React, { useState, useEffect } from 'react';
import { db, Stylist, Service } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash, Copy, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { formatCurrency } from '../../../lib/utils';
import { toast } from 'sonner';

export default function AdminServices() {
  const [activeTab, setActiveTab] = useState('stylists');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-medium text-charcoal">Services & Stylists</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none h-auto p-0 mb-6">
          <TabsTrigger 
            value="stylists" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-charcoal px-6 py-3 font-serif"
          >
            Stylists
          </TabsTrigger>
          <TabsTrigger 
            value="services" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-charcoal px-6 py-3 font-serif"
          >
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stylists" className="m-0">
          <StylistsManager />
        </TabsContent>
        
        <TabsContent value="services" className="m-0">
          <ServicesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------------------------------------------------------------
// STYLISTS MANAGER
// ----------------------------------------------------------------------

function StylistsManager() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStylists();
  }, []);

  const loadStylists = async () => {
    setIsLoading(true);
    const data = await db.getStylists();
    setStylists(data);
    setIsLoading(false);
  };

  const handleSave = async (stylist: Stylist) => {
    await db.saveStylist(stylist);
    toast.success('Stylist saved successfully');
    await loadStylists();
    setView('list');
    setSelectedStylist(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this stylist?')) {
      await db.deleteStylist(id);
      toast.success('Stylist deleted');
      await loadStylists();
    }
  };

  if (view === 'create') {
    return <StylistForm onSave={handleSave} onCancel={() => setView('list')} />;
  }

  if (view === 'edit' && selectedStylist) {
    return <StylistForm initialData={selectedStylist} onSave={handleSave} onCancel={() => { setView('list'); setSelectedStylist(null); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setView('create')} className="bg-charcoal text-white hover:bg-black">
          <Plus className="w-4 h-4 mr-2" /> Add Stylist
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Name / Title</th>
              <th className="p-4">Status</th>
              <th className="p-4">Booking Provider</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stylists.length === 0 ? (
               <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500">
                  No stylists found.
                </td>
              </tr>
            ) : (
              stylists.map((stylist) => (
                <tr key={stylist.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100">
                      {stylist.image ? (
                        <img src={stylist.image} alt={stylist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-charcoal">{stylist.name}</div>
                    <div className="text-xs text-gray-400">{stylist.title}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={stylist.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                      {stylist.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>{stylist.bookingProvider}</span>
                      {stylist.bookingUrl && (
                        <a href={stylist.bookingUrl} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedStylist(stylist); setView('edit'); }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(stylist.bookingUrl, '_blank')}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Preview as Customer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(stylist.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StylistForm({ initialData, onSave, onCancel }: { initialData?: Stylist, onSave: (data: Stylist) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Stylist>(initialData || {
    id: crypto.randomUUID(),
    name: '',
    title: '',
    bio: '',
    image: '',
    bookingProvider: 'Booksie',
    bookingUrl: '',
    status: 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-serif font-medium text-charcoal">
          {initialData ? 'Edit Stylist' : 'Add New Stylist'}
        </h2>
        <Button variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
             <Select value={formData.status} onValueChange={(val: 'active' | 'hidden') => setFormData({...formData, status: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title Line</Label>
          <Input 
            id="title" 
            placeholder="e.g. Senior Stylist & Color Specialist"
            required 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea 
            id="bio" 
            placeholder="Short biography..."
            value={formData.bio || ''} 
            onChange={e => setFormData({...formData, bio: e.target.value})} 
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Profile Image URL</Label>
          <Input 
            id="image" 
            placeholder="https://..."
            value={formData.image || ''} 
            onChange={e => setFormData({...formData, image: e.target.value})} 
          />
          {formData.image && (
            <div className="mt-2 w-20 h-20 rounded-full overflow-hidden border border-gray-100">
              <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Booking Provider</Label>
             <Select value={formData.bookingProvider} onValueChange={(val: any) => setFormData({...formData, bookingProvider: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Booksie">Booksie</SelectItem>
                <SelectItem value="Fresha">Fresha</SelectItem>
                <SelectItem value="Calendly">Calendly</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingUrl">Booking URL</Label>
            <Input 
              id="bookingUrl" 
              placeholder="https://..."
              value={formData.bookingUrl} 
              onChange={e => setFormData({...formData, bookingUrl: e.target.value})} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-charcoal text-white hover:bg-black">Save Stylist</Button>
        </div>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// SERVICES MANAGER
// ----------------------------------------------------------------------

function ServicesManager() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStylist, setFilterStylist] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [servicesData, stylistsData] = await Promise.all([
      db.getServices(),
      db.getStylists()
    ]);
    setServices(servicesData);
    setStylists(stylistsData);
    setIsLoading(false);
  };

  const handleSave = async (service: Service) => {
    await db.saveService(service);
    toast.success('Service saved successfully');
    await loadData();
    setView('list');
    setSelectedService(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await db.deleteService(id);
      toast.success('Service deleted');
      await loadData();
    }
  };

  const filteredServices = services.filter(service => {
    if (filterStylist !== 'all' && service.stylistId !== filterStylist) return false;
    if (filterCategory !== 'all' && service.category !== filterCategory) return false;
    return true;
  });

  const categories = Array.from(new Set(services.map(s => s.category)));

  if (view === 'create') {
    return <ServiceForm stylists={stylists} categories={categories} onSave={handleSave} onCancel={() => setView('list')} />;
  }

  if (view === 'edit' && selectedService) {
    return <ServiceForm stylists={stylists} categories={categories} initialData={selectedService} onSave={handleSave} onCancel={() => { setView('list'); setSelectedService(null); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-lg border border-gray-100">
        <div className="flex gap-4 flex-1">
          <Select value={filterStylist} onValueChange={setFilterStylist}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Stylist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stylists</SelectItem>
              {stylists.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setView('create')} className="bg-charcoal text-white hover:bg-black">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4">Service</th>
              <th className="p-4">Category</th>
              <th className="p-4">Stylist</th>
              <th className="p-4">Price</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredServices.length === 0 ? (
               <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500">
                  No services found.
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => {
                const stylist = stylists.find(s => s.id === service.stylistId);
                return (
                  <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-charcoal">{service.name}</div>
                      <div className="text-xs text-gray-400">{service.duration ? `${service.duration} mins` : ''}</div>
                    </td>
                    <td className="p-4 text-gray-500">{service.category}</td>
                    <td className="p-4 text-gray-500">{stylist?.name || 'Unknown'}</td>
                    <td className="p-4 font-serif">
                      {service.pricingModel === 'Fixed' && formatCurrency(service.price || 0)}
                      {service.pricingModel === 'From' && `From ${formatCurrency(service.fromPrice || 0)}`}
                      {service.pricingModel === 'Tiered' && 'Tiered Pricing'}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={service.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                        {service.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedService(service); setView('edit'); }}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                             // Simple preview implementation - in reality might go to public services page with filter
                             window.open('/services', '_blank');
                          }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Preview as Customer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(service.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceForm({ 
  stylists, 
  categories,
  initialData, 
  onSave, 
  onCancel 
}: { 
  stylists: Stylist[], 
  categories: string[],
  initialData?: Service, 
  onSave: (data: Service) => void, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState<Service>(initialData || {
    id: crypto.randomUUID(),
    stylistId: stylists[0]?.id || '',
    category: '',
    name: '',
    description: '',
    pricingModel: 'Fixed',
    price: 0,
    fromPrice: 0,
    tiers: [],
    duration: '',
    images: [],
    status: 'active'
  });

  const [newImage, setNewImage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [...(formData.tiers || []), { label: '', price: 0 }]
    });
  };

  const updateTier = (index: number, field: 'label' | 'price', value: any) => {
    const newTiers = [...(formData.tiers || [])];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, tiers: newTiers });
  };

  const removeTier = (index: number) => {
    const newTiers = [...(formData.tiers || [])];
    newTiers.splice(index, 1);
    setFormData({ ...formData, tiers: newTiers });
  };

  const addImage = () => {
    if (newImage) {
      setFormData({
        ...formData,
        images: [...(formData.images || []), newImage]
      });
      setNewImage('');
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-serif font-medium text-charcoal">
          {initialData ? 'Edit Service' : 'Add New Service'}
        </h2>
        <Button variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
            <Label htmlFor="stylistId">Stylist</Label>
             <Select value={formData.stylistId} onValueChange={(val) => setFormData({...formData, stylistId: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select Stylist" />
              </SelectTrigger>
              <SelectContent>
                {stylists.map(s => (
                   <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
             <Select value={formData.status} onValueChange={(val: 'active' | 'hidden') => setFormData({...formData, status: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
             {/* Simple input for now to allow creating new categories, or a combobox if I had one */}
             <Input 
              id="category" 
              placeholder="e.g. Cut, Color, Treatment"
              list="categories-list"
              required 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
            />
            <datalist id="categories-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input 
              id="name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            value={formData.description || ''} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            rows={3}
          />
        </div>

        <div className="space-y-4 border p-4 rounded-md border-gray-100">
          <Label>Pricing Model</Label>
          <div className="flex gap-4">
             <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="fixed" 
                  checked={formData.pricingModel === 'Fixed'} 
                  onChange={() => setFormData({...formData, pricingModel: 'Fixed'})}
                  className="rounded-full border-gray-300 text-charcoal focus:ring-gold"
                />
                <Label htmlFor="fixed" className="font-normal">Fixed Price</Label>
             </div>
             <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="from" 
                  checked={formData.pricingModel === 'From'} 
                  onChange={() => setFormData({...formData, pricingModel: 'From'})}
                   className="rounded-full border-gray-300 text-charcoal focus:ring-gold"
                />
                <Label htmlFor="from" className="font-normal">Starting From</Label>
             </div>
             <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="tiered" 
                  checked={formData.pricingModel === 'Tiered'} 
                  onChange={() => setFormData({...formData, pricingModel: 'Tiered'})}
                   className="rounded-full border-gray-300 text-charcoal focus:ring-gold"
                />
                <Label htmlFor="tiered" className="font-normal">Tiered Pricing</Label>
             </div>
          </div>

          {formData.pricingModel === 'Fixed' && (
            <div className="space-y-2">
               <Label htmlFor="price">Price ($)</Label>
               <Input 
                id="price" 
                type="number" 
                min="0"
                value={formData.price} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
              />
            </div>
          )}

          {formData.pricingModel === 'From' && (
            <div className="space-y-2">
               <Label htmlFor="fromPrice">Starting Price ($)</Label>
               <Input 
                id="fromPrice" 
                type="number" 
                min="0"
                value={formData.fromPrice} 
                onChange={e => setFormData({...formData, fromPrice: Number(e.target.value)})} 
              />
            </div>
          )}

          {formData.pricingModel === 'Tiered' && (
             <div className="space-y-2">
               <Label>Price Tiers</Label>
               {formData.tiers?.map((tier, idx) => (
                 <div key={idx} className="flex gap-2 items-center">
                    <Input 
                      placeholder="Label (e.g. Short Hair)" 
                      value={tier.label}
                      onChange={e => updateTier(idx, 'label', e.target.value)}
                    />
                    <Input 
                      type="number" 
                      placeholder="Price" 
                      min="0"
                      className="w-32"
                      value={tier.price}
                      onChange={e => updateTier(idx, 'price', Number(e.target.value))}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(idx)}>
                      <Trash className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </Button>
                 </div>
               ))}
               <Button type="button" variant="outline" size="sm" onClick={addTier} className="mt-2">
                 <Plus className="w-3 h-3 mr-1" /> Add Tier
               </Button>
             </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input 
            id="duration" 
            placeholder="e.g. 60"
            value={formData.duration || ''} 
            onChange={e => setFormData({...formData, duration: e.target.value})} 
          />
        </div>

        <div className="space-y-2">
          <Label>Images</Label>
          <div className="flex gap-2 mb-2">
             <Input 
              placeholder="Image URL" 
              value={newImage}
              onChange={e => setNewImage(e.target.value)}
            />
            <Button type="button" onClick={addImage} variant="secondary">Add</Button>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-4">
             {formData.images?.map((img, idx) => (
               <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                 <img src={img} alt="" className="w-full h-full object-cover" />
                 <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-white/90 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                 </button>
               </div>
             ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-charcoal text-white hover:bg-black">Save Service</Button>
        </div>
      </form>
    </div>
  );
}
