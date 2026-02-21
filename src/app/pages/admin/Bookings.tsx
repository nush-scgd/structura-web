import React, { useState, useEffect } from 'react';
import { kv } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface BookingSettings {
    provider: 'booksie' | 'fresha' | 'calendly' | 'custom';
    bookingUrl: string;
    embedCode: string;
    enabled: boolean;
}

export default function AdminBookings() {
    const [settings, setSettings] = useState<BookingSettings>({
        provider: 'booksie',
        bookingUrl: '',
        embedCode: '',
        enabled: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await kv.get('settings:bookings');
        if (data) setSettings(data);
    };

    const handleSave = async () => {
        setLoading(true);
        await kv.set('settings:bookings', settings);
        setLoading(false);
        toast.success('Booking settings saved');
    };

    return (
        <div className="max-w-2xl space-y-8">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-display font-medium text-charcoal">Bookings Configuration</h1>
                <div className="flex items-center space-x-2">
                    <Switch 
                        checked={settings.enabled} 
                        onCheckedChange={(c) => setSettings({...settings, enabled: c})} 
                    />
                    <Label>Accepting Bookings</Label>
                </div>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm space-y-6">
                <div className="space-y-2">
                    <Label>Booking Provider</Label>
                    <Select 
                        value={settings.provider} 
                        onValueChange={(val: any) => setSettings({...settings, provider: val})}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="booksie">Booksie</SelectItem>
                            <SelectItem value="fresha">Fresha</SelectItem>
                            <SelectItem value="calendly">Calendly</SelectItem>
                            <SelectItem value="custom">Custom Integration</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                        Select the third-party provider you use for salon appointments.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label>Booking URL</Label>
                    <Input 
                        value={settings.bookingUrl} 
                        onChange={(e) => setSettings({...settings, bookingUrl: e.target.value})} 
                        placeholder="https://booksie.com/..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Embed Code (Optional)</Label>
                    <Textarea 
                        value={settings.embedCode} 
                        onChange={(e) => setSettings({...settings, embedCode: e.target.value})} 
                        placeholder="<iframe...>"
                        className="font-mono text-xs"
                    />
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={loading} className="w-full bg-charcoal text-white hover:bg-black">
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
