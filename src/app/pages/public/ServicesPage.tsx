import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Search } from 'lucide-react';
import { db, Service, Stylist, BookingSettings } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import exampleImage from 'figma:asset/e3a648e0743fbf117317611e9afa1b7f6dff0214.png';

export default function ServicesPage() {
  const navigate = useNavigate();
  
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Hero Stylist (Monique)
  const monique = stylists.find(s => s.name.toLowerCase().includes('monique')) || stylists[0];

  useEffect(() => {
    async function loadData() {
      // Seed if needed for first run
      await db.seedIfNeeded();
      
      const [sData, stData, bData] = await Promise.all([
        db.getServices(),
        db.getStylists(),
        db.getBookingSettings()
      ]);
      
      // Filter Active only
      setServices(sData.filter(s => s.isActive));
      setStylists(stData.filter(s => s.isActive));
      setBookingSettings(bData);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleBook = () => {
    const url = bookingSettings?.bookingUrl || 'https://structurahair.booksy.com';
    const target = bookingSettings?.openInNewTab ? '_blank' : '_self';
    window.open(url, target);
  };

  // Group Services by Category
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const servicesByCategory: Record<string, Service[]> = {};
  filteredServices.forEach(s => {
    if (!servicesByCategory[s.category]) {
      servicesByCategory[s.category] = [];
    }
    servicesByCategory[s.category].push(s);
  });

  const categoryOrder = ['Cutting', 'Styling', 'Colour', 'Treatments', 'Extensions']; // Preferred order
  const categories = Object.keys(servicesByCategory).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;

  return (
    <div className="min-h-screen bg-ivory text-charcoal font-serif selection:bg-gold/30">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-ivory/80 z-10" />
          {/* Subtle background texture or abstract image could go here */}
          <img 
            src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2000&q=80" 
            className="w-full h-full object-cover opacity-10"
            alt="Texture"
          />
        </div>
        
        <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-5xl md:text-7xl lg:text-8xl leading-tight mb-8"
          >
            Get your hair done <br/>
            <span className="italic text-gold-dark">by {monique?.name || 'Structura'}.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-gray-600 mb-10 font-serif tracking-wide uppercase max-w-2xl mx-auto"
          >
            {monique?.titleLine || "Luxury Hair Salon & Academy"}
          </motion.p>
          
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6, duration: 0.8 }}
             className="flex justify-center"
          >
            <Button 
              onClick={handleBook}
              className="bg-charcoal text-white hover:bg-gold hover:text-white px-10 py-6 text-lg tracking-widest uppercase rounded-none"
            >
              {bookingSettings?.ctaLabel || 'Book Appointment'}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. Search & Filter */}
      <div className="bg-white border-b border-gray-100 sticky top-20 z-40 shadow-sm">
        <div className="container-luxury py-6">
           <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search for a service..." 
                className="pl-12 bg-gray-50 border-gray-200 focus:border-gold rounded-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
        </div>
      </div>

      {/* 3. Services List */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20">
         {categories.length > 0 ? (
           <div className="space-y-32">
             {categories.map((category, index) => (
               <div key={category} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
                  
                  {/* Category Header */}
                  <div className="lg:col-span-4 lg:sticky lg:top-40">
                     <h2 className="font-display text-5xl md:text-6xl mb-4 text-gray-200">{String(index + 1).padStart(2, '0')}</h2>
                     <h3 className="font-display text-4xl text-charcoal mb-4">{category}</h3>
                     <div className="w-12 h-1 bg-gold mb-6" />
                     <p className="text-gray-500 font-serif leading-relaxed">
                        Expertly curated {category.toLowerCase()} services designed to enhance your natural beauty.
                     </p>
                  </div>

                  {/* Services Grid */}
                  <div className="lg:col-span-8 grid grid-cols-1 gap-8">
                     {servicesByCategory[category].map((service) => (
                       <div 
                         key={service.id} 
                         className="group bg-white p-8 border border-gray-100 hover:border-gold/50 hover:shadow-sm transition-all duration-300"
                       >
                          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                             <div>
                               <h4 className="font-display text-2xl mb-2 group-hover:text-gold-dark transition-colors">{service.name}</h4>
                               {service.description && (
                                 <p className="text-gray-500 font-serif text-sm max-w-md mb-4">{service.description}</p>
                               )}
                               <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-gray-400">
                                  {service.durationMinutes && (
                                    <span>{service.durationMinutes} Mins</span>
                                  )}
                                  {/* Stylist Name could go here if needed, but grouping by category implies shared services often */}
                               </div>
                             </div>
                             <div className="flex flex-col items-end gap-4">
                               <span className="font-display text-xl text-charcoal">
                                 {formatCurrency(service.priceMinor / 100, service.currency)}
                               </span>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="uppercase tracking-widest text-xs border-gray-200 hover:border-charcoal hover:bg-charcoal hover:text-white rounded-none"
                                 onClick={handleBook}
                               >
                                 Make a Booking
                               </Button>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="py-20 text-center">
             <h3 className="font-display text-2xl text-gray-400">No services found.</h3>
             <p className="text-gray-500 mt-2">Try adjusting your search or check back later.</p>
           </div>
         )}
      </div>

      {/* 4. Stylist Feature (Bottom) */}
      <section className="bg-white py-24 border-t border-gray-100">
         <div className="container-luxury">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               <div className="order-1 lg:order-1">
                  <span className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 block">Meet the Team</span>
                  <h2 className="text-4xl font-display mb-6">{monique?.name}</h2>
                  <p className="text-xl font-serif text-gray-600 mb-8 italic">{monique?.titleLine}</p>
                  <p className="text-gray-500 leading-relaxed mb-8">
                    {monique?.bio}
                  </p>
                  <Button onClick={handleBook} variant="outline">Book With {monique?.name.split(' ')[0]}</Button>
               </div>
               <div className="order-2 lg:order-2">
                 <div className="aspect-[3/4] bg-[#F7F5F2] relative overflow-hidden rounded-xl">
                    <img 
                        src={exampleImage} 
                        alt="Monique" 
                        className="w-full h-full object-cover object-center" 
                    />
                 </div>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
