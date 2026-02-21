import React, { useState, useEffect } from 'react';
import { db, Order, AcademyEnrollment } from '../../../lib/db';
import { DollarSign, Users, ShoppingBag, BookOpen, Calendar, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { useNavigate } from 'react-router';
import { format, subDays } from 'date-fns';
import { Button } from '../../components/ui/Button';

// Global Dashboard Filter State
interface DashboardFilter {
  startDate: Date;
  endDate: Date;
  compareStartDate: Date;
  compareEndDate: Date;
  branchId?: string;
}

interface KPI {
  value: number;
  change: number;
}

interface DashboardData {
  revenue: KPI;
  activeStudents: KPI;
  productOrders: KPI;
  courseEnrollments: KPI;
  recentOrders: Order[];
  recentEnrollments: (AcademyEnrollment & { courseTitle?: string })[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // 1. Global dashboard filter state
  const [filter, setFilter] = useState<DashboardFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    compareStartDate: subDays(new Date(), 60),
    compareEndDate: subDays(new Date(), 30),
    branchId: 'all'
  });

  const [data, setData] = useState<DashboardData>({
    revenue: { value: 0, change: 0 },
    activeStudents: { value: 0, change: 0 },
    productOrders: { value: 0, change: 0 },
    courseEnrollments: { value: 0, change: 0 },
    recentOrders: [],
    recentEnrollments: []
  });

  useEffect(() => {
    loadDashboardData();
  }, [filter]);

  async function loadDashboardData() {
    setLoading(true);
    // 2. Pull KPI values from Supabase (simulated via db abstraction layer)
    try {
      const summary = await db.getKPISummary(
        filter.startDate, 
        filter.endDate, 
        filter.compareStartDate, 
        filter.compareEndDate
      );
      
      // Since getKPISummary returns compatible structure
      setData(summary as unknown as DashboardData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const now = new Date();
    let newFilter = { ...filter };

    if (val === '30days') {
      newFilter.startDate = subDays(now, 30);
      newFilter.endDate = now;
      newFilter.compareStartDate = subDays(now, 60);
      newFilter.compareEndDate = subDays(now, 30);
    } else if (val === '7days') {
      newFilter.startDate = subDays(now, 7);
      newFilter.endDate = now;
      newFilter.compareStartDate = subDays(now, 14);
      newFilter.compareEndDate = subDays(now, 7);
    } else if (val === '90days') {
      newFilter.startDate = subDays(now, 90);
      newFilter.endDate = now;
      newFilter.compareStartDate = subDays(now, 180);
      newFilter.compareEndDate = subDays(now, 90);
    }
    
    setFilter(newFilter);
  };

  const kpiCards = [
    { 
      label: 'Total Revenue', 
      value: formatCurrency(data.revenue.value), 
      change: data.revenue.change, 
      icon: DollarSign,
      path: '/admin/reports?type=revenue'
    },
    { 
      label: 'Active Students', 
      value: data.activeStudents.value.toString(), 
      change: data.activeStudents.change, 
      icon: Users,
      path: '/admin/reports?type=students'
    },
    { 
      label: 'Product Orders', 
      value: data.productOrders.value.toString(), 
      change: data.productOrders.change, 
      icon: ShoppingBag,
      path: '/admin/reports?type=orders'
    },
    { 
      label: 'Course Enrollments', 
      value: data.courseEnrollments.value.toString(), 
      change: data.courseEnrollments.change, 
      icon: BookOpen,
      path: '/admin/reports?type=enrollments'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display text-charcoal mb-2">Overview</h1>
          <p className="text-gray-500 font-serif italic">Platform performance and recent activity.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
           <Calendar className="w-4 h-4 text-gray-400 ml-2" />
           <select 
             className="bg-transparent text-sm font-medium text-charcoal focus:outline-none border-none pr-8 cursor-pointer"
             onChange={handleDateChange}
             defaultValue="30days"
           >
             <option value="7days">Last 7 Days</option>
             <option value="30days">Last 30 Days</option>
             <option value="90days">Last 90 Days</option>
           </select>
           <div className="h-4 w-px bg-gray-200 mx-2"></div>
           <Button variant="ghost" size="sm" onClick={loadDashboardData} className="h-8 w-8 p-0">
             <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
           </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpiCards.map((stat, i) => {
           const Icon = stat.icon;
           const isPositive = stat.change >= 0;
           return (
            <div 
              key={i} 
              onClick={() => navigate(stat.path, { state: { filter } })}
              className="bg-white p-8 border border-gray-100 hover:border-gold transition-colors duration-300 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                 <div className="p-2 bg-ivory text-charcoal border border-gray-100 group-hover:bg-gold/10 group-hover:text-gold transition-colors">
                    <Icon size={20} />
                 </div>
                 <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                   {isPositive ? '+' : ''}{stat.change}%
                 </span>
              </div>
              <h3 className="text-3xl font-display text-charcoal mb-2">{stat.value}</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 3. Recent Orders Table */}
        <div className="bg-white border border-gray-100 shadow-sm flex flex-col">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-display">Recent Orders</h2>
            <Button variant="link" onClick={() => navigate('/admin/orders')} className="text-gold p-0 h-auto">View All</Button>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="p-4 pl-8">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4 text-right pr-8">Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {data.recentOrders.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No recent orders found.</td></tr>
                  ) : (
                    data.recentOrders.map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => navigate(`/admin/orders?id=${order.id}`)} // 3. Clickable -> Order Detail
                        className="hover:bg-ivory/50 cursor-pointer transition-colors"
                      >
                         <td className="p-4 pl-8 font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</td>
                         <td className="p-4 text-gray-600">{format(new Date(order.createdAt), 'MMM d, yyyy')}</td>
                         <td className="p-4 font-medium text-charcoal">
                           {order.userId === 'guest' ? 'Guest Customer' : 'Registered User'}
                         </td>
                         <td className="p-4 pr-8 text-right font-serif">{formatCurrency(order.total)}</td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
          </div>
        </div>

        {/* 4. New Enrollments List */}
        <div className="bg-white border border-gray-100 shadow-sm flex flex-col">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-display">New Enrollments</h2>
            <Button variant="link" onClick={() => navigate('/admin/academy')} className="text-gold p-0 h-auto">View All</Button>
          </div>
          <div className="overflow-auto flex-1 p-0">
             {data.recentEnrollments.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No recent enrollments found.</div>
             ) : (
                <div className="divide-y divide-gray-50">
                  {data.recentEnrollments.map(enrollment => (
                    <div 
                      key={enrollment.id}
                      onClick={() => navigate(`/admin/academy/enrollment/${enrollment.id}`)} // 4. Clickable -> Enrollment Detail
                      className="flex items-center justify-between p-4 px-8 hover:bg-ivory/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-charcoal text-ivory rounded-full flex items-center justify-center text-xs font-medium">
                          {enrollment.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-serif text-sm text-charcoal group-hover:text-gold transition-colors">{enrollment.studentName}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-wider">{enrollment.courseTitle || enrollment.courseId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="font-medium text-sm">{format(new Date(enrollment.enrolledAt), 'MMM d')}</p>
                         <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                           enrollment.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                         }`}>
                           {enrollment.status}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
