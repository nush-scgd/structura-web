import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { db } from '../../../lib/db';
import type { Stylist, Service } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Calendar, Scissors, User } from 'lucide-react';
import { BOOKING_URL } from '../../../lib/constants';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stylistId = searchParams.get('stylistId');
  const serviceId = searchParams.get('serviceId');

  const [loading, setLoading] = useState(true);
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    async function resolveBooking() {
      // Fetch Basic Data for display context
      let foundStylist = stylistId ? await db.getStylist(stylistId) : null;
      let foundService = serviceId ? await db.getService(serviceId) : null;

      // Fallback for Demo (Monique) if DB is empty
      if (!foundStylist && stylistId === 'monique') {
        foundStylist = {
            id: 'monique',
            name: 'Monique',
            title: 'Creative Director',
            bookingProvider: 'Custom',
            bookingUrl: '',
            status: 'active'
        } as Stylist;
      }
      
      setStylist(foundStylist);
      setService(foundService);
      setLoading(false);
    }

    resolveBooking();
  }, [stylistId, serviceId]);

  const handleContinue = () => {
    window.open(BOOKING_URL, '_blank');
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center font-display text-xl animate-pulse">Loading Booking Options...</div>;

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-ivory py-20 px-4">
       <div className="max-w-xl w-full bg-white p-8 md:p-12 shadow-sm border border-gray-100 text-center">
           <h1 className="font-display text-4xl mb-2">Book Appointment</h1>
           <p className="text-gray-500 font-serif italic mb-8">Secure your session with Structura.</p>

           <div className="space-y-6 mb-10 text-left bg-gray-50 p-6 rounded-sm border border-gray-100">
               {stylist && (
                   <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-charcoal text-white flex items-center justify-center">
                           <User className="w-5 h-5" />
                       </div>
                       <div>
                           <span className="block text-xs uppercase tracking-widest text-gray-400">Stylist</span>
                           <span className="font-display text-xl">{stylist.name}</span>
                       </div>
                   </div>
               )}
               
               {serviceId && (
                   <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
                       <div className="w-10 h-10 rounded-full bg-gold/10 text-gold-dark flex items-center justify-center">
                           <Scissors className="w-5 h-5" />
                       </div>
                       <div>
                           <span className="block text-xs uppercase tracking-widest text-gray-400">Service</span>
                           <span className="font-display text-xl">{service?.name || 'Selected Service'}</span>
                       </div>
                   </div>
               )}

               <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
                   <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                       <Calendar className="w-5 h-5" />
                   </div>
                   <div>
                       <span className="block text-xs uppercase tracking-widest text-gray-400">Availability</span>
                       <span className="font-serif italic text-gray-600">Check live availability on next step</span>
                   </div>
               </div>
           </div>

           <Button onClick={handleContinue} className="w-full h-14 text-lg bg-charcoal text-white hover:bg-gold hover:text-white transition-all">
               Continue to Booking <ArrowRight className="ml-2 w-5 h-5" />
           </Button>
           
           <button onClick={() => navigate(-1)} className="mt-6 text-sm text-gray-400 hover:text-charcoal underline underline-offset-4">
               Go Back
           </button>
       </div>
    </div>
  );
}
