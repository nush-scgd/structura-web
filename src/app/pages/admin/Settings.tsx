import React, { useEffect, useState } from 'react';
import { db, TenantSettings, BookingProvider, Stylist, StylistBooking, PlatformSettings } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash, Save, ExternalLink } from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TenantSettings>({
    defaultCurrency: 'USD',
    allowedCurrencies: ['USD'],
    paymentProviders: { 'USD': 'Stripe' }
  });
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
      academyPaymentMode: 'PAY_BEFORE_ACCESS',
      shopEnabled: true,
      checkoutEnabled: true,
      courseAccessWithoutPayment: false
  });
  
  // Booking State
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylistBookings, setStylistBookings] = useState<StylistBooking[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
          data, 
          fetchedPlatform,
          fetchedProviders, 
          fetchedStylists,
          fetchedStylistBookings
      ] = await Promise.all([
          db.getTenantSettings(),
          db.getPlatformSettings(),
          db.getBookingProviders(),
          db.getStylists(),
          db.getStylistBookings()
      ]);

      if (data) setSettings(data);
      if (fetchedPlatform) setPlatformSettings(fetchedPlatform);
      setProviders(fetchedProviders);
      setStylists(fetchedStylists);
      setStylistBookings(fetchedStylistBookings);

    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await db.saveTenantSettings(settings);
      await db.savePlatformSettings(platformSettings);
      
      // Save Providers
      for (const p of providers) {
          await db.saveBookingProvider(p);
      }
      
      // Save Stylist Bookings
      for (const sb of stylistBookings) {
          await db.saveStylistBooking(sb);
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // --- Currency Helpers ---
  const addCurrency = () => {
    setSettings(prev => ({
      ...prev,
      allowedCurrencies: [...prev.allowedCurrencies, '']
    }));
  };

  const updateCurrency = (index: number, value: string) => {
    setSettings(prev => {
      const newCurrencies = [...prev.allowedCurrencies];
      newCurrencies[index] = value.toUpperCase();
      return { ...prev, allowedCurrencies: newCurrencies };
    });
  };

  const removeCurrency = (index: number) => {
    setSettings(prev => ({
      ...prev,
      allowedCurrencies: prev.allowedCurrencies.filter((_, i) => i !== index)
    }));
  };

  const updateProvider = (currency: string, provider: string) => {
    setSettings(prev => ({
      ...prev,
      paymentProviders: { ...prev.paymentProviders, [currency]: provider }
    }));
  };

  // --- Booking Helpers ---
  const addBookingProvider = () => {
      const newProvider: BookingProvider = {
          id: `bp_${Date.now()}`,
          providerName: 'Booksy',
          baseUrl: '',
          isActive: providers.length === 0 // Make active if first
      };
      setProviders([...providers, newProvider]);
  };

  const updateBookingProvider = (id: string, field: keyof BookingProvider, value: any) => {
      setProviders(prev => prev.map(p => {
          if (p.id !== id) {
              if (field === 'isActive' && value === true) return { ...p, isActive: false }; // Enforce single active for simplicity
              return p;
          }
          return { ...p, [field]: value };
      }));
  };

  const removeBookingProvider = async (id: string) => {
      await db.deleteBookingProvider(id);
      setProviders(prev => prev.filter(p => p.id !== id));
  };

  const updateStylistBooking = (stylistId: string, url: string) => {
      setStylistBookings(prev => {
          const existing = prev.find(sb => sb.stylistId === stylistId);
          if (existing) {
              return prev.map(sb => sb.stylistId === stylistId ? { ...sb, bookingUrl: url } : sb);
          } else {
              return [...prev, {
                  id: `sb_${Date.now()}`,
                  stylistId,
                  bookingProviderId: providers.find(p => p.isActive)?.id || '',
                  bookingUrl: url
              }];
          }
      });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md py-4 z-10 border-b border-gray-100">
        <h1 className="text-2xl font-display font-medium text-charcoal">Store Settings</h1>
        <Button onClick={handleSave} className="bg-charcoal text-white hover:bg-black gap-2">
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </div>

      <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm space-y-12">
        
        {/* Platform Configuration */}
        <div>
           <h2 className="text-lg font-display mb-6 border-b border-gray-100 pb-2">Platform Configuration</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                   <Label>Academy Payment Mode</Label>
                   <Select 
                       value={platformSettings.academyPaymentMode} 
                       onValueChange={(val: any) => setPlatformSettings({...platformSettings, academyPaymentMode: val})}
                   >
                       <SelectTrigger>
                           <SelectValue placeholder="Select Mode" />
                       </SelectTrigger>
                       <SelectContent>
                           <SelectItem value="PAY_BEFORE_ACCESS">Pay Before Access</SelectItem>
                           <SelectItem value="PAY_AFTER_ACCESS">Pay After Access</SelectItem>
                           <SelectItem value="NO_PAYMENTS">No Payments Required</SelectItem>
                       </SelectContent>
                   </Select>
                   <p className="text-xs text-gray-500">
                       Determines when students gain access to course content.
                   </p>
               </div>

               <div className="space-y-6">
                   <div className="flex items-center justify-between">
                       <div className="space-y-0.5">
                           <Label>Enable Shop</Label>
                           <p className="text-xs text-gray-500">Show shop link and enable checkout flow.</p>
                       </div>
                       <Switch 
                           checked={platformSettings.shopEnabled}
                           onCheckedChange={(checked) => setPlatformSettings({...platformSettings, shopEnabled: checked})}
                       />
                   </div>

                   <div className="flex items-center justify-between">
                       <div className="space-y-0.5">
                           <Label>Enable Checkout</Label>
                           <p className="text-xs text-gray-500">Allow customers to purchase items online.</p>
                       </div>
                       <Switch 
                           checked={platformSettings.checkoutEnabled}
                           onCheckedChange={(checked) => setPlatformSettings({...platformSettings, checkoutEnabled: checked})}
                           disabled={!platformSettings.shopEnabled}
                       />
                   </div>

                   <div className="flex items-center justify-between">
                       <div className="space-y-0.5">
                           <Label>Access Without Payment</Label>
                           <p className="text-xs text-gray-500">Grant access immediately even if payment is pending (Pay After Access mode).</p>
                       </div>
                       <Switch 
                           checked={platformSettings.courseAccessWithoutPayment}
                           onCheckedChange={(checked) => setPlatformSettings({...platformSettings, courseAccessWithoutPayment: checked})}
                       />
                   </div>
               </div>
           </div>
        </div>

        {/* Booking System Section */}
        <div>
           <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-2">
               <h2 className="text-lg font-display">Booking Integration</h2>
               <Button variant="outline" size="sm" onClick={addBookingProvider}>
                   <Plus className="w-4 h-4 mr-2" /> Add Provider
               </Button>
           </div>

           <div className="space-y-8">
               {/* Providers List */}
               <div className="space-y-4">
                   <Label>Booking Providers</Label>
                   {providers.length > 0 ? (
                       providers.map(provider => (
                           <div key={provider.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded border border-gray-100">
                               <div className="md:col-span-3">
                                   <Label className="text-xs text-gray-500 mb-1 block">Provider Name</Label>
                                   <Input 
                                      value={provider.providerName}
                                      onChange={(e) => updateBookingProvider(provider.id, 'providerName', e.target.value)}
                                   />
                               </div>
                               <div className="md:col-span-6">
                                   <Label className="text-xs text-gray-500 mb-1 block">Base Booking URL</Label>
                                   <Input 
                                      value={provider.baseUrl}
                                      onChange={(e) => updateBookingProvider(provider.id, 'baseUrl', e.target.value)}
                                      placeholder="https://structura.booksy.com"
                                   />
                               </div>
                               <div className="md:col-span-2 flex items-center justify-center pb-3">
                                   <label className="flex items-center gap-2 cursor-pointer">
                                       <input 
                                          type="checkbox"
                                          checked={provider.isActive}
                                          onChange={(e) => updateBookingProvider(provider.id, 'isActive', e.target.checked)}
                                          className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold"
                                       />
                                       <span className="text-sm font-medium">Active</span>
                                   </label>
                               </div>
                               <div className="md:col-span-1 pb-1">
                                   <Button variant="ghost" size="icon" onClick={() => removeBookingProvider(provider.id)} className="text-red-500">
                                       <Trash className="w-4 h-4" />
                                   </Button>
                               </div>
                           </div>
                       ))
                   ) : (
                       <div className="text-sm text-gray-500 italic">No booking providers configured.</div>
                   )}
               </div>

               {/* Stylist Overrides */}
               {stylists.length > 0 && providers.length > 0 && (
                   <div className="space-y-4 border-t border-gray-100 pt-6">
                       <Label>Stylist Direct Links</Label>
                       <p className="text-xs text-gray-500 mb-4">Override the default provider URL for specific stylists (e.g., direct deep link to their calendar).</p>
                       
                       <div className="grid grid-cols-1 gap-4">
                           {stylists.map(stylist => {
                               const booking = stylistBookings.find(sb => sb.stylistId === stylist.id);
                               return (
                                   <div key={stylist.id} className="flex items-center gap-4">
                                       <div className="w-48 flex-shrink-0 font-medium text-sm">
                                           {stylist.name}
                                       </div>
                                       <div className="flex-1">
                                           <Input 
                                              placeholder={`Default: ${providers.find(p => p.isActive)?.baseUrl}`}
                                              value={booking?.bookingUrl || ''}
                                              onChange={(e) => updateStylistBooking(stylist.id, e.target.value)}
                                           />
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
               )}
           </div>
        </div>

        {/* Currency Section */}
        <div>
          <h2 className="text-lg font-display mb-6 border-b border-gray-100 pb-2">Currency & Payments</h2>
          
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select 
                  value={settings.defaultCurrency} 
                  onValueChange={(val) => setSettings(s => ({ ...s, defaultCurrency: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select default currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.allowedCurrencies.filter(c => c && c.length === 3).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <Label>Allowed Currencies</Label>
                 <Button type="button" variant="outline" size="sm" onClick={addCurrency} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Currency
                 </Button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {settings.allowedCurrencies.map((currency, index) => (
                  <div key={index} className="flex gap-4 items-start bg-white p-3 rounded border border-gray-100 shadow-sm">
                    <div className="w-32">
                      <Label className="text-xs text-gray-500 mb-1 block">Currency Code</Label>
                      <Input 
                        value={currency} 
                        onChange={(e) => updateCurrency(index, e.target.value)} 
                        placeholder="e.g. USD"
                        maxLength={3}
                        className="uppercase font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500 mb-1 block">Payment Provider</Label>
                      <Select 
                        value={settings.paymentProviders[currency] || ''} 
                        onValueChange={(val) => updateProvider(currency, val)}
                        disabled={!currency || currency.length < 3}
                      >
                        <SelectTrigger className="w-full">
                           <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stripe">Stripe</SelectItem>
                          <SelectItem value="Paystack">Paystack</SelectItem>
                          <SelectItem value="PayPal">PayPal</SelectItem>
                          <SelectItem value="Razorpay">Razorpay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-6">
                      <Button variant="ghost" size="icon" onClick={() => removeCurrency(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
