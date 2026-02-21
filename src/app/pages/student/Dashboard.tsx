import React, { useEffect, useState } from 'react';
import { db, AcademyEnrollment, CourseSession, Course, SessionResource } from '../../../lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, PlayCircle, FileText, CheckCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    enrolled: 0,
    inProgress: 0,
    certificates: 0,
    resources: 0
  });
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [recentResources, setRecentResources] = useState<SessionResource[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      // Mock User ID (In real app, get from auth)
      const studentEmail = "student@structura.academy"; 

      // 1. Fetch All Data
      const [enrollments, courses, sessions, allResources] = await Promise.all([
        db.getStudentEnrollments(studentEmail),
        db.getCourses(),
        db.getSessions(),
        db.getSessionResources('all') // Need to fetch all or filter properly
      ]);

      // 2. Process Stats
      const activeEnrollments = enrollments.filter(e => e.status === 'confirmed' || e.status === 'pending');
      const completedEnrollments = enrollments.filter(e => e.status === 'completed' && e.certificateIssued);
      
      // Calculate "In Progress" (Has a session scheduled in future or is live)
      let inProgressCount = 0;
      const enrichedEnrollments = enrollments.map(e => {
        const course = courses.find(c => c.id === e.courseId);
        const session = sessions.find(s => s.id === e.sessionId);
        
        // Check if in progress
        const isFuture = session && new Date(session.endDate) > new Date();
        if (isFuture) inProgressCount++;

        return { ...e, course, session };
      });

      // 3. Get Recent Resources (Mock logic: finding resources for enrolled sessions)
      // In a real app, we'd query by session IDs.
      // Here we need to iterate enrolled sessions and find resources.
      let myResources: SessionResource[] = [];
      for (const e of enrichedEnrollments) {
          if (e.sessionId) {
              const res = await db.getSessionResources(e.sessionId);
              myResources = [...myResources, ...res];
          }
      }

      setStats({
        enrolled: activeEnrollments.length,
        inProgress: inProgressCount,
        certificates: completedEnrollments.length,
        resources: myResources.length
      });

      setRecentEnrollments(enrichedEnrollments.slice(0, 5));
      setRecentResources(myResources.slice(0, 5));
      
      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-400 font-serif animate-pulse">Loading Dashboard...</div>;

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
           <h1 className="text-4xl font-display text-charcoal mb-2">Welcome back, Student</h1>
           <p className="text-gray-500 font-serif">Track your progress and upcoming sessions.</p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs uppercase tracking-widest text-gold mb-1">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Enrolled Courses', value: stats.enrolled, icon:  Calendar},
          { label: 'In Progress', value: stats.inProgress, icon: Clock },
          { label: 'Certificates', value: stats.certificates, icon: Award },
          { label: 'Resources', value: stats.resources, icon: FileText },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-display text-charcoal">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F7F5F2] flex items-center justify-center text-gold">
                <stat.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Column: Current Progress */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
             <h2 className="text-2xl font-display">Current Progress</h2>
             <Link to="/student/courses" className="text-sm text-gold hover:text-charcoal transition-colors uppercase tracking-widest text-xs flex items-center gap-1">
               View All <ArrowRight className="w-3 h-3" />
             </Link>
           </div>

           <div className="space-y-4">
             {recentEnrollments.length > 0 ? (
               recentEnrollments.map((item) => (
                 <div key={item.id} className="group bg-white border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gold/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          {item.session?.status === 'live' && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-red-100 text-red-600 animate-pulse">
                              • Live Now
                            </span>
                          )}
                       </div>
                       <h3 className="text-xl font-display mb-1 group-hover:text-gold transition-colors">{item.course?.title}</h3>
                       <p className="text-sm text-gray-500 flex items-center gap-4">
                          {item.session ? (
                            <span>{format(new Date(item.session.startDate), 'MMM d, yyyy')} • {format(new Date(item.session.startDate), 'h:mm a')}</span>
                          ) : (
                            <span>Online • Self-paced</span>
                          )}
                       </p>
                    </div>

                    <div className="flex-shrink-0">
                       <Link to={`/student/courses/${item.id}`}>
                         <Button variant="outline" className="border-gray-200 hover:border-charcoal hover:bg-charcoal hover:text-white transition-colors">
                           {item.status === 'completed' ? 'View Details' : 'Continue'}
                         </Button>
                       </Link>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center p-12 border border-dashed border-gray-200 bg-gray-50/50">
                 <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
                 <Link to="/academy">
                   <Button className="bg-charcoal text-white">Browse Courses</Button>
                 </Link>
               </div>
             )}
           </div>
        </div>

        {/* Sidebar: Resources & Requirements */}
        <div className="space-y-12">
           
           {/* Recent Resources */}
           <div className="bg-white p-8 border border-gray-100">
              <h3 className="text-lg font-display mb-6 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" /> Recent Resources
              </h3>
              <div className="space-y-4">
                {recentResources.length > 0 ? (
                  recentResources.map((res) => (
                    <a 
                      key={res.id} 
                      href={res.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block p-3 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <p className="font-medium text-sm group-hover:text-gold transition-colors truncate">{res.title}</p>
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{res.resourceType}</p>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No resources available yet.</p>
                )}
              </div>
           </div>

           {/* Requirements Reminder (Mock) */}
           <div className="bg-[#F7F5F2] p-8 border border-gold/20 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-display mb-4">Course Requirements</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Make sure you have all the necessary tools and kits before your next session starts.
                </p>
                <Button variant="outline" className="w-full bg-white hover:bg-gold hover:text-white border-none">
                  Check List
                </Button>
              </div>
              {/* Decor */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border-[12px] border-white/50" />
           </div>

        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'bg-blue-50 text-blue-600';
    case 'completed': return 'bg-green-50 text-green-600';
    case 'pending': return 'bg-yellow-50 text-yellow-600';
    default: return 'bg-gray-100 text-gray-500';
  }
}

// Icon component helper
function Award({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}
