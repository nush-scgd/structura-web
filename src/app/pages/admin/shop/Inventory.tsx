import React, { useState, useEffect } from 'react';
import { db, Product, Inventory } from '../../../../lib/db';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateId } from '../../../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

interface StockRow {
  product: Product;
  inventory: Inventory;
  available: number;
}

export default function AdminInventory() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const products = await db.getProducts();
    const inventoryPromises = products.map(p => db.getInventory(p.id));
    const inventories = await Promise.all(inventoryPromises);
    
    const combined = products.map((p, i) => ({
      product: p,
      inventory: inventories[i],
      available: Math.max(0, inventories[i].onHand - inventories[i].reserved)
    }));
    
    setRows(combined);
    setLoading(false);
  }

  const handleAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setDelta(0);
    setReason('');
    setModalOpen(true);
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || delta === 0) return;
    
    try {
      await db.updateInventory(adjustingProduct.id, delta, reason);
      toast.success('Inventory updated');
      setModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to update inventory');
    }
  };

  const filteredRows = rows.filter(r => 
    r.product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display">Inventory</h1>
        <Button onClick={loadData} variant="outline" size="sm">
           <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-gray-200">
         <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search via name or SKU..." className="pl-9" />
            </div>
         </div>
         <table className="w-full text-left text-sm">
           <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs">
             <tr>
               <th className="p-4">SKU</th>
               <th className="p-4">Product</th>
               <th className="p-4 text-right">On Hand</th>
               <th className="p-4 text-right">Reserved</th>
               <th className="p-4 text-right">Available</th>
               <th className="p-4 text-center">Status</th>
               <th className="p-4 text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {filteredRows.map(row => (
               <tr key={row.product.id} className={row.available === 0 ? 'bg-red-50' : ''}>
                 <td className="p-4 text-gray-500 font-mono text-xs">{row.product.sku || '-'}</td>
                 <td className="p-4 font-medium">{row.product.title}</td>
                 <td className="p-4 text-right font-mono">{row.inventory.onHand}</td>
                 <td className="p-4 text-right font-mono text-gray-400">{row.inventory.reserved}</td>
                 <td className="p-4 text-right font-mono font-bold">{row.available}</td>
                 <td className="p-4 text-center">
                    {row.available > 0 ? (
                       <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">In Stock</span>
                    ) : (
                       <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Out of Stock</span>
                    )}
                 </td>
                 <td className="p-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleAdjust(row.product)}>Adjust</Button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>

      {modalOpen && adjustingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded shadow-lg max-w-md w-full animate-in zoom-in-95">
              <h3 className="text-lg font-bold mb-4">Adjust Stock: {adjustingProduct.title}</h3>
              <form onSubmit={submitAdjustment} className="space-y-4">
                 <div>
                    <Label>Adjustment Amount (+/-)</Label>
                    <Input type="number" value={delta} onChange={e => setDelta(Number(e.target.value))} autoFocus />
                    <p className="text-xs text-gray-500 mt-1">Positive adds stock, negative removes stock.</p>
                 </div>
                 <div>
                    <Label>Reason</Label>
                    <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Stock take, Damaged, Restock" required />
                 </div>
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-charcoal text-white">Save Adjustment</Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
