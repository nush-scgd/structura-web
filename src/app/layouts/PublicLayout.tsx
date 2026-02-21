import React from 'react';
import { Outlet } from 'react-router';
import { Navbar } from '../components/shared/Navbar';
import { Footer } from '../components/shared/Footer';
import { CartDrawer } from '../components/shared/CartDrawer';
import { useCartStore } from '../../lib/store';
import { db } from '../../lib/db';

export function PublicLayout() {
  const isCartOpen = useCartStore((state) => state.isOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsOpen);

  React.useEffect(() => {
    // Seed data on initial load if needed
    db.seedIfNeeded();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-charcoal font-serif selection:bg-gold selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
