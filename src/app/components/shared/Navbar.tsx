import React from 'react';
import { Link, useLocation } from 'react-router';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useCartStore } from '../../../lib/store';
import { Button } from '../ui/Button';
import { db, BookingSettings } from '../../../lib/db';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const setIsCartOpen = useCartStore((state) => state.setIsOpen);
  const [bookingUrl, setBookingUrl] = React.useState('https://structurahair.booksy.com');
  const [shopEnabled, setShopEnabled] = React.useState(true);

  React.useEffect(() => {
    db.getBookingSettings().then(settings => {
      if (settings?.bookingUrl) {
        setBookingUrl(settings.bookingUrl);
      }
    });
    db.getPlatformSettings().then(settings => {
        setShopEnabled(settings.shopEnabled);
    });
  }, []);

  const handleBookNow = () => {
    window.open(bookingUrl, '_blank');
  };

  const navLinks = [
    { name: 'Salon', path: '/services' },
    { name: 'Academy', path: '/academy' },
    { name: 'Shop', path: '/shop' },
  ].filter(link => shopEnabled || link.name !== 'Shop');

  return (
    <nav className="sticky top-0 z-50 w-full bg-ivory/95 backdrop-blur-sm border-b border-gray-100">
      <div className="container-luxury h-20 flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Logo */}
        <Link to="/" className="text-2xl font-display font-semibold tracking-tighter">
          STRUCTURA
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-sm uppercase tracking-widest hover:text-gold transition-colors",
                location.pathname === link.path ? "text-gold border-b border-gold" : "text-charcoal"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Link to="/login" className="hidden md:block">
            <User className="w-5 h-5 hover:text-gold transition-colors" />
          </Link>
          {shopEnabled && (
          <button 
            className="relative p-2"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="w-5 h-5 hover:text-gold transition-colors" />
            {cartItems.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-gold text-[10px] flex items-center justify-center rounded-full">
                {cartItems.length}
              </span>
            )}
          </button>
          )}
          <Button variant="primary" size="sm" className="hidden md:inline-flex" onClick={handleBookNow}>
            Book Now
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-ivory border-b border-gray-100 py-4 px-6 flex flex-col space-y-4 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-lg font-display"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
            <Link to="/login" className="text-lg font-display flex items-center gap-2">
              <User className="w-5 h-5" /> Login / Signup
            </Link>
            <Button variant="primary" className="w-full" onClick={handleBookNow}>
              Book Appointment
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
