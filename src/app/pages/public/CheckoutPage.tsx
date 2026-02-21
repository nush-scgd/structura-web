import React, { useEffect, useState } from 'react';
import { useCartStore } from '../../../lib/store';
import { db, TenantSettings, AcademyEnrollment, Course } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { items, total, clearCart, currency: cartCurrency } = useCartStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollmentId');

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  
  // Enrollment State
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    async function loadData() {
      const settings = await db.getTenantSettings();
      setTenantSettings(settings);

      if (enrollmentId) {
        // Load Enrollment Logic
        const enrollments = await db.getAcademyEnrollments(); // Fetch all then filter because getById isn't exposed yet or I can match prefix
        const found = enrollments.find(e => e.id === enrollmentId);
        
        if (found) {
          setEnrollment(found);
          const c = await db.getCourse(found.courseId);
          setCourse(c);
        } else {
          toast.error("Enrollment not found");
          navigate('/academy');
        }
      } else {
        // Cart Logic
        if (items.length === 0) {
          navigate('/shop');
        }
      }
      setInitLoading(false);
    }
    loadData();
  }, [enrollmentId, items, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'guest';

      if (enrollmentId && enrollment) {
        // Process Enrollment Payment
        const updatedEnrollment: AcademyEnrollment = {
          ...enrollment,
          paymentStatus: 'paid',
          amountPaid: course?.price || 0,
          status: 'confirmed'
        };
        await db.saveAcademyEnrollment(updatedEnrollment);
        
        toast.success('Enrollment successful! Welcome to the Academy.');
        navigate('/student/dashboard');
      } else {
        // Process Shop Order
        await db.createOrder({
          userId,
          items,
          total: total(),
          currency: cartCurrency || 'USD',
          status: 'pending'
        });

        clearCart();
        toast.success('Order placed successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <div className="h-screen flex items-center justify-center font-serif text-gray-400">Loading checkout...</div>;

  const currency = enrollmentId ? (course?.currency || 'USD') : (cartCurrency || 'USD');
  const amount = enrollmentId ? (course?.price || 0) : total();
  
  const paymentProvider = currency && tenantSettings?.paymentProviders[currency] 
    ? tenantSettings.paymentProviders[currency] 
    : 'Credit Card';

  return (
    <div className="container-luxury py-20 min-h-screen">
      <h1 className="text-4xl font-display mb-12">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Form */}
        <div>
          <h2 className="text-xl font-display mb-6 border-b border-gray-200 pb-2">Billing Details</h2>
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">First Name</label>
                <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Last Name</label>
                <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <input type="email" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required defaultValue={enrollment?.studentEmail} />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Address</label>
              <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">City</label>
                <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Postal Code</label>
                <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" required />
              </div>
            </div>

            <h2 className="text-xl font-display mt-12 mb-6 border-b border-gray-200 pb-2">Payment</h2>
            
            <div className="bg-gray-50 p-6 rounded text-sm text-gray-600 mb-6 border border-gray-100">
               <p className="font-medium text-charcoal mb-2">Secure Payment via {paymentProvider}</p>
               <p className="text-xs text-gray-500">
                 Encrypted transaction. Your card details are never stored on our servers.
               </p>
            </div>

             <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Card Number</label>
              <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" placeholder="0000 0000 0000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Expiry</label>
                  <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" placeholder="MM/YY" />
               </div>
               <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">CVC</label>
                  <input type="text" className="luxury-input w-full p-3 bg-gray-50 border border-gray-200 focus:border-gold outline-none rounded-none transition-colors" placeholder="123" />
               </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div>
           <div className="bg-gray-50 p-8 border border-gray-100 sticky top-32">
              <h2 className="text-xl font-display mb-6 border-b border-gray-200 pb-2">Order Summary</h2>
              
              <div className="space-y-4 mb-8">
                {enrollmentId && course ? (
                  <div className="flex justify-between text-sm items-start">
                    <div>
                      <span className="font-medium text-lg block mb-1">{course.title}</span>
                      <span className="text-gray-500 text-xs uppercase tracking-widest">Academy Enrollment</span>
                    </div>
                    <span className="font-medium text-lg">{formatCurrency(course.price, course.currency)}</span>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.title} x {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity, currency)}</span>
                    </div>
                  ))
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-6 flex justify-between font-display text-2xl">
                <span>Total</span>
                <span>{formatCurrency(amount, currency)}</span>
              </div>
              
              <div className="mt-8">
                <Button 
                  type="submit" 
                  form="checkout-form" 
                  className="w-full bg-charcoal hover:bg-gold text-white h-14 text-lg" 
                  isLoading={loading}
                >
                  {enrollmentId ? 'Complete Enrollment' : 'Place Order'}
                </Button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  By completing this purchase you agree to our Terms of Service.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
