import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { db, AcademyEnrollment, Course, CourseSession, SessionResource, CourseRequirement, Product, StudentRequirementStatus } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Check, Calendar, MapPin, Clock, Video, FileText, ShoppingBag, ExternalLink, PlayCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCartStore } from '../../../lib/store';

export default function StudentCourseDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [session, setSession] = useState<CourseSession | null>(null);
  const [resources, setResources] = useState<SessionResource[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [reqStatuses, setReqStatuses] = useState<StudentRequirementStatus[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      // 1. Get Enrollment
      const settings = await db.getPlatformSettings();
      const allEnrollments = await db.getAcademyEnrollments();
      const enroll = allEnrollments.find(e => e.id === id);
      
      if (!enroll) {
          setLoading(false);
          return;
      }
      setEnrollment(enroll);

      // Check Access
      const isPaid = enroll.paymentStatus === 'paid' || enroll.paymentStatus === 'confirmed' || enroll.paymentStatus === 'not_required';
      const allowPending = settings.courseAccessWithoutPayment;
      
      if (!isPaid && !allowPending && enroll.paymentStatus !== 'not_required') {
          setAccessDenied(true);
      }
      
      // 2. Get Course & Session
      const [c, s] = await Promise.all([
          db.getCourse(enroll.courseId),
          enroll.sessionId ? db.getSessions(enroll.courseId).then(sess => sess.find(x => x.id === enroll.sessionId)) : null
      ]);
      setCourse(c);
      setSession(s || null);

      // 3. Get Resources (if session exists)
      if (enroll.sessionId) {
          const res = await db.getSessionResources(enroll.sessionId);
          setResources(res.filter(r => r.isPublished));
      }

      // 4. Get Requirements & Products
      const reqs = await db.getCourseRequirements(enroll.courseId);
      const productIds = reqs.map(r => r.productId);
      
      // Fetch all products to resolve details
      const allProducts = await db.getProducts();
      
      const resolvedReqs = reqs.map(r => ({
          ...r,
          product: allProducts.find(p => p.id === r.productId)
      }));
      setRequirements(resolvedReqs);

      // 5. Get Requirement Statuses
      const statuses = await db.getStudentRequirementStatuses(enroll.id);
      setReqStatuses(statuses);

      // 6. Get Featured Products (Mock logic: just random products for now or specific tag if we had it)
      // For MVP, let's just show some products as featured if the course has a "Kit" in requirements
      const featured = allProducts.slice(0, 3); 
      setFeaturedProducts(featured);

      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-serif text-gray-400 animate-pulse">Loading Course Details...</div>;
  if (!enrollment || !course) return <div className="p-20 text-center text-red-500">Course enrollment not found.</div>;

  const isLive = session && new Date() >= new Date(session.startDate) && new Date() <= new Date(session.endDate);
  const isPast = session && new Date() > new Date(session.endDate);

  const handleRequirementStatus = async (reqId: string, status: 'already_have' | 'buy_now') => {
      // Optimistic Update
      const existing = reqStatuses.find(s => s.requirementId === reqId);
      const newStatusObj: StudentRequirementStatus = {
          id: existing?.id || `status_${Date.now()}`,
          enrollmentId: enrollment.id,
          requirementId: reqId,
          status: status,
          updatedAt: new Date().toISOString()
      };

      await db.saveStudentRequirementStatus(newStatusObj);
      
      // Update local state
      const newStatuses = reqStatuses.filter(s => s.requirementId !== reqId);
      setReqStatuses([...newStatuses, newStatusObj]);

      if (status === 'already_have') {
          toast.success("Marked as 'Already have'");
      }
  };

  const handleAddToCart = (product: Product) => {
      addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          description: product.shortDescription || product.description,
          image: product.image,
          category: 'Product',
          stock: product.stock,
          currency: product.currency
      });
      toast.success("Added to cart");
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
       {/* Hero / Header */}
       <div className="mb-12 border-b border-gray-100 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                  <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs uppercase tracking-widest text-gold font-medium">{course.type} Course</span>
                      {enrollment.status === 'completed' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Completed</span>}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-display text-charcoal mb-4">{course.title}</h1>
                  <p className="text-xl font-serif text-gray-500 italic max-w-2xl">{course.tagline || course.summary}</p>
              </div>
              
              {/* Session Quick Info */}
              {session && (
                  <div className="text-right bg-white p-6 border border-gray-100 shadow-sm min-w-[300px]">
                      <div className="text-sm font-medium uppercase tracking-widest text-gray-400 mb-2">Next Session</div>
                      <div className="font-display text-2xl mb-1">{format(new Date(session.startDate), 'MMM d, h:mm a')}</div>
                      <div className="text-sm text-gray-500 mb-4">{session.location}</div>
                      
                      {isLive ? (
                         <Button className="w-full bg-red-600 hover:bg-red-700 text-white animate-pulse">
                             <Video className="w-4 h-4 mr-2" /> Join Live Stream
                         </Button>
                      ) : (
                         <Button variant="outline" className="w-full" disabled>
                             {isPast ? 'Session Completed' : 'Starts Soon'}
                         </Button>
                      )}
                  </div>
              )}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
             
             {/* Live / Recording Area */}
             <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                 {isLive && session?.liveStreamUrl ? (
                     <iframe src={session.liveStreamUrl} className="w-full h-full" allowFullScreen />
                 ) : session?.recordingPublished && session.recordingUrl ? (
                     <div className="w-full h-full relative">
                         <img src={course.thumbnail} className="w-full h-full object-cover opacity-50" />
                         <div className="absolute inset-0 flex items-center justify-center">
                             <Button className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border-white/50 rounded-full w-20 h-20 p-0">
                                 <PlayCircle className="w-10 h-10" />
                             </Button>
                         </div>
                         <div className="absolute bottom-4 left-4 text-white">
                             <p className="font-medium">Watch Recording</p>
                             <p className="text-xs opacity-70">Published {format(new Date(), 'MMM d')}</p>
                         </div>
                     </div>
                 ) : (
                     <div className="w-full h-full bg-charcoal flex flex-col items-center justify-center text-gray-500">
                         <Video className="w-12 h-12 mb-4 opacity-20" />
                         <p className="font-serif italic">No video content currently available.</p>
                         <p className="text-sm mt-2 opacity-50">Live stream starts {session ? format(new Date(session.startDate), 'h:mm a') : 'soon'}</p>
                     </div>
                 )}
             </div>

             {/* Tabs: Resources, Requirements, etc */}
             <Tabs defaultValue="resources">
                 <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent p-0 mb-8 space-x-8">
                     <TabsTrigger value="resources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-charcoal px-0 py-3 uppercase tracking-widest text-xs">Resources</TabsTrigger>
                     <TabsTrigger value="requirements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-charcoal px-0 py-3 uppercase tracking-widest text-xs">Requirements & Kit</TabsTrigger>
                     <TabsTrigger value="shop" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-charcoal px-0 py-3 uppercase tracking-widest text-xs">Shop Products</TabsTrigger>
                 </TabsList>

                 <TabsContent value="resources" className="space-y-4">
                     {resources.length > 0 ? (
                         resources.map(res => (
                             <div key={res.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-gold/30 transition-colors group">
                                 <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-colors">
                                         {res.resourceType === 'file' ? <FileText className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                                     </div>
                                     <div>
                                         <h4 className="font-medium text-charcoal">{res.title}</h4>
                                         <p className="text-xs text-gray-400 uppercase tracking-wider">{res.resourceType}</p>
                                     </div>
                                 </div>
                                 <Button variant="ghost" size="sm" asChild>
                                     <a href={res.url} target="_blank" rel="noreferrer">Open</a>
                                 </Button>
                             </div>
                         ))
                     ) : (
                         <div className="p-8 text-center border border-dashed border-gray-200 text-gray-400 font-serif italic">
                             No resources uploaded for this session yet.
                         </div>
                     )}
                 </TabsContent>

                 <TabsContent value="requirements" className="space-y-6">
                     <div className="bg-yellow-50 border border-yellow-100 p-4 flex items-start gap-3 rounded-sm">
                         <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                         <div>
                             <h4 className="text-sm font-medium text-yellow-800">Class Requirements</h4>
                             <p className="text-xs text-yellow-700 mt-1">Please ensure you have all required items before the session begins.</p>
                         </div>
                     </div>

                     <div className="space-y-4">
                         {requirements.map(req => {
                             const status = reqStatuses.find(s => s.requirementId === req.id)?.status;
                             const hasIt = status === 'already_have';
                             
                             return (
                                 <div key={req.id} className={`p-4 border ${hasIt ? 'border-green-100 bg-green-50/30' : 'border-gray-200 bg-white'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all`}>
                                     <div className="flex items-center gap-4">
                                         {req.product?.image ? (
                                             <img src={req.product.image} className="w-12 h-12 object-cover rounded bg-gray-100" />
                                         ) : (
                                             <div className="w-12 h-12 bg-gray-100 rounded" />
                                         )}
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <h4 className={`font-medium ${hasIt ? 'text-green-800 line-through opacity-70' : 'text-charcoal'}`}>{req.product?.title || 'Unknown Item'}</h4>
                                                 {req.requirementType === 'required' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold">Required</span>}
                                             </div>
                                             <p className="text-sm text-gray-500">{req.note || req.product?.shortDescription}</p>
                                         </div>
                                     </div>

                                     <div className="flex items-center gap-2">
                                         {hasIt ? (
                                             <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                                 <Check className="w-4 h-4" /> Ready
                                             </span>
                                         ) : (
                                             <>
                                                 <Button variant="outline" size="sm" onClick={() => handleRequirementStatus(req.id, 'already_have')}>
                                                     I have this
                                                 </Button>
                                                 {req.product && (
                                                     <Button size="sm" className="bg-charcoal text-white" onClick={() => {
                                                         handleAddToCart(req.product);
                                                         handleRequirementStatus(req.id, 'buy_now');
                                                     }}>
                                                         Buy Now
                                                     </Button>
                                                 )}
                                             </>
                                         )}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </TabsContent>

                 <TabsContent value="shop">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {featuredProducts.map(product => (
                             <div key={product.id} className="group bg-white border border-gray-100 hover:border-gold/50 transition-colors">
                                 <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                     <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     <button 
                                        onClick={() => handleAddToCart(product)}
                                        className="absolute bottom-4 right-4 bg-white text-charcoal p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gold hover:text-white"
                                     >
                                         <ShoppingBag className="w-4 h-4" />
                                     </button>
                                 </div>
                                 <div className="p-4">
                                     <h4 className="font-display text-lg mb-1">{product.title}</h4>
                                     <p className="text-gold font-medium">{product.currency} {product.price.toLocaleString()}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </TabsContent>
             </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
             <div className="bg-charcoal text-ivory p-8">
                 <h3 className="text-xl font-display mb-6 text-gold">Course Info</h3>
                 <div className="space-y-4 text-sm font-light">
                     <div>
                         <span className="block text-gray-500 uppercase tracking-widest text-xs mb-1">Duration</span>
                         <p>{course.duration || 'Flexible'}</p>
                     </div>
                     <div>
                         <span className="block text-gray-500 uppercase tracking-widest text-xs mb-1">Certification</span>
                         <p>{course.certificationType}</p>
                     </div>
                     <div>
                         <span className="block text-gray-500 uppercase tracking-widest text-xs mb-1">Instructor</span>
                         <p>{course.instructorId ? 'Verified Instructor' : 'Structura Academy'}</p>
                     </div>
                 </div>
             </div>

             <div className="border border-gray-200 p-8">
                 <h3 className="text-lg font-display mb-4">Need Help?</h3>
                 <p className="text-sm text-gray-500 mb-4">Contact our student support team for assistance with your course or kit requirements.</p>
                 <Button variant="outline" className="w-full">Contact Support</Button>
             </div>
          </div>
       </div>
    </div>
  );
}
