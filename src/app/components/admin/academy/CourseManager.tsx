import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { db, Course, Instructor, TenantSettings } from '../../../../lib/db';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Plus, Edit, Trash, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CourseManager() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cData, iData, sData] = await Promise.all([
      db.getCourses(),
      db.getInstructors(),
      db.getTenantSettings()
    ]);
    setCourses(cData);
    setInstructors(iData);
    setSettings(sData);
  };

  const handleSave = async (data: Course) => {
    try {
      const id = editingCourse?.id || crypto.randomUUID();
      await db.saveCourse({ ...data, id });
      await loadData();
      setView('list');
      setEditingCourse(null);
      toast.success(editingCourse ? 'Course updated' : 'Course created');
    } catch (e) {
      toast.error('Failed to save course');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this course? This cannot be undone.')) {
      await db.deleteCourse(id);
      await loadData();
      toast.success('Course deleted');
    }
  };

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-display">Courses</h2>
          <Button onClick={() => { setEditingCourse(null); setView('create'); }} className="bg-charcoal text-white hover:bg-black">
            <Plus className="w-4 h-4 mr-2" /> Add Course
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
              <tr>
                <th className="p-4 w-16">Image</th>
                <th className="p-4">Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Instructor</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                      {course.thumbnail && <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{course.title}</td>
                  <td className="p-4 capitalize">{course.type}</td>
                  <td className="p-4 font-mono">{course.currency} {course.price}</td>
                  <td className="p-4">
                    {instructors.find(i => i.id === course.instructorId)?.name || '-'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {course.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCourse(course); setView('edit'); }}>
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-gray-500">No courses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <CourseForm 
    initialData={editingCourse} 
    instructors={instructors} 
    settings={settings}
    onSave={handleSave} 
    onCancel={() => { setView('list'); setEditingCourse(null); }} 
  />;
}

function CourseForm({ initialData, instructors, settings, onSave, onCancel }: { 
  initialData: Course | null, 
  instructors: Instructor[],
  settings: TenantSettings | null,
  onSave: (data: Course) => Promise<void>, 
  onCancel: () => void 
}) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Course>({
    defaultValues: initialData || {
      status: 'draft',
      type: 'in-person',
      certificationType: 'Completion',
      currency: settings?.defaultCurrency || 'USD',
      learningOutcomes: [''],
      curriculum: [],
      isAccredited: false
    }
  });

  const { fields: outcomeFields, append: appendOutcome, remove: removeOutcome } = useFieldArray({
    control,
    name: "learningOutcomes" as any // Type cast workaround for simple string array with react-hook-form
  });
  
  // Hand-rolled simple string array management because useFieldArray expects object array
  const [outcomes, setOutcomes] = useState<string[]>(initialData?.learningOutcomes || ['']);
  
  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
    setValue('learningOutcomes', newOutcomes);
  };

  const addOutcome = () => setOutcomes([...outcomes, '']);
  const deleteOutcome = (index: number) => {
    const newOutcomes = outcomes.filter((_, i) => i !== index);
    setOutcomes(newOutcomes);
    setValue('learningOutcomes', newOutcomes);
  };

  // Ensure currency is set
  useEffect(() => {
    if (!initialData && settings) {
      setValue('currency', settings.defaultCurrency);
    }
  }, [settings, initialData, setValue]);

  const watchedType = watch('type');
  const watchedIsAccredited = watch('isAccredited');

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-display">{initialData ? 'Edit Course' : 'New Course'}</h2>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-charcoal text-white hover:bg-black">
            {isSubmitting ? 'Saving...' : 'Save Course'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Course Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label>Title</Label>
                <Input {...register('title', { required: 'Title is required' })} />
                {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input {...register('tagline')} placeholder="Short catchy phrase" />
              </div>
               <div className="space-y-2">
                <Label>Type</Label>
                <Select onValueChange={(val) => setValue('type', val as any)} defaultValue={initialData?.type || 'in-person'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">In-Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
               <Label>Value Proposition (Why it matters)</Label>
               <Textarea {...register('description')} className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
               <Label>Target Audience</Label>
               <Input {...register('targetAudience')} placeholder="e.g. Beginners, Advanced Stylists" />
            </div>
            <div className="space-y-2">
               <Label>Prerequisites</Label>
               <Input {...register('prerequisites')} placeholder="e.g. Basic cutting knowledge" />
            </div>
          </div>

          {/* Curriculum / Outcomes */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Learning Outcomes</h3>
            <div className="space-y-3">
               {outcomes.map((outcome, index) => (
                 <div key={index} className="flex gap-2">
                   <Input 
                      value={outcome} 
                      onChange={(e) => updateOutcome(index, e.target.value)} 
                      placeholder="e.g. Master the french bob technique" 
                   />
                   <Button type="button" variant="ghost" size="icon" onClick={() => deleteOutcome(index)}>
                     <Trash className="w-4 h-4 text-red-500" />
                   </Button>
                 </div>
               ))}
               <Button type="button" variant="outline" size="sm" onClick={addOutcome}>
                 <Plus className="w-4 h-4 mr-2" /> Add Outcome
               </Button>
            </div>
          </div>

          {/* Location for In-Person */}
          {(watchedType === 'in-person' || watchedType === 'hybrid') && (
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-display text-lg">Location</h3>
              <div className="space-y-2">
                <Label>Venue Name</Label>
                <Input {...register('location')} placeholder="e.g. Structura Main Academy" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input {...register('address')} placeholder="123 Fashion Ave..." />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Logistics */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Logistics</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select onValueChange={(val) => setValue('status', val as any)} defaultValue={initialData?.status || 'draft'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instructor</Label>
                  <Select onValueChange={(val) => setValue('instructorId', val)} defaultValue={initialData?.instructorId}>
                    <SelectTrigger><SelectValue placeholder="Select Instructor" /></SelectTrigger>
                    <SelectContent>
                      {instructors.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                   <Label>Duration</Label>
                   <Input {...register('duration')} placeholder="e.g. 2 Days, 6 Weeks" />
                </div>
                 <div className="space-y-2">
                   <Label>Default Capacity</Label>
                   <Input type="number" {...register('defaultCapacity', { valueAsNumber: true })} />
                </div>
             </div>
          </div>

          {/* Pricing */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Pricing</h3>
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Currency</Label>
                 <Select 
                    onValueChange={(val) => setValue('currency', val)} 
                    defaultValue={initialData?.currency || settings?.defaultCurrency}
                  >
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {settings?.allowedCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Price</Label>
                 <Input type="number" {...register('price', { valueAsNumber: true })} />
               </div>
             </div>
          </div>

          {/* Certification */}
           <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Certification</h3>
             <div className="flex items-center gap-2">
               <Switch 
                 checked={watch('isAccredited')} 
                 onCheckedChange={(checked) => setValue('isAccredited', checked)} 
               />
               <Label>Accredited Course</Label>
             </div>
             
             {watchedIsAccredited && (
               <div className="space-y-2">
                 <Label>Accrediting Body</Label>
                 <Input {...register('accreditingBody')} />
               </div>
             )}

             <div className="space-y-2">
                <Label>Certificate Type</Label>
                <Select onValueChange={(val) => setValue('certificationType', val as any)} defaultValue={initialData?.certificationType || 'Completion'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completion">Completion</SelectItem>
                    <SelectItem value="Accredited Certificate">Accredited Certificate</SelectItem>
                    <SelectItem value="Diploma">Diploma</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             
             <div className="space-y-2">
                <Label>Certificate Template</Label>
                <Select onValueChange={(val) => setValue('certificateTemplateId', val)} defaultValue={initialData?.certificateTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select Template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic Ivory</SelectItem>
                    <SelectItem value="modern">Modern Minimal</SelectItem>
                    <SelectItem value="gold">Gold Foil Luxury</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

           {/* Media */}
           <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Media</h3>
             <div className="space-y-2">
               <Label>Thumbnail URL</Label>
               <Input {...register('thumbnail')} placeholder="https://..." />
               {watch('thumbnail') && (
                 <div className="mt-2 aspect-video rounded bg-gray-100 overflow-hidden">
                   <img src={watch('thumbnail')} className="w-full h-full object-cover" />
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </form>
  );
}
