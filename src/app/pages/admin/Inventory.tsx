import React, { useState, useEffect } from 'react';
import { db, Product } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Search, AlertTriangle, Save, History } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await db.getProducts();
    setProducts(data);
    setLoading(false);
  };

  const handleStockUpdate = async (product: Product, newStock: number) => {
    try {
      const updatedProduct = { ...product, stock: newStock };
      await db.saveProduct(updatedProduct);
      
      setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
      toast.success(`Stock updated for ${product.title}`);
    } catch (e) {
      toast.error('Failed to update stock');
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-medium text-charcoal">Inventory</h1>
        <Button variant="outline">
          <History className="w-4 h-4 mr-2" /> History Log
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-100 flex gap-4">
         <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search by product or SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Stock Level</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredProducts.map((product) => {
              const isLowStock = product.stock <= (product.lowStockThreshold || 5);
              const isOutOfStock = product.stock === 0;

              return (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-charcoal">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden border border-gray-100">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-medium">{product.title}</div>
                        {product.variants && product.variants.length > 0 && (
                            <div className="text-xs text-gray-400">{product.variants.length} variants</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">{product.sku || '-'}</td>
                  <td className="p-4 w-32">
                     <Input 
                        type="number" 
                        defaultValue={product.stock}
                        className="w-24 h-8"
                        onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val !== product.stock) {
                                handleStockUpdate(product, val);
                            }
                        }}
                     />
                  </td>
                  <td className="p-4">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Out of Stock</Badge>
                    ) : isLowStock ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 flex w-fit items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">In Stock</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                     <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Save className="w-4 h-4 text-gray-400" />
                     </Button>
                  </td>
                </tr>
              );
            })}
             {filteredProducts.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
