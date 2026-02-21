import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { db, Course, CourseSession, Instructor } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Check, MapPin, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
        setUserEmail(session?.user?.email || null);

        const courseData = await db.getCourse(id);
        if (courseData) {
          setCourse(courseData);
          
          if (courseData.instructorId) {
            const instructorData = await db.getInstructor(courseData.instructorId);
            setInstructor(instructorData);
          }

          if (courseData.type !== 'online') {
            const sessionsData = await db.getSessions(id);
            const futureSessions = sessionsData
              .filter(s => new Date(s.startDate) > new Date())
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            setSessions(futureSessions);
          }
        }
      } catch (error) {
        console.error("Failed to fetch course data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleEnroll = async () => {
    if (!course) return;

    if (course.type !== 'online' && !selectedSessionId) {
      toast.error("Please select a session date to enroll.");
      document.getElementById('sessions-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!isLoggedIn) {
      // Not logged in -> Redirect to Enroll Page
      const params = new URLSearchParams({ courseId: course.id });
      if (selectedSessionId) params.append('sessionId', selectedSessionId);
      navigate(`/academy/enroll?${params.toString()}`);
      return;
    }

    // Logged in -> Check Enrollment
    try {
      const enrollments = await db.getStudentEnrollments(userEmail!);
      const existing = enrollments.find(e => e.courseId === course.id && (course.type === 'online' || e.sessionId === selectedSessionId));

      if (existing) {
        if (existing.paymentStatus === 'paid') {
          toast.success("You are already enrolled in this course.");
          navigate('/student/dashboard');
        } else {
          // Exists but unpaid -> Go to checkout
          navigate(`/checkout?enrollmentId=${existing.id}`);
        }
      } else {
        // Logged in but no enrollment record yet -> Go to Enroll page to create it (skips auth step)
        const params = new URLSearchParams({ courseId: course.id });
        if (selectedSessionId) params.append('sessionId', selectedSessionId);
        navigate(`/academy/enroll?${params.toString()}`);
      }
    } catch (e) {
      console.error("Enrollment check failed", e);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const toggleModule = (moduleId: string) => {
    setActiveModule(activeModule === moduleId ? null : moduleId);
  };

  if (loading) return <div className="min-h-screen bg-ivory flex items-center justify-center font-serif text-xl">Loading...</div>;
  if (!course) return <div className="min-h-screen bg-ivory flex items-center justify-center font-serif text-xl">Course not found.</div>;

  return (
    <div className="bg-ivory text-charcoal min-h-screen font-serif selection:bg-gold selection:text-white">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-4 text-sm tracking-widest uppercase font-medium">
              <span className="text-gold">{course.type} Course</span>
              {course.isAccredited && (
                 <span className="flex items-center gap-1 bg-charcoal text-white px-3 py-1 text-xs">
                   <Award className="w-3 h-3 text-gold" /> Accredited
                 </span>
              )}
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-medium">
              {course.title}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-xl">
              {course.tagline || course.summary}
            </p>

            <div className="flex flex-col gap-2 pt-4">
              <div className="text-3xl font-medium">
                {course.currency} {course.price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">
                Certification: {course.certificationType}
              </div>
            </div>

            <div className="pt-6">
              <Button 
                onClick={() => document.getElementById('sessions-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-charcoal text-white hover:bg-black text-lg px-8 py-6 h-auto rounded-none uppercase tracking-widest"
              >
                View Sessions & Enroll
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] md:aspect-square relative z-10">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 ease-in-out"
              />
            </div>
            {/* Decorative minimalist border */}
            <div className="absolute top-8 left-8 w-full h-full border border-gold/30 -z-0 hidden md:block" />
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 py-20 px-6">
        
        {/* Left Column (Details) */}
        <div className="lg:col-span-8 space-y-20">
          
          {/* Summary & Who it's for */}
          <section className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div>
                  <h3 className="text-2xl font-medium mb-6 italic">Course Summary</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
               </div>
               <div>
                  <h3 className="text-2xl font-medium mb-6 italic">Who it's for</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {course.targetAudience || "Aspiring and experienced stylists looking to refine their craft."}
                  </p>
                  {course.prerequisites && (
                    <div className="mt-6 p-6 bg-white border border-gray-100">
                      <span className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Prerequisites</span>
                      <p className="text-gray-800">{course.prerequisites}</p>
                    </div>
                  )}
               </div>
             </div>
          </section>

          {/* Learning Outcomes */}
          <section>
            <h3 className="text-2xl font-medium mb-8 italic">What you will learn</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {course.learningOutcomes?.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-3 py-3 border-b border-gray-100">
                   <Check className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                   <span className="text-gray-700">{outcome}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum */}
          <section>
             <h3 className="text-2xl font-medium mb-8 italic">Curriculum Overview</h3>
             <div className="border-t border-gray-200">
               {course.curriculum?.map((module) => (
                 <div key={module.id} className="border-b border-gray-200">
                   <button 
                     onClick={() => toggleModule(module.id)}
                     className="w-full flex items-center justify-between py-6 text-left group hover:bg-gray-50/50 transition-colors px-2"
                   >
                     <span className="text-xl font-medium group-hover:text-gold transition-colors">{module.title}</span>
                     {activeModule === module.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                   </button>
                   {activeModule === module.id && (
                     <div className="pb-8 pl-2 space-y-3">
                       {module.lessons.map((lesson) => (
                         <div key={lesson.id} className="flex items-center text-gray-600 text-sm">
                            <span className="w-16 opacity-50 uppercase tracking-wider text-xs">{lesson.type}</span>
                            <span>{lesson.title}</span>
                            <span className="ml-auto opacity-50">{lesson.duration}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               ))}
               {(!course.curriculum || course.curriculum.length === 0) && (
                 <p className="text-gray-500 py-6">Curriculum details coming soon.</p>
               )}
             </div>
          </section>
        </div>

        {/* Right Column (Sticky Sidebar) */}
        <div className="lg:col-span-4 space-y-12">
           
           {/* Instructor Card */}
           {instructor && (
             <div className="bg-white p-8 border border-gray-100 sticky top-32">
               <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-6 text-center">Your Instructor</h4>
               <div className="text-center space-y-4">
                 <div className="w-32 h-32 mx-auto overflow-hidden rounded-full mb-4 bg-gray-100">
                   {instructor.image ? (
                     <img src={instructor.image} alt={instructor.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-200">{instructor.name[0]}</div>
                   )}
                 </div>
                 <h3 className="text-2xl font-medium">{instructor.name}</h3>
                 <p className="text-gold italic">{instructor.title}</p>
                 <p className="text-sm text-gray-500 leading-relaxed text-left pt-4 border-t border-gray-100 mt-4">
                   {instructor.bio || "A master of their craft with years of experience in editorial and salon styling."}
                 </p>
               </div>
             </div>
           )}

           {/* Location Info (if in-person) */}
           {course.type !== 'online' && (
             <div className="space-y-4">
               <h4 className="text-xl font-medium flex items-center gap-2">
                 <MapPin className="w-5 h-5 text-gold" /> Location
               </h4>
               <div className="bg-white p-6 border border-gray-100">
                 <p className="font-medium">{course.location || "Structura Academy"}</p>
                 <p className="text-gray-500 mt-1">{course.address || "123 Fashion Ave, New York, NY"}</p>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Session Selector & Enroll Section */}
      <section id="sessions-section" className="bg-white border-t border-gray-100 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-medium mb-12">Select Your Intake</h2>
          
          {sessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 mb-12">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => session.status !== 'full' && setSelectedSessionId(session.id)}
                  className={`
                    relative p-6 border transition-all cursor-pointer text-left flex flex-col md:flex-row md:items-center justify-between gap-4
                    ${selectedSessionId === session.id 
                      ? 'border-gold bg-gold/5 ring-1 ring-gold' 
                      : session.status === 'full' 
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-400'
                    }
                  `}
                >
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-lg">
                          {new Date(session.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {session.status === 'full' && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 uppercase tracking-wide">Sold Out</span>
                        )}
                      </div>
                      <p className="text-gray-500 flex items-center gap-4 text-sm">
                        <span><Clock className="w-3 h-3 inline mr-1" /> {new Date(session.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(session.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span>Capacity: {session.capacity - session.enrolledCount} spots left</span>
                      </p>
                   </div>
                   
                   <div className="flex-shrink-0">
                      {selectedSessionId === session.id && (
                        <div className="w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                   </div>
                </div>
              ))}
            </div>
          ) : course.type === 'online' ? (
             <div className="text-center p-8 mb-8">
               <p className="text-xl text-gray-600">This is a self-paced online course. You can start immediately after enrollment.</p>
             </div>
          ) : (
            <div className="text-center p-12 border border-dashed border-gray-300 mb-12">
              <p className="text-gray-500">No upcoming sessions scheduled. Please join the waitlist.</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
             <Button 
               onClick={handleEnroll}
               disabled={(course.type !== 'online' && !selectedSessionId)}
               className="bg-charcoal text-white hover:bg-black text-xl px-12 py-8 h-auto rounded-none uppercase tracking-widest min-w-[300px]"
             >
               Enroll • {course.currency} {course.price.toLocaleString()}
             </Button>
             <p className="text-sm text-gray-400 mt-4 max-w-md">
               Secure your spot with a secure payment. By enrolling, you agree to our academy terms and cancellation policy.
             </p>
          </div>
        </div>
      </section>
    </div>
  );
}
