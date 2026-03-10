import React, { useState, useEffect } from 'react';
import { db } from '../../../../lib/db';
import type { AcademyEnrollment, Course, CourseSession } from '../../../../lib/db';
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
} from '../../ui/dropdown-menu';

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
      db.getCourseSessions(),
    ]);
    setEnrollments(eData);
    setCourses(cData);
    setSessions(sData);
  };

  const updateStatus = async (id: string, status: AcademyEnrollment['status']) => {
    const enrollment = enrollments.find((e) => e.id === id);
    if (enrollment) {
      const patch: any = { ...enrollment, status };

      if (status === 'invoice_sent') {
        patch.paymentStatus = 'invoiced';
        patch.invoiceSentAt = new Date().toISOString();
      }

      if (status === 'payment_review') {
        patch.paymentStatus = 'paid';
      }

      if (status === 'enrolled') {
        patch.paymentStatus = 'confirmed';
        patch.paymentConfirmedAt = new Date().toISOString();
      }

      await db.saveAcademyEnrollment(patch);
      await loadData();
      toast.success(`Enrollment marked as ${status}`);
    }
  };

  const updatePayment = async (id: string, paymentStatus: AcademyEnrollment['paymentStatus']) => {
    const enrollment = enrollments.find((e) => e.id === id);
    if (enrollment) {
      const patch: any = { ...enrollment, paymentStatus };

      if (paymentStatus === 'invoiced' && !patch.invoiceSentAt) {
        patch.invoiceSentAt = new Date().toISOString();
        if (patch.status === 'requested') patch.status = 'invoice_sent';
      }

      if (paymentStatus === 'confirmed') {
        patch.paymentConfirmedAt = new Date().toISOString();
        patch.status = 'enrolled';
      }

      await db.saveAcademyEnrollment(patch);
      await loadData();
      toast.success(`Payment marked as ${paymentStatus}`);
    }
  };

  const formatMoney = (amount: number, currency: string = 'ZAR') => {
    try {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `${currency} ${amount || 0}`;
    }
  };

  const filteredEnrollments =
    filterSession === 'all' ? enrollments : enrollments.filter((e) => e.sessionId === filterSession);

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
              {sessions.map((s) => {
                const course = courses.find((c) => c.id === s.courseId);
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
              <th className="p-4">Amount</th>
              <th className="p-4">Date</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEnrollments.map((enrollment) => {
              const session = sessions.find((s) => s.id === enrollment.sessionId);
              const course = courses.find((c) => c.id === enrollment.courseId);

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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        enrollment.status === 'enrolled'
                          ? 'bg-green-50 text-green-700'
                          : enrollment.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : enrollment.status === 'cancelled'
                              ? 'bg-red-50 text-red-700'
                              : enrollment.status === 'payment_review'
                                ? 'bg-purple-50 text-purple-700'
                                : enrollment.status === 'awaiting_payment'
                                  ? 'bg-orange-50 text-orange-700'
                                  : enrollment.status === 'invoice_sent'
                                    ? 'bg-blue-50 text-blue-700'
                                    : enrollment.status === 'no_show'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {enrollment.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        enrollment.paymentStatus === 'confirmed'
                          ? 'bg-green-50 text-green-700'
                          : enrollment.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : enrollment.paymentStatus === 'invoiced'
                              ? 'bg-blue-50 text-blue-700'
                              : enrollment.paymentStatus === 'refunded'
                                ? 'bg-red-50 text-red-700'
                                : enrollment.paymentStatus === 'failed'
                                  ? 'bg-red-50 text-red-700'
                                  : enrollment.paymentStatus === 'partial'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {enrollment.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {formatMoney(enrollment.amountPaid, enrollment.currency)}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    <div>{enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '—'}</div>
                    {enrollment.invoiceSentAt && (
                      <div className="text-[11px] text-blue-600 mt-1">
                        Invoice: {new Date(enrollment.invoiceSentAt).toLocaleDateString()}
                      </div>
                    )}
                    {enrollment.paymentConfirmedAt && (
                      <div className="text-[11px] text-green-600 mt-1">
                        Confirmed: {new Date(enrollment.paymentConfirmedAt).toLocaleDateString()}
                      </div>
                    )}
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
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'invoice_sent')}>
                          Send Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'awaiting_payment')}>
                          Mark Awaiting Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'payment_review')}>
                          Mark Payment Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePayment(enrollment.id, 'paid')}>
                          Mark Paid
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePayment(enrollment.id, 'confirmed')}>
                          Confirm Payment & Enroll
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'completed')}>
                          Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(enrollment.id, 'cancelled')} className="text-red-600">
                          Cancel Enrollment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => (window.location.href = `mailto:${enrollment.studentEmail}`)}>
                          <Mail className="mr-2 h-4 w-4" /> Email Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {filteredEnrollments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500">
                  No enrollments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
