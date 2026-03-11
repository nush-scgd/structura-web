import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { db } from '../../../lib/db';
import { format, subDays, isSameDay } from 'date-fns';
import { Download, Calendar, Filter, ArrowUpRight, Search, TrendingUp, TrendingDown, DollarSign, Package, CreditCard, ShoppingBag, Users, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const COLORS = ['#D4AF37', '#111111', '#999999', '#E5E7EB'];

export default function AdminReports() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  const [filters, setFilters] = useState({
    status: 'all',
    provider: 'all',
    orderType: 'all',
    branch: 'all'
  });
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);

  const hasDbMethod = (methodName: string) => typeof (db as any)?.[methodName] === 'function';

  const getSafeArray = (value: any) => Array.isArray(value) ? value : [];

  const getSafeObject = (value: any) => (value && typeof value === 'object' ? value : {});

  useEffect(() => {
    loadReportData();
  }, [type, dateRange, filters]);

  const loadReportData = async () => {
    setLoading(true);
    setFilteredDate(null);
    try {
      if (type === 'revenue') {
        const revenueData = hasDbMethod('getRevenueReport')
          ? await (db as any).getRevenueReport(dateRange.start, dateRange.end)
          : {};

        const ordersData = hasDbMethod('getOrdersReport')
          ? await (db as any).getOrdersReport(dateRange.start, dateRange.end)
          : {};

        const enrollmentsData = hasDbMethod('getEnrollmentsReport')
          ? await (db as any).getEnrollmentsReport(dateRange.start, dateRange.end)
          : { list: [], daily: [], summary: null };

        setData({
          ...getSafeObject(revenueData),
          orders: getSafeArray((ordersData as any)?.list),
          enrollments: getSafeArray((enrollmentsData as any)?.list)
        });
      } else if (type === 'orders') {
        const ordersData = hasDbMethod('getOrdersReport')
          ? await (db as any).getOrdersReport(dateRange.start, dateRange.end, {
              status: filters.status,
              provider: filters.provider,
              type: filters.orderType,
              branchId: filters.branch
            })
          : { list: [], daily: [], summary: null };

        setData({
          list: getSafeArray((ordersData as any)?.list),
          daily: getSafeArray((ordersData as any)?.daily),
          summary: (ordersData as any)?.summary ?? null
        });
      } else if (type === 'enrollments') {
        const enrollmentsData = hasDbMethod('getEnrollmentsReport')
          ? await (db as any).getEnrollmentsReport(dateRange.start, dateRange.end)
          : { list: [], daily: [], summary: null, error: 'getEnrollmentsReport is not available on db' };

        setData({
          list: getSafeArray((enrollmentsData as any)?.list),
          daily: getSafeArray((enrollmentsData as any)?.daily),
          summary: (enrollmentsData as any)?.summary ?? null,
          error: (enrollmentsData as any)?.error ?? null
        });
      } else if (type === 'students') {
        const studentsData = hasDbMethod('getStudentsReport')
          ? await (db as any).getStudentsReport(dateRange.start, dateRange.end)
          : { list: [], daily: [], summary: null };

        setData({
          list: getSafeArray((studentsData as any)?.list),
          daily: getSafeArray((studentsData as any)?.daily),
          summary: (studentsData as any)?.summary ?? null
        });
      } else if (type === 'inventory') {
        const inventory = hasDbMethod('report_inventory_on_hand')
          ? await (db as any).report_inventory_on_hand(dateRange.start, dateRange.end)
          : { list: [], summary: null };

        const transactions = hasDbMethod('inventory_transactions')
          ? await (db as any).inventory_transactions(dateRange.start, dateRange.end)
          : { transactions: [], chart: [] };

        setData({
          ...getSafeObject(inventory),
          list: getSafeArray((inventory as any)?.list),
          summary: (inventory as any)?.summary ?? null,
          transactions: getSafeArray((transactions as any)?.transactions),
          chart: getSafeArray((transactions as any)?.chart)
        });
      } else {
        setData({ list: [], daily: [], summary: null });
      }
    } catch (e) {
      console.error(e);
      setData({ list: [], daily: [], summary: null, error: e instanceof Error ? e.message : 'Failed to load report data' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (days: number) => {
    setDateRange({
      start: subDays(new Date(), days),
      end: new Date()
    });
  };

  const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      setFilteredDate(state.activeLabel === filteredDate ? null : state.activeLabel);
    }
  };

  const exportCSV = () => {
    let rows: any[] = [];
    if (type === 'revenue' && data?.daily) rows = data.daily;
    else if (type === 'orders' && data?.list) rows = data.list;
    else if (type === 'enrollments' && data?.list) rows = data.list;
    else if (type === 'students' && data?.list) rows = data.list;
    else if (data?.chart) rows = data.chart;
    else if (data?.list) rows = data.list;

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + 
      rows.map((row: any) => Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(',')).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTitle = () => {
    switch(type) {
      case 'revenue': return 'Revenue Report';
      case 'orders': return 'Orders Report';
      case 'enrollments': return 'Enrollments Report';
      case 'students': return 'Students & Engagement';
      case 'inventory': return 'Inventory Report';
      default: return 'Report';
    }
  };

  const revenueRows = useMemo(() => {
    if (type !== 'revenue') return [];

    return [
      ...getSafeArray(data?.orders).map((o: any) => ({ ...o, type: 'Order', amount: o.total })),
      ...getSafeArray(data?.enrollments).map((e: any) => ({ ...e, type: 'Enrollment', amount: e.amountPaid }))
    ]
      .filter((item: any) => !filteredDate || isSameDay(new Date(item.createdAt || item.enrolledAt), new Date(filteredDate)))
      .sort((a: any, b: any) => new Date(b.createdAt || b.enrolledAt).getTime() - new Date(a.createdAt || a.enrolledAt).getTime());
  }, [type, data, filteredDate]);

  const ordersRows = useMemo(() => {
    if (type !== 'orders') return [];

    return getSafeArray(data?.list).filter(
      (o: any) => !filteredDate || isSameDay(new Date(o.createdAt), new Date(filteredDate))
    );
  }, [type, data, filteredDate]);

  const enrollmentsRows = useMemo(() => {
    if (type !== 'enrollments') return [];

    return getSafeArray(data?.list).filter(
      (e: any) => !filteredDate || isSameDay(new Date(e.enrolledAt), new Date(filteredDate))
    );
  }, [type, data, filteredDate]);

  const studentsRows = useMemo(() => {
    if (type !== 'students') return [];

    return getSafeArray(data?.list).filter(
      (s: any) => !filteredDate || (s.lastActive && isSameDay(new Date(s.lastActive), new Date(filteredDate)))
    );
  }, [type, data, filteredDate]);

  const inventoryRows = useMemo(() => {
    if (type !== 'inventory') return [];
    return getSafeArray(data?.list);
  }, [type, data]);

  const renderSummaryCard = (title: string, value: string, subValue?: string, trend?: number) => (
      <div className="bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
            <div className="text-2xl font-display text-charcoal">{value}</div>
          </div>
          <div className="flex justify-between items-end">
              {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
              {trend !== undefined && (
                  <div className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(trend).toFixed(1)}% vs prev period
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-display text-charcoal">{getTitle()}</h1>
          <p className="text-gray-500 text-sm font-serif">
             {type === 'inventory' ? 'Current stock levels and valuation' : 
              `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           {type !== 'inventory' && (
             <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-1">
               <button onClick={() => handleDateFilterChange(7)} className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-charcoal hover:bg-white rounded transition-colors">7 Days</button>
               <button onClick={() => handleDateFilterChange(30)} className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-charcoal hover:bg-white rounded transition-colors">30 Days</button>
               <button onClick={() => handleDateFilterChange(90)} className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-charcoal hover:bg-white rounded transition-colors">90 Days</button>
             </div>
           )}
           <Button variant="outline" size="sm" onClick={exportCSV}>
             <Download className="w-4 h-4 mr-2" /> Export
           </Button>
        </div>
      </div>

      {/* Filters for Orders Report */}
      {type === 'orders' && (
          <div className="bg-white p-4 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-xs uppercase tracking-wider text-gray-500">Filter By:</span>
              </div>
              <select 
                className="bg-gray-50 border border-gray-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                  <option value="all">Status: All</option>
                  <option value="completed">Completed/Paid</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
              </select>
              <select 
                className="bg-gray-50 border border-gray-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold"
                value={filters.provider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
              >
                  <option value="all">Provider: All</option>
                  <option value="Stripe">Stripe</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Yoco">Yoco</option>
              </select>
              <select 
                className="bg-gray-50 border border-gray-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold"
                value={filters.orderType}
                onChange={(e) => handleFilterChange('orderType', e.target.value)}
              >
                  <option value="all">Type: All</option>
                  <option value="Product">Product</option>
                  <option value="Course">Course</option>
              </select>
              <select 
                className="bg-gray-50 border border-gray-200 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold"
                value={filters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
              >
                  <option value="all">Branch: All</option>
                  <option value="main">Main Branch</option>
              </select>
          </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading report data...</div>
      ) : (
        <div className="space-y-8">
          {data?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm shadow-sm">
              {data.error}
            </div>
          )}
          
          {/* Revenue Summary Cards */}
          {type === 'revenue' && data?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {renderSummaryCard('Net Revenue', formatCurrency(data.summary.netRevenue), 'Total earned', data.summary.changePercent)}
                  {renderSummaryCard('Gross Revenue', formatCurrency(data.summary.grossRevenue), 'Before refunds/discounts')}
                  {renderSummaryCard('Refunds', formatCurrency(data.summary.refunds), 'Total returned')}
                  {renderSummaryCard('Discounts', formatCurrency(data.summary.discounts), 'Total discounted')}
              </div>
          )}

          {/* Orders Summary Cards */}
          {type === 'orders' && data?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {renderSummaryCard('Total Orders', data.summary.totalOrders.toString(), 'All time', data.summary.ordersChange)}
                  {renderSummaryCard('Paid', data.summary.paidOrders.toString(), 'Completed transactions')}
                  {renderSummaryCard('Pending', data.summary.pendingOrders.toString(), 'Awaiting payment')}
                  {renderSummaryCard('Cancelled', data.summary.cancelledOrders.toString(), 'Refunded/Void')}
                  {renderSummaryCard('Avg. Order Value', formatCurrency(data.summary.aov), 'Per transaction', data.summary.aovChange)}
              </div>
          )}

          {/* Enrollments Summary Cards */}
          {type === 'enrollments' && data?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderSummaryCard('Total Enrollments', data.summary.totalEnrollments.toString(), 'In selected period', data.summary.enrollmentsChange)}
                  {renderSummaryCard('Completions', data.summary.completions.toString(), 'Finished courses', data.summary.completionsChange)}
                  {renderSummaryCard('Completion Rate', `${data.summary.completionRate.toFixed(1)}%`, 'Of total enrolled', data.summary.rateChange)}
              </div>
          )}

          {/* Students Summary Cards */}
          {type === 'students' && data?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {renderSummaryCard('Active Students', data.summary.activeStudents.toString(), 'Unique active users')}
                  {renderSummaryCard('New Customers', data.summary.newCustomers.toString(), 'Signed up in period')}
                  {renderSummaryCard('Returning', data.summary.returningCustomers.toString(), 'Previously active')}
                  {renderSummaryCard('Avg Revenue / Customer', formatCurrency(data.summary.avgRevenuePerCustomer), 'Based on active users')}
              </div>
          )}

          {/* Inventory Summary Cards */}
          {type === 'inventory' && data?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderSummaryCard('Total SKUs', data.summary.totalSkus.toString(), 'Active products')}
                  {renderSummaryCard('Low Stock Items', data.summary.lowStockCount.toString(), 'Below reorder level')}
                  {renderSummaryCard('Total Stock Value', formatCurrency(data.summary.totalValue), 'Current inventory')}
              </div>
          )}

          {/* Revenue Charts Row */}
          {type === 'revenue' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Line Chart */}
                 <div className="lg:col-span-2 bg-white p-6 border border-gray-100 shadow-sm h-96">
                    <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Net Revenue by Day</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={data.daily} onClick={handleChartClick}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                           <YAxis tick={{fontSize: 10}} tickFormatter={(val) => `$${val/100}`} />
                           <Tooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                           <Line type="monotone" dataKey="netRevenue" stroke="#D4AF37" strokeWidth={2} dot={{r: 4, fill: '#D4AF37'}} activeDot={{r: 6}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
                 
                 {/* Donut Chart */}
                 <div className="bg-white p-6 border border-gray-100 shadow-sm h-96 flex flex-col">
                    <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Revenue Source</h3>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={getSafeArray(data?.byType)}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getSafeArray(data?.byType).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Products' ? '#D4AF37' : '#111111'} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-gray-400 uppercase tracking-widest">Total</span>
                            <span className="text-lg font-medium text-charcoal">{formatCurrency(data.summary.netRevenue)}</span>
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {getSafeArray(data?.byType).map((entry: any, index: number) => (
                            <div key={index} className="flex items-center text-xs text-gray-500">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.name === 'Products' ? '#D4AF37' : '#111111' }}></span>
                                {entry.name} ({Math.round(entry.value / data.summary.netRevenue * 100)}%)
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
          )}

          {/* Orders Chart */}
          {type === 'orders' && data?.daily && (
             <div className="bg-white p-6 border border-gray-100 h-96 shadow-sm">
                <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Orders Over Time</h3>
                <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={data.daily} onClick={handleChartClick}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                       <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                       <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                       <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} dot={{r: 4, fill: '#D4AF37'}} activeDot={{r: 6}} />
                     </LineChart>
                </ResponsiveContainer>
             </div>
          )}

          {/* Enrollments Chart */}
          {type === 'enrollments' && data?.daily && (
             <div className="bg-white p-6 border border-gray-100 h-96 shadow-sm">
                <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Enrollment Activity</h3>
                <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={data.daily} onClick={handleChartClick}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                       <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                       <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                       <Legend />
                       <Line type="monotone" dataKey="enrollments" name="New Enrollments" stroke="#D4AF37" strokeWidth={2} dot={{r: 4, fill: '#D4AF37'}} activeDot={{r: 6}} />
                       <Line type="monotone" dataKey="completions" name="Completions" stroke="#111111" strokeWidth={2} dot={{r: 4, fill: '#111111'}} activeDot={{r: 6}} />
                     </LineChart>
                </ResponsiveContainer>
             </div>
          )}

          {/* Students Charts */}
          {type === 'students' && data?.daily && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* New Customers Chart */}
                 <div className="bg-white p-6 border border-gray-100 h-80 shadow-sm">
                    <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">New Customer Signups</h3>
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={data.daily} onClick={handleChartClick}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                           <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                           <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                           <Bar dataKey="newCustomers" fill="#111111" radius={[2, 2, 0, 0]} />
                         </BarChart>
                    </ResponsiveContainer>
                 </div>
                 {/* Active Students Chart */}
                 <div className="bg-white p-6 border border-gray-100 h-80 shadow-sm">
                    <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Active Students Over Time</h3>
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={data.daily} onClick={handleChartClick}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                           <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                           <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                           <Area type="monotone" dataKey="activeStudents" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} strokeWidth={2} />
                         </AreaChart>
                    </ResponsiveContainer>
                 </div>
             </div>
          )}

          {/* Inventory Charts */}
          {type === 'inventory' && data?.chart && (
              <div className="bg-white p-6 border border-gray-100 h-96 shadow-sm">
                  <h3 className="text-sm font-medium text-charcoal mb-6 uppercase tracking-wider">Stock Movement (Sales) Over Time</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.chart} onClick={handleChartClick}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                          <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                          <Tooltip labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')} />
                          <Area type="monotone" dataKey="sold" name="Units Sold" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          )}

          {/* Top Items Table for Revenue */}
          {type === 'revenue' && data?.topItems && (
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-medium text-sm text-charcoal uppercase tracking-wider">Top Performing Items</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500">
                          <tr>
                              <th className="p-4">Item Name</th>
                              <th className="p-4">Type</th>
                              <th className="p-4 text-right">Quantity</th>
                              <th className="p-4 text-right">Revenue</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {getSafeArray(data?.topItems).map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-ivory/50">
                                  <td className="p-4 font-medium text-charcoal">{item.name}</td>
                                  <td className="p-4">
                                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${item.type === 'Product' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                                          {item.type}
                                      </span>
                                  </td>
                                  <td className="p-4 text-right text-gray-500">{item.quantity}</td>
                                  <td className="p-4 text-right font-medium">{formatCurrency(item.revenue)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          {/* Drilldown Tables */}
          <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-medium text-sm text-charcoal uppercase tracking-wider">
                 {filteredDate ? `Details for ${format(new Date(filteredDate), 'MMM d, yyyy')}` : 'Detailed Records'}
               </h3>
               {filteredDate && (
                 <button onClick={() => setFilteredDate(null)} className="text-xs text-red-500 hover:underline">Clear Filter</button>
               )}
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500">
                    {/* Revenue Header */}
                    {type === 'revenue' && (
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Reference</th>
                        <th className="p-4 text-right">Amount</th>
                      </tr>
                    )}
                    {/* Orders Header */}
                    {type === 'orders' && (
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Order #</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Provider</th>
                        <th className="p-4 text-right">Total</th>
                      </tr>
                    )}
                    {/* Enrollments Header */}
                    {type === 'enrollments' && (
                      <tr>
                         <th className="p-4">Student</th>
                         <th className="p-4">Course</th>
                         <th className="p-4">Enrolled Date</th>
                         <th className="p-4">Status</th>
                      </tr>
                    )}
                    {/* Students Header */}
                    {type === 'students' && (
                       <tr>
                         <th className="p-4">Student Name</th>
                         <th className="p-4">Contact</th>
                         <th className="p-4 text-right">Total Spend</th>
                         <th className="p-4 text-right">Enrollments</th>
                         <th className="p-4 text-right">Last Active</th>
                       </tr>
                    )}
                    {/* Inventory Header */}
                    {type === 'inventory' && (
                       <tr>
                         <th className="p-4">SKU</th>
                         <th className="p-4">Product Name</th>
                         <th className="p-4 text-right">On Hand</th>
                         <th className="p-4 text-right">Reorder Level</th>
                         <th className="p-4 text-right">Units Sold</th>
                         <th className="p-4 text-right">Value</th>
                       </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Revenue Row Rendering */}
                    {type === 'revenue' && (
                      <>
                        {revenueRows.map((item: any, idx: number) => (
                          <tr key={idx} onClick={() => navigate(item.type === 'Order' ? `/admin/orders?id=${item.id}` : `/admin/academy/enrollment/${item.id}`)} className="hover:bg-ivory/50 cursor-pointer transition-colors">
                             <td className="p-4">{format(new Date(item.createdAt || item.enrolledAt), 'MMM d, HH:mm')}</td>
                             <td className="p-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${item.type === 'Order' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{item.type}</span></td>
                             <td className="p-4 font-mono text-xs text-gray-500">#{item.id.slice(0,8)}</td>
                             <td className="p-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    
                    {/* Orders Row Rendering */}
                    {type === 'orders' && (
                      <>
                        {ordersRows.map((order: any) => (
                           <tr key={order.id} onClick={() => navigate(`/admin/orders?id=${order.id}`)} className="hover:bg-ivory/50 cursor-pointer transition-colors">
                              <td className="p-4">{format(new Date(order.createdAt), 'MMM d, yyyy')}</td>
                              <td className="p-4 font-mono text-xs text-gray-500">#{order.id.slice(0,8)}</td>
                              <td className="p-4">
                                  <div className="font-medium text-charcoal">{order.customerName}</div>
                                  <div className="text-xs text-gray-400">{order.customerEmail}</div>
                              </td>
                              <td className="p-4">
                                  <span className={cn(
                                      "text-[10px] uppercase px-2 py-0.5 rounded",
                                      order.status === 'completed' || order.status === 'paid' ? "bg-green-50 text-green-700" :
                                      order.status === 'pending' ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                                  )}>
                                      {order.status}
                                  </span>
                              </td>
                              <td className="p-4 text-xs text-gray-500">{order.paymentProvider}</td>
                              <td className="p-4 text-right font-medium">{formatCurrency(order.total)}</td>
                           </tr>
                        ))}
                      </>
                    )}

                    {/* Enrollments Row Rendering */}
                    {type === 'enrollments' && (
                      <>
                        {enrollmentsRows.map((enrollment: any) => (
                          <tr key={enrollment.id} className="hover:bg-ivory/50 transition-colors">
                             <td className="p-4 font-medium">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); navigate(`/admin/users?id=${enrollment.studentId}`); }}
                                   className="hover:text-gold hover:underline text-left font-medium"
                                 >
                                   {enrollment.studentName}
                                 </button>
                             </td>
                             <td className="p-4 text-gray-500">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); navigate(`/admin/academy/course/${enrollment.courseId}`); }}
                                   className="hover:text-gold hover:underline text-left"
                                 >
                                   {enrollment.courseTitle}
                                 </button>
                             </td>
                             <td className="p-4">{format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}</td>
                             <td className="p-4">
                                <span className={cn(
                                    "text-[10px] uppercase px-2 py-0.5 rounded",
                                    enrollment.status === 'completed' || enrollment.status === 'passed' ? "bg-green-50 text-green-700" :
                                    enrollment.status === 'dropped' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                                )}>
                                    {enrollment.status}
                                </span>
                             </td>
                          </tr>
                        ))}
                      </>
                    )}
                    
                    {/* Students Row Rendering */}
                    {type === 'students' && (
                      <>
                        {studentsRows.map((student: any) => (
                           <tr key={student.id} onClick={() => navigate(`/admin/users?id=${student.id}`)} className="hover:bg-ivory/50 cursor-pointer transition-colors">
                              <td className="p-4">
                                  <div className="font-medium text-charcoal flex items-center gap-2">
                                      {student.name}
                                      {student.isNew && <span className="bg-gold/20 text-gold text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">New</span>}
                                  </div>
                              </td>
                              <td className="p-4 text-gray-500 text-xs">{student.email}</td>
                              <td className="p-4 text-right font-medium">{formatCurrency(student.totalSpend)}</td>
                              <td className="p-4 text-right text-gray-500">{student.enrollmentsCount}</td>
                              <td className="p-4 text-right text-xs text-gray-400">
                                  {student.lastActive ? format(new Date(student.lastActive), 'MMM d, yyyy') : 'Never'}
                              </td>
                           </tr>
                        ))}
                      </>
                    )}

                    {/* Inventory Row Rendering */}
                    {type === 'inventory' && (
                      <>
                        {inventoryRows.map((item: any) => (
                           <tr key={item.id} onClick={() => navigate(`/admin/products?search=${item.sku}`)} className="hover:bg-ivory/50 cursor-pointer transition-colors">
                              <td className="p-4 font-mono text-xs text-gray-500">{item.sku}</td>
                              <td className="p-4 font-medium flex items-center gap-2">
                                  {item.name}
                                  {item.isLowStock && (
                                      <span className="bg-red-50 text-red-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">Low Stock</span>
                                  )}
                              </td>
                              <td className={`p-4 text-right font-medium ${item.isLowStock ? 'text-red-600' : 'text-charcoal'}`}>
                                  {item.onHand}
                              </td>
                              <td className="p-4 text-right text-gray-500">{item.reorderLevel}</td>
                              <td className="p-4 text-right text-gray-600">{item.unitsSold || 0}</td>
                              <td className="p-4 text-right font-medium">{formatCurrency(item.value)}</td>
                           </tr>
                        ))}
                      </>
                    )}
                  </tbody>
               </table>
               {((type === 'revenue' && revenueRows.length === 0) ||
                 (type === 'orders' && ordersRows.length === 0) ||
                 (type === 'enrollments' && enrollmentsRows.length === 0) ||
                 (type === 'students' && studentsRows.length === 0) ||
                 (type === 'inventory' && inventoryRows.length === 0)) && (
                 <div className="p-8 text-center text-gray-400">No data available for selected period.</div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}