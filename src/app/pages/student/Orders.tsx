import React, { useState, useEffect } from 'react';
import { db, Order } from '../../../lib/db';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Eye } from 'lucide-react';

export default function StudentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      // Mock User
      const userId = "student_123"; 
      const allOrders = await db.getOrdersByUser(userId);
      setOrders(allOrders);
      setLoading(false);
    }
    loadOrders();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-400 font-serif animate-pulse">Loading Orders...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display text-charcoal">Order History</h1>
        <p className="text-gray-500 font-serif mt-2">Track your past purchases and receipts.</p>
      </div>

      {orders.length > 0 ? (
        <div className="bg-white rounded border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
              <tr>
                <th className="p-6">Order ID</th>
                <th className="p-6">Date</th>
                <th className="p-6">Items</th>
                <th className="p-6">Total</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-6 font-mono text-xs text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-6 text-gray-600 font-serif">{format(new Date(order.createdAt), 'MMM d, yyyy')}</td>
                  <td className="p-6 text-gray-800 font-medium">{order.items.length} items</td>
                  <td className="p-6 font-medium font-serif">{order.currency} {order.total.toLocaleString()}</td>
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-charcoal">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-20 border border-dashed border-gray-200 bg-gray-50/30">
          <p className="text-gray-400 font-serif italic mb-4">You haven't placed any orders yet.</p>
          <Button variant="outline" onClick={() => window.location.href='/student/shop'}>
            Go to Shop
          </Button>
        </div>
      )}
    </div>
  );
}
