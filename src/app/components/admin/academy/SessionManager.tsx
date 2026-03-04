import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db, Course, CourseSession, Instructor } from '../../../../lib/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Plus, Edit, Trash, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function SessionManager() {
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<CourseSession>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sData, cData, iData] = await Promise.all([
      db.getSessions(),
      db.getCourses(),
      db.getInstructors()
    ]);
    // Sort sessions by date
    sData.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    setSessions(sData);
    setCourses(cData);
    setInstructors(iData);
  };

  const onEdit = (session: CourseSession) => {
    setEditingId(session.id);
    setIsEditing(true);
    setValue('courseId', session.courseId);
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTime = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
    };
    
    setValue('startDate', formatDateTime(session.startDate)); 
    setValue('endDate', formatDateTime(session.endDate));
    setValue('capacity', session.capacity);
    setValue('status', session.status);
    setValue('instructorId', session.instructorId);
    setValue('location', session.location);
    // Don't reset enrolled count as it's not editable here usually
    setValue('enrolledCount', session.enrolledCount); 
  };

  const onDelete = async (id: string) => {
    if (confirm('Delete this session?')) {
      await db.deleteSession(id);
      await loadData();
      toast.success('Session deleted');
    }
  };

  const onSubmit = async (data: CourseSession) => {
    const id = editingId || crypto.randomUUID();
    // Keep existing enrolled count if editing, else 0
    const existing = sessions.find(s => s.id === id);
    const enrolledCount = existing ? existing.enrolledCount : 0;
    
    await db.saveSession({ ...data, id, enrolledCount });
    await loadData();
    setIsEditing(false);
    setEditingId(null);
    reset();
    toast.success(editingId ? 'Session updated' : 'Session scheduled');
  };

  const selectedCourseId = watch('courseId');
  
  // Auto-fill capacity from course default if creating new
  useEffect(() => {
    if (selectedCourseId && !editingId) {
      const course = courses.find(c => c.id === selectedCourseId);
      if (course?.defaultCapacity) {
        setValue('capacity', course.defaultCapacity);
      }
      if (course?.instructorId) {
          setValue('instructorId', course.instructorId);
      }
      if (course?.location) {
          setValue('location', course.location);
      }
    }
  }, [selectedCourseId, courses, editingId, setValue]);

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-100 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display">{editingId ? 'Edit Session' : 'Schedule Session'}</h2>
          <Button variant="ghost" onClick={() => { setIsEditing(false); setEditingId(null); reset(); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select onValueChange={(val) => setValue('courseId', val)} defaultValue={watch('courseId')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input type="datetime-local" {...register('startDate', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Input type="datetime-local" {...register('endDate', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" {...register('capacity', { valueAsNumber: true, required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(val) => setValue('status', val as any)} defaultValue={watch('status') || 'scheduled'}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
             <Label>Instructor (Optional Override)</Label>
             <Select onValueChange={(val) => setValue('instructorId', val)} defaultValue={watch('instructorId')}>
                <SelectTrigger>
                    <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                    {instructors.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>

          <div className="space-y-2">
            <Label>Location (Optional Override)</Label>
            <Input {...register('location')} placeholder="Leave empty to use course default" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsEditing(false); reset(); }}>Cancel</Button>
            <Button type="submit" className="bg-charcoal text-white hover:bg-black">Save Session</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-display">Scheduled Sessions</h2>
        <Button onClick={() => { setIsEditing(true); reset(); }} className="bg-charcoal text-white hover:bg-black">
          <Plus className="w-4 h-4 mr-2" /> Schedule Session
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Course</th>
              <th className="p-4">Status</th>
              <th className="p-4">Enrolled</th>
              <th className="p-4">Instructor</th>
              <th className="p-4 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sessions.map((session) => {
              const course = courses.find(c => c.id === session.courseId);
              const instructor = instructors.find(i => i.id === (session.instructorId || course?.instructorId));
              
              return (
                <tr key={session.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-mono text-xs">
                    {new Date(session.startDate).toLocaleString()}
                  </td>
                  <td className="p-4 font-medium">{course?.title || 'Unknown Course'}</td>
                  <td className="p-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        session.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                        session.status === 'full' ? 'bg-orange-50 text-orange-700' :
                        session.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-50 text-red-600'
                    }`}>
                        {session.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {session.enrolledCount} / {session.capacity}
                  </td>
                  <td className="p-4 text-gray-500">
                    {instructor?.name || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(session)}>
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(session.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500">No scheduled sessions.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
