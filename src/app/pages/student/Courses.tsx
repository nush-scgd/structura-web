import React, { useState, useEffect } from 'react';
import { db, AcademyEnrollment, Course, CourseSession } from '../../../lib/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Calendar, Clock, MapPin, Play, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router';

export default function StudentCourses() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    async function loadCourses() {
      // Mock User
      const studentEmail = "student@structura.academy";
      
      const [allEnrollments, allCourses, allSessions] = await Promise.all([
        db.getStudentEnrollments(studentEmail),
        db.getCourses(),
        db.getSessions()
      ]);

      const enriched = allEnrollments.map(e => {
        const course = allCourses.find(c => c.id === e.courseId);
        const session = allSessions.find(s => s.id === e.sessionId);
        
        // Determine status
        let computedStatus = e.status;
        if (session) {
           const now = new Date();
           const start = new Date(session.startDate);
           const end = new Date(session.endDate);
           if (now >= start && now <= end) computedStatus = 'live';
           else if (now > end && e.status !== 'completed') computedStatus = 'past';
        }

        return { ...e, course, session, computedStatus };
      });

      setEnrollments(enriched);
      setLoading(false);
    }
    loadCourses();
  }, []);

  const filteredEnrollments = enrollments.filter(e => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return e.status === 'completed' || e.status === 'passed';
    if (activeTab === 'live') return e.computedStatus === 'live' || (e.session && new Date(e.session.startDate).getDate() === new Date().getDate());
    if (activeTab === 'upcoming') return e.status === 'confirmed' && e.computedStatus !== 'live' && e.computedStatus !== 'past';
    return true;
  });

  if (loading) return <div className="p-12 text-center text-gray-400 font-serif animate-pulse">Loading Courses...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display text-charcoal">My Courses</h1>
        <Link to="/academy">
          <Button variant="outline">Browse All Courses</Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none h-auto p-0 space-x-8 mb-8">
          {['upcoming', 'live', 'completed', 'all'].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab}
              className="bg-transparent border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:text-charcoal text-gray-400 rounded-none px-0 py-4 font-serif uppercase tracking-widest text-xs hover:text-gray-600 transition-colors"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid gap-6">
          {filteredEnrollments.length > 0 ? (
            filteredEnrollments.map((enrollment) => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))
          ) : (
             <div className="text-center py-20 bg-gray-50/50 border border-dashed border-gray-200">
               <p className="text-gray-400 font-serif text-lg">No courses found in this tab.</p>
             </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function CourseCard({ enrollment }: { enrollment: any }) {
  const { course, session } = enrollment;
  if (!course) return null;

  return (
    <Card className="hover:shadow-md transition-shadow duration-300 border-gray-100 overflow-hidden group">
       <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="w-full md:w-64 aspect-video md:aspect-auto bg-gray-200 relative overflow-hidden">
             {course.thumbnail ? (
               <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
             ) : (
               <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">No Image</div>
             )}
             {/* Status Badge */}
             <div className="absolute top-2 left-2">
                {enrollment.computedStatus === 'live' && (
                  <span className="bg-red-600 text-white text-[10px] uppercase tracking-wider px-2 py-1 font-bold animate-pulse">Live Now</span>
                )}
                {enrollment.status === 'completed' && (
                  <span className="bg-green-600 text-white text-[10px] uppercase tracking-wider px-2 py-1 font-bold">Completed</span>
                )}
             </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col justify-between">
             <div>
               <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-display text-charcoal group-hover:text-gold transition-colors">{course.title}</h3>
                 <span className="text-xs text-gray-400 uppercase tracking-wider">{course.type}</span>
               </div>
               
               {session ? (
                 <div className="space-y-2 mb-4">
                   <div className="flex items-center text-sm text-gray-500 gap-2">
                      <Calendar className="w-4 h-4 text-gold" />
                      <span>{format(new Date(session.startDate), 'MMMM d, yyyy')}</span>
                   </div>
                   <div className="flex items-center text-sm text-gray-500 gap-2">
                      <Clock className="w-4 h-4 text-gold" />
                      <span>{format(new Date(session.startDate), 'h:mm a')} - {format(new Date(session.endDate), 'h:mm a')}</span>
                   </div>
                   {session.location && (
                     <div className="flex items-center text-sm text-gray-500 gap-2">
                        <MapPin className="w-4 h-4 text-gold" />
                        <span>{session.location}</span>
                     </div>
                   )}
                 </div>
               ) : (
                 <p className="text-sm text-gray-500 mb-4">Self-paced online course</p>
               )}
             </div>

             <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                   {enrollment.certificateIssued && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Certificate Earned</span>}
                </div>
                
                <Link to={`/student/courses/${enrollment.id}`}>
                  <Button className="bg-charcoal text-white hover:bg-black uppercase tracking-widest text-xs">
                    {enrollment.status === 'completed' ? 'Review Course' : enrollment.computedStatus === 'live' ? 'Join Session' : 'View Details'}
                  </Button>
                </Link>
             </div>
          </div>
       </div>
    </Card>
  );
}
