import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Layers, Users, FileText, Settings, 
  LogOut, GraduationCap, Calendar, CreditCard, BarChart3, Shield, 
  Package, Scissors, UserCheck, Tag, Box, Grid, DollarSign, BookOpen
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { db } from '../../../lib/db';

export function AdminSidebar() {
  const navigate = useNavigate();
  const [shopEnabled, setShopEnabled] = useState(true);

  useEffect(() => {
    db.getPlatformSettings().then(s => setShopEnabled(s.shopEnabled));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Commerce',
      hidden: !shopEnabled,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: Layers, label: 'Inventory', path: '/admin/inventory' },
        { icon: Box, label: 'Collections', path: '/admin/collections' },
        { icon: Grid, label: 'Bundles', path: '/admin/bundles' },
        { icon: Tag, label: 'Promotions', path: '/admin/promotions' },
        { icon: Users, label: 'Customers', path: '/admin/customers' },
      ]
    },
    {
      title: 'Salon',
      items: [
        { icon: Scissors, label: 'Services', path: '/admin/salon/services' },
        { icon: UserCheck, label: 'Stylists', path: '/admin/salon/stylists' },
        { icon: Calendar, label: 'Booking Settings', path: '/admin/booking-settings' },
      ]
    },
    {
      title: 'Education',
      items: [
        { icon: GraduationCap, label: 'Academy', path: '/admin/academy' },
        { icon: Users, label: 'Students', path: '/admin/students' },
      ]
    },
    {
      title: 'Reports',
      items: [
        { icon: DollarSign, label: 'Revenue', path: '/admin/reports/revenue' },
        { icon: ShoppingBag, label: 'Orders', path: '/admin/reports/orders', hidden: !shopEnabled },
        { icon: BookOpen, label: 'Enrollments', path: '/admin/reports/enrollments' },
        { icon: Users, label: 'Students', path: '/admin/reports/students' },
        { icon: Layers, label: 'Inventory', path: '/admin/reports/inventory', hidden: !shopEnabled },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: FileText, label: 'Marketing CMS', path: '/admin/marketing-cms' },
        { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
        { icon: Shield, label: 'Admin Users', path: '/admin/users' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-10 shrink-0 h-screen sticky top-0">
      <div className="p-8 border-b border-gray-100 shrink-0">
        <span className="text-xl font-display font-semibold tracking-wider text-charcoal block">STRUCTURA</span>
        <span className="block text-[10px] text-gold mt-1 uppercase tracking-[0.2em]">Admin Console</span>
      </div>

      <nav className="flex-1 py-6 space-y-8 overflow-y-auto px-0 custom-scrollbar">
        {navGroups.map((group, idx) => (
          !group.hidden && (
          <div key={idx}>
            <h3 className="px-8 text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3">{group.title}</h3>
            {group.items.map((item) => (
              !item.hidden && (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center px-8 py-2.5 text-xs uppercase tracking-widest transition-all",
                  isActive
                    ? "border-l-2 border-gold text-charcoal bg-ivory/50"
                    : "border-l-2 border-transparent text-gray-400 hover:text-charcoal hover:bg-gray-50"
                )}
              >
                <item.icon className="w-4 h-4 mr-4" />
                {item.label}
              </NavLink>
              )
            ))}
          </div>
          )
        ))}
      </nav>

      <div className="p-8 border-t border-gray-100 shrink-0 space-y-4">
         <button 
          onClick={handleLogout}
          className="flex items-center w-full text-xs uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
