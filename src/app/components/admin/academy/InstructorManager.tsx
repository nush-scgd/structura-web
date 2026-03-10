import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../../../../lib/db';
import type { Instructor } from '../../../../lib/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Plus, Edit, Trash, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export function InstructorManager() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<Instructor>({
    defaultValues: { status: 'active' }
  });

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    const data = await db.getInstructors();
    setInstructors(data);
  };

  const onEdit = (instructor: Instructor) => {
    setEditingId(instructor.id);
    setIsEditing(true);
    setValue('name', instructor.name);
    setValue('title', instructor.title);
    setValue('email', instructor.email || '');
    setValue('bio', instructor.bio || '');
    setValue('image', instructor.image || '');
    setValue('status', instructor.status);
  };

  const onDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this instructor?')) {
      await db.deleteInstructor(id);
      await loadInstructors();
      toast.success('Instructor deleted');
    }
  };

  const onSubmit = async (data: Instructor) => {
    const id = editingId || crypto.randomUUID();
    await db.saveInstructor({ ...data, id });
    await loadInstructors();
    setIsEditing(false);
    setEditingId(null);
    reset();
    toast.success(editingId ? 'Instructor updated' : 'Instructor added');
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-100 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display">{editingId ? 'Edit Instructor' : 'Add Instructor'}</h2>
          <Button variant="ghost" onClick={() => { setIsEditing(false); setEditingId(null); reset(); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register('title', { required: true })} placeholder="e.g. Senior Educator" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register('email')} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea {...register('bio')} />
          </div>
          <div className="space-y-2">
            <Label>Profile Image URL</Label>
            <Input {...register('image')} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select onValueChange={(val) => setValue('status', val as any)} defaultValue="active">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => { setIsEditing(false); reset(); }}>Cancel</Button>
            <Button type="submit" className="bg-charcoal text-white hover:bg-black">Save Instructor</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-display">Instructors</h2>
        <Button onClick={() => { setIsEditing(true); reset(); }} className="bg-charcoal text-white hover:bg-black">
          <Plus className="w-4 h-4 mr-2" /> Add Instructor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instructors.map((instructor) => (
          <div key={instructor.id} className="bg-white p-4 rounded-lg border border-gray-100 flex gap-4 items-start">
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
              {instructor.image ? (
                <img src={instructor.image} alt={instructor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xl font-display">
                  {instructor.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-charcoal truncate">{instructor.name}</h3>
              <p className="text-xs text-gray-500 mb-1">{instructor.title}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                instructor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {instructor.status}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(instructor)} className="h-8 w-8 text-gray-500 hover:text-charcoal">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(instructor.id)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {instructors.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No instructors found. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
