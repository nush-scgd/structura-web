import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { db, Service, BookingSettings, Stylist } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Clock, Calendar, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function ServiceDetailPage() {
  // NOTE: This page might not be heavily used if the list view handles everything, 
  // but sticking to the spec to have a detail route.
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const [sData, bData] = await Promise.all([
        db.getService(id),
        db.getBookingSettings()
      ]);
      
      if (sData) {
        setService(sData);
        if (sData.stylistId) {
          const stData = await db.getStylist(sData.stylistId);
          setStylist(stData);
        }
      }
      setBookingSettings(bData);
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleBook = () => {
    const url = bookingSettings?.bookingUrl || 'https://structurahair.booksy.com';
    const target = bookingSettings?.openInNewTab ? '_blank' : '_self';
    window.open(url, target);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;
  if (!service) return <div className="min-h-screen flex items-center justify-center bg-ivory">Service not found</div>;

  return (
    <div className="min-h-screen bg-ivory text-charcoal font-serif pt-32 pb-20">
      <div className="container-luxury max-w-4xl">
         
         <button onClick={() => navigate('/services')} className="flex items-center text-xs uppercase tracking-widest text-gray-500 hover:text-charcoal mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Services
         </button>

         <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-sm relative overflow-hidden">
            {/* Top Border Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gold" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div>
                  <span className="text-gold uppercase tracking-widest text-xs font-semibold mb-2 block">{service.category}</span>
                  <h1 className="font-display text-4xl md:text-5xl mb-6">{service.name}</h1>
                  
                  <div className="flex flex-col gap-4 mb-8">
                     <div className="flex items-center gap-3 text-gray-600">
                        <span className="font-display text-2xl text-charcoal">{formatCurrency(service.priceMinor / 100, service.currency)}</span>
                     </div>
                     {service.durationMinutes && (
                       <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                          <Clock className="w-4 h-4" /> {service.durationMinutes} Minutes
                       </div>
                     )}
                  </div>

                  <p className="text-gray-600 leading-relaxed mb-8">
                    {service.description || "Experience our signature service designed to enhance your personal style."}
                  </p>
                  
                  {stylist && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 mb-8">
                       <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                          {stylist.profileImageUrl && <img src={stylist.profileImageUrl} className="w-full h-full object-cover" />}
                       </div>
                       <div>
                          <p className="text-xs uppercase tracking-widest text-gray-400">Performed by</p>
                          <p className="font-display text-lg">{stylist.name}</p>
                       </div>
                    </div>
                  )}

                  <Button onClick={handleBook} className="w-full h-14 text-lg bg-charcoal text-white hover:bg-gold hover:text-white uppercase tracking-widest rounded-none">
                     {bookingSettings?.ctaLabel || 'Book Appointment'}
                  </Button>
                  <p className="text-center text-xs text-gray-400 mt-4">
                     Redirects to {bookingSettings?.providerId === 'booksy' ? 'Booksy' : 'Booking Portal'}
                  </p>
               </div>
               
               <div className="relative h-full min-h-[400px] bg-gray-100">
                  {/* If services had images, map them here. For now, use a placeholder or stylist image */}
                  <img 
                    src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=80" 
                    alt="Salon Service" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
                     <p className="text-white font-display text-2xl">Luxury Standard.</p>
                  </div>
               </div>
            </div>
         </div>
         
         {/* Value Props */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              "Premium Products",
              "Expert Consultation",
              "Relaxing Atmosphere"
            ].map((text, i) => (
               <div key={i} className="flex items-center justify-center gap-3 p-6 bg-white border border-gray-100 text-sm uppercase tracking-widest text-gray-500">
                  <Check className="w-4 h-4 text-gold" /> {text}
               </div>
            ))}
         </div>

      </div>
    </div>
  );
}
