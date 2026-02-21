import React from 'react';
import { motion } from 'motion/react';
import { Package, Calendar, MapPin, Settings, LogOut, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router';

export default function AccountPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('profile');
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ivory pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 border-b border-gray-200 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-display text-charcoal mb-2">My Account</h1>
            <p className="text-gray-500 font-serif">Welcome back, {user?.user_metadata?.name || user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut size={16} /> Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wide transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white border-l-2 border-gold text-charcoal shadow-sm'
                      : 'text-gray-500 hover:bg-white/50 hover:text-charcoal'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-8 shadow-sm min-h-[400px]"
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-display mb-6">Profile Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email</label>
                      <div className="p-3 bg-gray-50 border border-gray-100 text-charcoal">{user?.email}</div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                      <input type="text" className="luxury-input" defaultValue={user?.user_metadata?.name} placeholder="Your Name" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Phone</label>
                      <input type="tel" className="luxury-input" placeholder="+1 (555) 000-0000" />
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-display mb-6">Order History</h2>
                  <p className="text-gray-500 italic">No recent orders found.</p>
                </div>
              )}

              {activeTab === 'bookings' && (
                <div>
                  <h2 className="text-2xl font-display mb-6">Salon Bookings</h2>
                  <p className="text-gray-500 italic">No upcoming bookings.</p>
                  <div className="mt-6">
                    <Button variant="outline" onClick={() => navigate('/services')}>Book an Appointment</Button>
                  </div>
                </div>
              )}
              
              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-2xl font-display mb-6">Saved Addresses</h2>
                  <p className="text-gray-500 italic">No addresses saved.</p>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-display mb-6">Account Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50">
                      <div>
                        <h3 className="font-medium">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive updates about your orders and bookings.</p>
                      </div>
                      <input type="checkbox" className="accent-gold h-5 w-5" defaultChecked />
                    </div>
                     <div className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50">
                      <div>
                        <h3 className="font-medium">Marketing Emails</h3>
                        <p className="text-sm text-gray-500">Receive news about new courses and products.</p>
                      </div>
                      <input type="checkbox" className="accent-gold h-5 w-5" />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
