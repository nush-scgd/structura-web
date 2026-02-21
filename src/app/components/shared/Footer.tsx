import React, { useState } from 'react';
import { Link } from 'react-router';
import { Instagram } from 'lucide-react';
import { db } from '../../../lib/db';
import { toast } from 'sonner';

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await db.addNewsletterSubscriber(email);
      toast.success('Thank you for subscribing!');
      setEmail('');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-charcoal text-ivory pt-20 pb-10">
      <div className="container-luxury grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div>
          <h3 className="text-2xl font-display mb-6">STRUCTURA</h3>
          <p className="font-serif text-gray-400 leading-relaxed">
            Redefining hair artistry through precision, education, and luxury care.
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg mb-6 text-gold">Explore</h4>
          <ul className="space-y-4">
            <li><Link to="/services" className="hover:text-gold transition-colors">Salon Services</Link></li>
            <li><Link to="/academy" className="hover:text-gold transition-colors">The Academy</Link></li>
            <li><Link to="/shop" className="hover:text-gold transition-colors">Shop Products</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg mb-6 text-gold">Visit Us</h4>
          <address className="not-italic text-gray-400 space-y-2">
            <a 
              href="https://www.google.com/maps/search/?api=1&query=76+Jan+Shoba+St,+Colbyn,+Pretoria,+0186" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gold transition-colors block"
            >
              <p>76 Jan Shoba St</p>
              <p>Colbyn</p>
              <p>Pretoria, 0186</p>
              <p>South Africa</p>
            </a>
            <div className="pt-2 space-y-2">
              <a href="tel:+27618283238" className="block hover:text-gold transition-colors">Phone: +27 61 828 3238</a>
              <a href="mailto:bookings@structurahair.co.za" className="block hover:text-gold transition-colors">Email: bookings@structurahair.co.za</a>
            </div>
          </address>
          {/* Optional Instagram Link */}
          <div className="mt-6">
            <a 
              href="https://www.instagram.com/structura_hair_salon" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Visit Structura Hair Salon on Instagram"
              className="text-gray-400 hover:text-gold transition-colors inline-flex items-center justify-center min-w-[40px] min-h-[40px] -ml-2.5"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg mb-6 text-gold">Stay Updated</h4>
          <p className="text-gray-400 mb-4">Subscribe to our newsletter for academy updates and exclusive offers.</p>
          <form onSubmit={handleSubscribe} className="flex border-b border-gray-600 pb-2">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent w-full focus:outline-none placeholder:text-gray-600 text-ivory"
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="text-gold uppercase text-sm tracking-widest hover:text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'JOINING...' : 'JOIN'}
            </button>
          </form>
        </div>
      </div>

      <div className="container-luxury border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <p>© 2026 Structura Hair & Academy. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link to="/policies" className="hover:text-gold">Privacy Policy</Link>
          <Link to="/policies" className="hover:text-gold">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
