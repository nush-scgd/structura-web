import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../../../../lib/db';
import type { Course, TenantSettings } from '../../../../lib/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Plus, Edit, Trash, ArrowLeft, Image as ImageIcon } from 'lucide-react';

import { toast } from 'sonner';

import ImgHairAdvancedColour from '../../../../assets/Horizontal_DesktopView/Course_Hair_Advanced Colour Techniques.png';
import ImgHairAdvancedGents from '../../../../assets/Horizontal_DesktopView/Course_Hair_Advanced Gents Cutting.png';
import ImgHairBridalStyling from '../../../../assets/Horizontal_DesktopView/Course_Hair_Bridal Styling Masterclass.png';
import ImgHairCuttingEssentials from '../../../../assets/Horizontal_DesktopView/Course_Hair_Cutting Essentials.png';
import ImgHairFoundations from '../../../../assets/Horizontal_DesktopView/Course_Hair_Foundations & Styling.png';
import ImgMakeupBridal from '../../../../assets/Horizontal_DesktopView/Course_Makeup_Bridal & Special Occasion Makeup.png';
import ImgMakeupEyesLipsLashes from '../../../../assets/Horizontal_DesktopView/Course_Makeup_Eyes, Lips & Lashes.png';
import ImgMakeupFoundationContour from '../../../../assets/Horizontal_DesktopView/Course_Makeup_Foundation & Contouring Techniques.png';
import ImgMakeupProMastery from '../../../../assets/Horizontal_DesktopView/Course_Makeup_Professional Makeup Mastery.png';

const STATIC_COURSE_IMAGES_BY_ID: Record<string, string> = {
  // Hair
  course_advanced_colour: ImgHairAdvancedColour,
  course_gents_cutting: ImgHairAdvancedGents,
  course_bridal_styling: ImgHairBridalStyling,
  course_cutting_essentials: ImgHairCuttingEssentials,
  course_foundations_styling: ImgHairFoundations,

  // Makeup (use these IDs when you add the rows)
  course_makeup_professional_mastery: ImgMakeupProMastery,
  course_makeup_foundation_contour: ImgMakeupFoundationContour,
  course_makeup_eyes_lips_lashes: ImgMakeupEyesLipsLashes,
  course_makeup_bridal: ImgMakeupBridal,
};

function getStaticCourseImage(course: any): string | undefined {
  const id = String(course?.id || '');
  return STATIC_COURSE_IMAGES_BY_ID[id];
}

function makeCourseId(title: string) {
  const slug = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug ? `course_${slug}` : `course_${Date.now()}`;
}

export function CourseManager() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const results = await Promise.allSettled([
      db.getCourses(),
      db.getTenantSettings(),
    ]);

    const [cRes, sRes] = results;

    if (cRes.status === 'fulfilled') setCourses(cRes.value);
    else {
      console.error('getCourses failed', cRes.reason);
      setCourses([]);
    }

    if (sRes.status === 'fulfilled') setSettings(sRes.value);
    else {
      console.error('getTenantSettings failed', sRes.reason);
      setSettings(null);
    }
  };

  const handleSave = async (data: Course) => {
    try {
      const id = editingCourse?.id || (data as any)?.id || makeCourseId(data.title);
      const payload = { ...data, id } as any;

      // Build dbPayload with correct schema mapping
      const dbPayload = {
        title: payload.title,
        description: payload.description ?? null,
        thumbnail: payload.thumbnail ?? null,
        price: payload.price != null ? Number(payload.price) : null,
        duration_days: payload.duration_days != null ? Number(payload.duration_days) : null,
        price_minor:
          payload.price_minor != null
            ? Number(payload.price_minor)
            : payload.price != null
            ? Math.round(Number(payload.price) * 100)
            : null,
        currency: payload.currency ?? 'ZAR',
        deposit_percent: payload.deposit_percent != null ? Number(payload.deposit_percent) : 50,
        instructor_name: payload.instructor_name ?? null,
        max_students: payload.max_students != null ? Number(payload.max_students) : 5,
        images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [],
        is_active: payload.is_active ?? true,
        status: payload.status ?? 'active',
        learning_outcomes: Array.isArray(payload.learning_outcomes)
          ? payload.learning_outcomes.filter(Boolean)
          : [],
      };

      const anyDb = db as any;

      // IMPORTANT: do not call db.saveCourse directly; guard via typeof checks first.
      if (typeof anyDb.saveCourse === 'function') {
        await anyDb.saveCourse({ ...dbPayload, id });
      } else if (typeof anyDb.upsertCourse === 'function') {
        await anyDb.upsertCourse({ ...dbPayload, id });
      } else if (typeof anyDb.updateCourse === 'function' && typeof anyDb.createCourse === 'function') {
        if (editingCourse?.id) {
          await anyDb.updateCourse(editingCourse.id, dbPayload);
        } else {
          await anyDb.createCourse({ id, ...dbPayload });
        }
      } else if (typeof anyDb.saveCourses === 'function') {
        await anyDb.saveCourses([{ ...dbPayload, id }]);
      } else {
        throw new Error(
          'No course save method found on db. Expected one of: saveCourse, upsertCourse, createCourse/updateCourse, saveCourses.'
        );
      }

      await loadData();
      setView('list');
      setEditingCourse(null);
      toast.success(editingCourse ? 'Course updated' : 'Course created');
    } catch (e) {
      console.error('Failed to save course', e);
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
                <th className="p-4">Duration</th>
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
                      {((course as any)?.thumbnail || (course as any)?.images?.[0] || getStaticCourseImage(course)) && (
                        <img
                          src={(
                            (course as any)?.thumbnail ||
                            (course as any)?.images?.[0] ||
                            getStaticCourseImage(course)
                          ) as string}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{course.title}</td>
                  <td className="p-4">{(course as any)?.duration_days ? `${(course as any).duration_days} days` : '-'}</td>
                  <td className="p-4 font-mono">{course.currency || 'ZAR'} {course.price ?? '-'}</td>
                  <td className="p-4">{(course as any)?.instructor_name || '-'}</td>
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
    settings={settings}
    onSave={handleSave} 
    onCancel={() => { setView('list'); setEditingCourse(null); }} 
  />;
}

function CourseForm({ initialData, settings, onSave, onCancel }: { 
  initialData: Course | null, 
  settings: TenantSettings | null,
  onSave: (data: Course) => Promise<void>, 
  onCancel: () => void 
}) {
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Course>({
    defaultValues: (initialData
      ? ({
          ...initialData,
          thumbnail: (initialData as any)?.thumbnail || '',
          images: (initialData as any)?.images || [],
        } as any)
      : {
        id: '',
        title: '',
        description: '',
        thumbnail: '',
        price: undefined,
        duration_days: undefined,
        price_minor: undefined,
        currency: settings?.defaultCurrency || 'ZAR',
        deposit_percent: 50,
        instructor_name: '',
        max_students: 5,
        images: [],
        is_active: true,
        status: 'active',
        learning_outcomes: [''],
      }) as any
  });

  // Hand-rolled simple string array management for learning outcomes
  const [outcomes, setOutcomes] = useState<string[]>(
    (initialData as any)?.learning_outcomes ||
    (initialData as any)?.learningOutcomes ||
    ['']
  );
  
  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
    setValue('learning_outcomes' as any, newOutcomes);
  };

  const addOutcome = () => setOutcomes([...outcomes, '']);
  const deleteOutcome = (index: number) => {
    const newOutcomes = outcomes.filter((_, i) => i !== index);
    setOutcomes(newOutcomes);
    setValue('learning_outcomes' as any, newOutcomes);
  };

  // Ensure currency is set
  useEffect(() => {
    if (!initialData && settings) {
      setValue('currency', settings.defaultCurrency);
    }
  }, [settings, initialData, setValue]);

  const [uploadingThumb, setUploadingThumb] = useState(false);

  const handleThumbnailUpload = async (file: File) => {
    let courseId = (watch('id') as any) || initialData?.id;
    // Ensure id exists for new courses
    if (!courseId) {
      courseId = makeCourseId(watch('title') || '');
      setValue('id', courseId as any);
    }

    setUploadingThumb(true);
    try {
      const { publicUrl } = await db.uploadCourseImage(file, { courseId });

      // Keep existing images (if any) and set the uploaded one as the first image.
      const currentImages =
        ((watch('images' as any) as any) ?? (initialData as any)?.images ?? []).filter(Boolean);

      const nextImages = [publicUrl, ...currentImages.filter((u: string) => u !== publicUrl)];

      // Save both fields:
      // - `thumbnail` is used by the UI list/table today
      // - `images` matches the DB schema (text[]) in Supabase
      setValue('thumbnail', publicUrl as any);
      setValue('images' as any, nextImages as any);

      toast.success('Thumbnail uploaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
    }
  };

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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input {...register('title', { required: 'Title is required' })} />
                {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...register('description')} className="min-h-[100px]" placeholder="Course description and details..." />
              </div>
              <div className="space-y-2">
                <Label>Instructor Name</Label>
                <Input {...register('instructor_name')} placeholder="e.g. Sarah Johnson" />
              </div>
            </div>
          </div>

          {/* Learning Outcomes */}
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

          {/* Media */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-display text-lg">Media</h3>
            <div className="space-y-2">
              <Label>Thumbnail</Label>

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploadingThumb}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                    // allow selecting same file again
                    e.currentTarget.value = '';
                  }}
                />
              </div>

              <div className="text-xs text-gray-500">
                Or paste a URL below:
              </div>

              <Input {...register('thumbnail')} placeholder="https://..." />

              {(
                (watch('thumbnail') as any) ||
                (watch('images' as any) as any)?.[0] ||
                getStaticCourseImage({ id: watch('id') })
              ) && (
                <div className="mt-2 aspect-video rounded bg-gray-100 overflow-hidden">
                  <img
                    src={(
                      (watch('thumbnail') as any) ||
                      (watch('images' as any) as any)?.[0] ||
                      getStaticCourseImage({ id: watch('id') })
                    ) as string}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {uploadingThumb && (
                <div className="text-xs text-gray-500">Uploading...</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Course Settings */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Settings</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select onValueChange={(val) => setValue('status', val as any)} defaultValue={initialData?.status || 'active'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={watch('is_active' as any) ?? true} 
                    onCheckedChange={(checked) => setValue('is_active' as any, checked)} 
                  />
                  <Label>Is Active</Label>
                </div>
             </div>
          </div>

          {/* Course Logistics */}
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-6">
             <h3 className="font-display text-lg">Logistics</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                   <Label>Duration (days)</Label>
                   <Input type="number" {...register('duration_days' as any, { valueAsNumber: true })} placeholder="e.g. 5" />
                </div>
                 <div className="space-y-2">
                   <Label>Max Students</Label>
                   <Input type="number" {...register('max_students' as any, { valueAsNumber: true })} />
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
                     <SelectItem value="ZAR">ZAR</SelectItem>
                     <SelectItem value="USD">USD</SelectItem>
                     <SelectItem value="EUR">EUR</SelectItem>
                     <SelectItem value="GBP">GBP</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Price</Label>
                 <Input type="number" {...register('price', { valueAsNumber: true })} />
               </div>
               <div className="space-y-2">
                 <Label>Deposit Percent</Label>
                 <Input type="number" {...register('deposit_percent' as any, { valueAsNumber: true })} placeholder="50" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </form>
  );
}
