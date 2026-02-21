import React, { useState, useEffect } from 'react';
import { db, BookingSettings } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Save, ExternalLink } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';

export default function BookingSettingsPage() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const data = await db.getBookingSettings();
    setSettings(data);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await db.saveBookingSettings(settings);
      toast.success('Booking settings updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!settings) return <div>Error loading settings</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-display mb-2">Booking Settings</h1>
      <p className="text-gray-500 mb-8">Configure how booking buttons behave across the entire site.</p>

      <div className="bg-white p-8 border border-gray-200 shadow-sm">
         <form onSubmit={handleSave} className="space-y-8">
            
            <div className="bg-blue-50 border border-blue-100 p-4 flex gap-4 text-blue-800 text-sm">
               <div className="shrink-0 mt-0.5"><ExternalLink className="w-5 h-5" /></div>
               <div>
                 <p className="font-semibold mb-1">Global Redirection Active</p>
                 <p>All "Book Now", "Appointment", and "Make a Booking" buttons on the website will redirect users to the URL configured below.</p>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Booking Provider</Label>
                 <select 
                   className="w-full p-3 border border-gray-300 rounded bg-gray-50"
                   value={settings.providerId}
                   onChange={e => setSettings({...settings, providerId: e.target.value})}
                 >
                   <option value="booksy">Booksy (Recommended)</option>
                   <option value="fresha">Fresha</option>
                   <option value="calendly">Calendly</option>
                   <option value="custom">Custom URL</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <Label>Booking URL</Label>
                 <Input 
                   value={settings.bookingUrl}
                   onChange={e => setSettings({...settings, bookingUrl: e.target.value})}
                   placeholder="https://structurahair.booksy.com"
                   className="font-mono text-sm"
                 />
                 <p className="text-xs text-gray-500">The full URL where customers will be sent.</p>
               </div>

               <div className="space-y-2">
                 <Label>Default CTA Label</Label>
                 <Input 
                   value={settings.ctaLabel}
                   onChange={e => setSettings({...settings, ctaLabel: e.target.value})}
                   placeholder="Book Now"
                 />
               </div>

               <div className="flex items-center space-x-2 pt-2">
                 <Switch 
                    checked={settings.openInNewTab}
                    onCheckedChange={(checked) => setSettings({...settings, openInNewTab: checked})}
                 />
                 <Label>Open in new tab</Label>
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <Button type="submit" className="bg-charcoal text-white h-12 px-6">
                 <Save className="w-4 h-4 mr-2" /> Save Settings
               </Button>
            </div>
         </form>
      </div>
    </div>
  );
}
