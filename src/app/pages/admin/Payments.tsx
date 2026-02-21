import React, { useState, useEffect } from 'react';
import { kv } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

interface PaymentSettings {
    provider: 'paystack' | 'stripe' | 'custom';
    publicKey: string;
    secretKey: string;
    webhookUrl: string;
    enabled: boolean;
}

export default function AdminPayments() {
    const [settings, setSettings] = useState<PaymentSettings>({
        provider: 'paystack',
        publicKey: '',
        secretKey: '',
        webhookUrl: '',
        enabled: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await kv.get('settings:payments');
        if (data) setSettings(data);
    };

    const handleSave = async () => {
        setLoading(true);
        await kv.set('settings:payments', settings);
        setLoading(false);
        toast.success('Payment settings saved');
    };

    return (
        <div className="max-w-2xl space-y-8">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-display font-medium text-charcoal">Payments & Providers</h1>
                <div className="flex items-center space-x-2">
                    <Switch 
                        checked={settings.enabled} 
                        onCheckedChange={(c) => setSettings({...settings, enabled: c})} 
                    />
                    <Label>Accepting Payments</Label>
                </div>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm space-y-6">
                <div className="space-y-2">
                    <Label>Payment Provider</Label>
                    <Select 
                        value={settings.provider} 
                        onValueChange={(val: any) => setSettings({...settings, provider: val})}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paystack">Paystack</SelectItem>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="custom">Custom Gateway</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Public Key</Label>
                    <Input 
                        value={settings.publicKey} 
                        onChange={(e) => setSettings({...settings, publicKey: e.target.value})} 
                        type="password"
                        placeholder="pk_test_..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Secret Key</Label>
                    <Input 
                        value={settings.secretKey} 
                        onChange={(e) => setSettings({...settings, secretKey: e.target.value})} 
                        type="password"
                        placeholder="sk_test_..."
                    />
                </div>
                 
                 <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input 
                        value={settings.webhookUrl} 
                        onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})} 
                        placeholder="https://..."
                    />
                    <p className="text-xs text-gray-400">Add this URL to your provider's dashboard.</p>
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
