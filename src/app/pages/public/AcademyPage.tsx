import React from 'react';
import { db, Course } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { Link, useNavigate } from 'react-router';
import { Check, Search, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { Input } from '../../components/ui/input';

export default function AcademyPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = React.useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function loadCourses() {
      try {
        const allCourses = await db.getCourses();
        // Filter only published/active courses
        const published = allCourses.filter(c => c.status === 'active');
        setCourses(published);
        setFilteredCourses(published);
      } catch (e) {
        console.error("Failed to load courses", e);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  React.useEffect(() => {
    if (!searchQuery) {
      setFilteredCourses(courses);
      return;
    }
    const lowerQ = searchQuery.toLowerCase();
    const filtered = courses.filter(c => 
      c.title.toLowerCase().includes(lowerQ) || 
      (c.tagline && c.tagline.toLowerCase().includes(lowerQ)) ||
      (c.summary && c.summary.toLowerCase().includes(lowerQ))
    );
    setFilteredCourses(filtered);
  }, [searchQuery, courses]);

  return (
    <div className="w-full bg-ivory min-h-screen">
      {/* Hero */}
      <section className="relative h-[50vh] bg-charcoal text-ivory flex items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2000&q=80" 
            className="w-full h-full object-cover" 
            alt="Academy Background"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/30 to-charcoal/90" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <span className="text-gold uppercase tracking-[0.2em] text-sm font-semibold block animate-fade-in-up">Structura Academy</span>
          <h1 className="text-5xl md:text-7xl font-display leading-tight animate-fade-in-up delay-100">
            Elevate Your Craft
          </h1>
          <p className="text-xl font-serif text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Comprehensive education for the modern stylist. Bridging technical precision with artistic freedom.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mt-10 relative animate-fade-in-up delay-300">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gold transition-colors" />
              <Input 
                type="text" 
                placeholder="Search for courses..." 
                className="pl-12 pr-4 py-6 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-gold rounded-none text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Course List */}
      <section className="py-24 container-luxury">
        <div className="flex justify-between items-end mb-12">
           <h2 className="text-4xl font-display text-charcoal">Available Courses</h2>
           <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
              <span>Showing {filteredCourses.length} results</span>
           </div>
        </div>

        {loading ? (
           <div className="text-center py-20 text-gray-400 font-serif italic">Loading courses...</div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16">
            {filteredCourses.map(course => (
              <Link to={`/academy/course/${course.id}`} key={course.id} className="group block">
                <article className="h-full flex flex-col border border-transparent hover:border-gray-200 transition-all duration-500 p-6 -mx-6 rounded-sm hover:bg-white hover:shadow-sm">
                  <div className="aspect-[16/9] bg-gray-100 mb-8 overflow-hidden relative">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-charcoal px-3 py-1 text-xs uppercase tracking-widest font-medium">
                      {course.type}
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-3xl font-display text-charcoal group-hover:text-gold-dark transition-colors duration-300">
                         {course.title}
                       </h3>
                       <span className="text-xl font-display text-gold whitespace-nowrap ml-4">
                         {formatCurrency(course.price)}
                       </span>
                    </div>
                    
                    <p className="text-gray-500 font-serif mb-8 leading-relaxed line-clamp-3 flex-grow">
                      {course.tagline || course.summary || course.description}
                    </p>
                    
                    <div className="space-y-3 mb-8 border-t border-gray-100 pt-6">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Check className="w-4 h-4 text-gold" />
                        <span>Duration: {course.duration || 'Self-paced'}</span>
                      </div>
                      {course.isAccredited && (
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <Check className="w-4 h-4 text-gold" />
                          <span>Accredited Certification</span>
                        </div>
                      )}
                    </div>
  
                    <Button className="w-full mt-auto bg-charcoal text-white hover:bg-gold hover:text-white transition-colors">
                      Enroll Now
                    </Button>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border border-dashed border-gray-300 bg-gray-50/50">
            <p className="text-2xl font-display text-gray-400 mb-2">No courses found</p>
            <p className="text-gray-500 font-serif italic">
              {searchQuery ? `No results for "${searchQuery}"` : "No courses available yet."}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-gold hover:text-charcoal underline underline-offset-4 text-sm uppercase tracking-widest"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="bg-white py-24 border-t border-gray-100">
        <div className="container-luxury grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
           <div className="py-4 md:py-0">
             <h3 className="text-6xl font-display text-charcoal mb-2">11+</h3>
             <p className="text-gray-400 uppercase tracking-widest text-xs font-semibold">Years of Experience</p>
           </div>
           <div className="py-4 md:py-0">
             <h3 className="text-6xl font-display text-charcoal mb-2">1,000+</h3>
             <p className="text-gray-400 uppercase tracking-widest text-xs font-semibold">Satisfied Clients Served</p>
           </div>
           <div className="py-4 md:py-0">
             <h3 className="text-5xl md:text-6xl font-display text-charcoal mb-2">Founder-Led</h3>
             <p className="text-gray-400 uppercase tracking-widest text-xs font-semibold">Boutique Education Model</p>
           </div>
        </div>
      </section>
    </div>
  );
}
