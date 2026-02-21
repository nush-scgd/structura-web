import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Product, ProductVariant, db, TenantSettings } from '../../../lib/db';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { ArrowLeft, Plus, Trash, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFormProps {
  initialData?: Product | null;
  onSave: (data: Product) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSave, onCancel }: ProductFormProps) {
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    db.getTenantSettings().then(setTenantSettings);
  }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Product>({
    defaultValues: initialData || {
      status: 'draft',
      stock: 0,
      price: 0,
      currency: 'USD', // Default fallback
      category: 'Care',
      variants: []
    }
  });

  // Update default currency when settings load if not editing
  useEffect(() => {
    if (tenantSettings && !initialData) {
      setValue('currency', tenantSettings.defaultCurrency);
    }
  }, [tenantSettings, initialData, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants"
  });

  const onSubmit = async (data: Product) => {
    try {
      await onSave(data);
      toast.success(initialData ? 'Product updated' : 'Product created');
    } catch (error) {
      toast.error('Failed to save product');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={onCancel} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-display font-medium">
            {initialData ? 'Edit Product' : 'New Product'}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-charcoal text-white hover:bg-black">
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Product Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Name</Label>
                <Input id="title" {...register('title', { required: 'Name is required' })} />
                {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register('brand')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...register('sku')} />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="category">Category</Label>
                 <Select onValueChange={(val) => setValue('category', val)} defaultValue={initialData?.category || 'Care'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Care">Care</SelectItem>
                    <SelectItem value="Styling">Styling</SelectItem>
                    <SelectItem value="Treatment">Treatment</SelectItem>
                    <SelectItem value="Tools">Tools</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input id="shortDescription" {...register('shortDescription')} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} className="min-h-[150px]" />
            </div>
          </div>

          {/* Media */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Media</h3>
            <div className="space-y-2">
              <Label htmlFor="image">Main Image URL</Label>
              <div className="flex gap-2">
                <Input id="image" {...register('image', { required: 'Image URL is required' })} placeholder="https://..." />
              </div>
              {watch('image') && (
                <div className="mt-4 aspect-square w-32 bg-gray-50 rounded border border-gray-100 overflow-hidden">
                  <img src={watch('image')} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Variants */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg">Variants</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), sku: '', price: 0, stock: 0 } as ProductVariant)}>
                <Plus className="w-4 h-4 mr-2" /> Add Variant
              </Button>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-6 gap-2 items-end border-b border-gray-50 pb-4">
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Size/Color</Label>
                      <Input {...register(`variants.${index}.size`)} placeholder="Size" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input {...register(`variants.${index}.sku`)} placeholder="SKU" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input type="number" {...register(`variants.${index}.price`)} placeholder="0.00" />
                    </div>
                     <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Stock</Label>
                      <Input type="number" {...register(`variants.${index}.stock`)} placeholder="0" />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No variants added. Standard product settings will apply.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Status */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Status</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Status</Label>
                 <Select onValueChange={(val) => setValue('status', val as any)} defaultValue={initialData?.status || 'draft'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Pricing</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                 <Select 
                    onValueChange={(val) => setValue('currency', val)} 
                    defaultValue={initialData?.currency || tenantSettings?.defaultCurrency || 'USD'}
                    value={watch('currency')}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantSettings?.allowedCurrencies?.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    )) || <SelectItem value="USD">USD</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Retail Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">{watch('currency') || '$'}</span>
                  <Input id="price" type="number" className="pl-10" {...register('price', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare-at Price</Label>
                 <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">{watch('currency') || '$'}</span>
                  <Input id="compareAtPrice" type="number" className="pl-10" {...register('compareAtPrice', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                 <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-xs">{watch('currency') || '$'}</span>
                  <Input id="costPrice" type="number" className="pl-10" {...register('costPrice', { valueAsNumber: true })} />
                </div>
                <p className="text-xs text-gray-400">Customers won't see this</p>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Inventory</h3>
             <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Total Stock</Label>
                <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input id="lowStockThreshold" type="number" {...register('lowStockThreshold', { valueAsNumber: true })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
