import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { BookOpen, Award, LayoutDashboard, LogOut, ShoppingBag, Package, User, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { db } from '../../lib/db';
import { toast } from 'sonner';

export function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login?redirect=/student/dashboard');
        return;
      }

      // Check for paid enrollments
      try {
        const enrollments = await db.getStudentEnrollments(session.user.email!);
        const hasPaidEnrollment = enrollments.some(e => e.paymentStatus === 'paid');
        
        if (!hasPaidEnrollment) {
           toast.error("Access Restricted: Active enrollment required.");
           navigate('/academy');
           return;
        }
        
        setAuthorized(true);
      } catch (e) {
        console.error("Access check failed", e);
        navigate('/academy');
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/student/courses' },
    { icon: Award, label: 'Certificates', path: '/student/certificates' },
    { icon: ShoppingBag, label: 'Shop', path: '/student/shop' },
    { icon: Package, label: 'Orders', path: '/student/orders' },
    { icon: User, label: 'Profile', path: '/student/profile' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center font-serif text-charcoal">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <p className="text-sm uppercase tracking-widest">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex font-serif text-charcoal">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 h-screen w-64 border-r border-gray-200 bg-white z-50 transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col shadow-sm",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <Link to="/" className="text-xl font-display tracking-widest uppercase font-semibold text-charcoal">
            Structura<br/>Academy
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
            <LogOut className="w-5 h-5 rotate-180" />
          </button>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium transition-all group relative",
                  isActive 
                    ? "text-charcoal bg-[#F7F5F2]" 
                    : "text-gray-500 hover:text-charcoal hover:bg-gray-50"
                )}
              >
                {isActive && (
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />
                )}
                <Icon className={cn("w-4 h-4 mr-3 transition-colors", isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600")} />
                <span className="tracking-wide uppercase text-xs">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-charcoal text-white flex items-center justify-center font-display text-sm">
              S
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-medium truncate">Student Portal</p>
               <p className="text-xs text-gray-500 truncate">Logged in</p>
            </div>
          </div>
          
          <div className="mb-4">
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-xs uppercase tracking-widest font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
         {/* Mobile Header */}
         <div className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between sticky top-0 z-30">
            <span className="font-display tracking-widest uppercase">Structura</span>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2">
              <LayoutDashboard className="w-6 h-6" />
            </button>
         </div>

         <div className="flex-1 overflow-auto p-6 md:p-12">
            <Outlet />
         </div>
      </main>
    </div>
  );
}
