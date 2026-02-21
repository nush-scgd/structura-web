import React, { useState, useEffect } from 'react';
import { db, Order } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Search, Filter, Eye, Printer, Mail, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';

export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        const data = await db.getAllOrders();
        setOrders(data);
    };

    const handleStatusChange = async (orderId: string, status: any) => {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, status });
        }
        toast.success(`Order status updated to ${status}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-display font-medium text-charcoal">Orders</h1>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
                        <tr>
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-mono text-gray-500">#{order.id.slice(0, 8)}</td>
                                <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">Guest User</td>
                                <td className="p-4 font-serif">{formatCurrency(order.total)}</td>
                                <td className="p-4">
                                    <Badge variant="outline" className={
                                        order.status === 'completed' || order.status === 'shipped' ? 'text-green-700 bg-green-50 border-green-200' : 
                                        order.status === 'pending' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                        'text-gray-700 bg-gray-50'
                                    }>
                                        {order.status}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                Mark as Completed
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'shipped')}>
                                                Mark as Shipped
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                         {orders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                    No orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedOrder && (
                <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                    <DialogContent className="max-w-3xl bg-white">
                        <DialogHeader>
                            <DialogTitle className="font-display text-xl">Order #{selectedOrder.id.slice(0, 8)}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-8 mt-4">
                            <div className="col-span-2 space-y-6">
                                <div className="border rounded-lg p-4 space-y-4 bg-ivory/20">
                                    {selectedOrder.items && selectedOrder.items.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                 <div className="w-12 h-12 bg-white rounded border border-gray-100 overflow-hidden">
                                                    {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                                                 </div>
                                                 <div>
                                                     <p className="font-medium">{item.title}</p>
                                                     <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                                                 </div>
                                            </div>
                                            <p className="font-serif">{formatCurrency(item.price * (item.quantity || 1))}</p>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-4 flex justify-between font-medium">
                                        <span>Total</span>
                                        <span className="font-serif">{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-medium">Status</label>
                                    <Select value={selectedOrder.status} onValueChange={(val) => handleStatusChange(selectedOrder.id, val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="shipped">Shipped</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button variant="outline" className="w-full justify-start" onClick={() => toast.success('Receipt sent')}>
                                    <Mail className="w-4 h-4 mr-2" /> Resend Receipt
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Printer className="w-4 h-4 mr-2" /> Print Receipt
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
