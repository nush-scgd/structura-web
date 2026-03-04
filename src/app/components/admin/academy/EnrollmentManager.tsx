import React, { useState, useEffect } from 'react';
import { db, AcademyEnrollment, Course, CourseSession } from '../../../../lib/db';
import { Button } from '../../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import { MoreHorizontal, Mail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

export function EnrollmentManager() {
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [filterSession, setFilterSession] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eData, cData, sData] = await Promise.all([
      db.getAcademyEnrollments(),
      db.getCourses(),
      db.getSessions()
    ]);
    setEnrollments(eData);
    setCourses(cData);
    setSessions(sData);
  };

  const updateStatus = async (id: string, status: AcademyEnrollment['status']) => {
    const enrollment = enrollments.find(e => e.id === id);
    if (enrollment) {
      const updated = { ...enrollment, status };
      await db.saveAcademyEnrollment(updated);
      await loadData();
      toast.success(`Enrollment marked as ${status}`);
    }
  };

  const updatePayment = async (id: string, paymentStatus: AcademyEnrollment['paymentStatus']) => {
    const enrollment = enrollments.find(e => e.id === id);
    if (enrollment) {
      const updated = { ...enrollment, paymentStatus };
      await db.saveAcademyEnrollment(updated);
      await loadData();
      toast.success(`Payment marked as ${paymentStatus}`);
    }
  };

  const filteredEnrollments = filterSession === 'all' 
    ? enrollments 
    : enrollments.filter(e => e.sessionId === filterSession);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-display">Enrollments</h2>
        <div className="w-64">
           <Select onValueChange={setFilterSession} defaultValue="all">
             <SelectTrigger>
               <SelectValue placeholder="Filter by Session" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Sessions</SelectItem>
               {sessions.map(s => {
                 const course = courses.find(c => c.id === s.courseId);
                 return (
                   <SelectItem key={s.id} value={s.id}>
                     {course?.title} - {new Date(s.startDate).toLocaleDateString()}
                   </SelectItem>
                 );
               })}
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Course / Session</th>
              <th className="p-4">Status</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Date</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEnrollments.map((enrollment) => {
              const session = sessions.find(s => s.id === enrollment.sessionId);
              const course = courses.find(c => c.id === enrollment.courseId);
              
              return (
                <tr key={enrollment.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="font-medium text-charcoal">{enrollment.studentName}</div>
                    <div className="text-xs text-gray-400">{enrollment.studentEmail}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{course?.title}</div>
                    {session && (
                      <div className="text-xs text-gray-500">
                        {new Date(session.startDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        enrollment.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                        enrollment.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                        enrollment.status === 'dropped' ? 'bg-red-50 text-red-700' :
                        'bg-yellow-50 text-yellow-700'
                    }`}>
                        {enrollment.status}
                    </span>
                  </td>
                   <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        enrollment.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' :
                        enrollment.paymentStatus === 'failed' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {enrollment.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'confirmed')}>
                          Confirm Enrollment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePayment(enrollment.id, 'paid')}>
                          Mark Paid
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'dropped')} className="text-red-600">
                          Drop Student
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.location.href=`mailto:${enrollment.studentEmail}`}>
                           <Mail className="mr-2 h-4 w-4" /> Email Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
             {filteredEnrollments.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500">No enrollments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
