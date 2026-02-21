import React, { useState, useEffect } from 'react';
import { db, Product } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash, Copy } from 'lucide-react';
import { ProductForm } from '../../components/admin/ProductForm';
import { formatCurrency } from '../../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Badge } from '../../components/ui/badge';

export default function AdminProducts() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await db.getProducts();
    setProducts(data);
  };

  const handleSave = async (product: Product) => {
    if (!product.id) {
        product.id = crypto.randomUUID();
    }
    await db.saveProduct(product);
    await loadProducts();
    setView('list');
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'create') {
    return <ProductForm onSave={handleSave} onCancel={() => setView('list')} />;
  }

  if (view === 'edit' && selectedProduct) {
    return <ProductForm initialData={selectedProduct} onSave={handleSave} onCancel={() => { setView('list'); setSelectedProduct(null); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-medium text-charcoal">Products</h1>
        <Button onClick={() => setView('create')} className="bg-charcoal text-white hover:bg-black">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all"
          />
        </div>
        <Button variant="outline" className="flex gap-2">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Product</th>
              <th className="p-4">Status</th>
              <th className="p-4">Inventory</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden border border-gray-100">
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="p-4 font-medium text-charcoal">
                  <div className="flex flex-col">
                    <span>{product.title}</span>
                    <span className="text-xs text-gray-400 font-normal">{product.brand}</span>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className={
                    product.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : 
                    product.status === 'draft' ? 'bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200' :
                    'bg-red-50 text-red-600 hover:bg-red-50 border-red-100'
                  }>
                    {product.status || 'Draft'}
                  </Badge>
                </td>
                <td className="p-4">
                  <span className={product.stock <= (product.lowStockThreshold || 5) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                    {product.stock} in stock
                  </span>
                  {product.variants && product.variants.length > 0 && (
                     <span className="text-xs text-gray-400 block">{product.variants.length} variants</span>
                  )}
                </td>
                <td className="p-4 text-gray-500">{product.category}</td>
                <td className="p-4 text-right font-serif">{formatCurrency(product.price)}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { setSelectedProduct(product); setView('edit'); }}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                         const newProduct = { ...product, id: crypto.randomUUID(), title: `${product.title} (Copy)`, status: 'draft' as const };
                         handleSave(newProduct);
                      }}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
             {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500">
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
