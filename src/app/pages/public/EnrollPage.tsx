import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { db } from '../../../lib/db';
import type { Course } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function EnrollPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('courseId');
  const sessionId = searchParams.get('sessionId');

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionRef, setSubmissionRef] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!courseId) {
        navigate('/academy');
        return;
      }

      try {
        const c = await db.getCourse(courseId);

        if (!c) {
          toast.error('Course not found');
          navigate('/academy');
          return;
        }

        setCourse(c);
      } catch (error) {
        console.error('Failed to load course for enrollment', error);
        toast.error('Failed to load course details');
        navigate('/academy');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [courseId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!course || !courseId) return;

    setSubmitting(true);

    try {
      const allEnrollments = await db.getAcademyEnrollments();
      const existing = allEnrollments.find(
        (enrollment: any) =>
          enrollment.courseId === courseId &&
          enrollment.studentEmail?.toLowerCase() === email.trim().toLowerCase() &&
          (sessionId ? enrollment.sessionId === sessionId : true)
      );

      if (existing) {
        setSubmissionRef(existing.id);
        setSubmitted(true);
        toast.success('Your enrollment request already exists.');
        return;
      }

      const nowIso = new Date().toISOString();

      const enrollment = await db.saveAcademyEnrollment({
        id: crypto.randomUUID(),
        courseId,
        sessionId: sessionId || undefined,
        studentId: null,
        studentName: fullName.trim() || 'Student',
        studentEmail: email.trim(),
        status: 'requested',
        paymentStatus: 'pending',
        amountPaid: 0,
        currency: course.currency || 'ZAR',
        enrolledAt: nowIso,
      } as any);

      try {
        const emailResponse = await fetch('/api/send-enrollment-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentName: fullName.trim() || 'Student',
            studentEmail: email.trim(),
            courseTitle: course.title,
            sessionLabel: sessionId || undefined,
            enrollmentId: enrollment.id,
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Enrollment email request failed with status', emailResponse.status);
        }
      } catch (emailError) {
        console.warn('Enrollment emails could not be sent:', emailError);
      }

      setSubmissionRef(enrollment.id);
      setSubmitted(true);
      toast.success('Enrollment request received.');
    } catch (error: any) {
      console.error('Enrollment submission error:', error);
      toast.error(error?.message || 'Failed to submit enrollment request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-serif text-gray-400">Loading course details...</div>;
  }

  if (!course) {
    return <div className="h-screen flex items-center justify-center font-serif text-gray-400">Course not found.</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white p-10 shadow-sm border border-gray-100 text-center space-y-6">
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">Enrollment Request Received</span>
          <h1 className="text-3xl font-display">Thank you, {fullName || 'Student'}</h1>
          <p className="text-gray-600 leading-relaxed">
            Your request to enroll in <span className="text-charcoal font-medium">{course.title}</span> has been recorded.
          </p>
          <div className="bg-gray-50 border border-gray-100 p-6 text-left space-y-2">
            <p><span className="font-medium">Email:</span> {email}</p>
            {submissionRef && <p><span className="font-medium">Reference:</span> {submissionRef}</p>}
            <p><span className="font-medium">Payment:</span> EFT required to secure your spot.</p>
            <p className="text-sm text-gray-500 pt-2">
              A confirmation email should arrive shortly. Your invoice will follow separately to secure your spot via EFT.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              type="button"
              onClick={() => navigate('/academy')}
              className="bg-charcoal hover:bg-black text-white rounded-none uppercase tracking-widest"
            >
              Back to Academy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/academy/course/${course.id}`)}
              className="rounded-none uppercase tracking-widest"
            >
              View Course
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">Course Enrollment</span>
          <h1 className="text-3xl font-display mt-2 mb-2">Reserve Your Spot</h1>
          <p className="text-gray-500 font-serif text-sm">
            Provide your details to enroll in <span className="text-charcoal font-medium">{course.title}</span>
          </p>
          {sessionId && (
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-3">
              Selected intake: {sessionId}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-gray-50 border-gray-200 focus:border-gold rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-50 border-gray-200 focus:border-gold rounded-none"
            />
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 space-y-2">
            <p><span className="font-medium text-charcoal">Payment method:</span> EFT</p>
            <p>Your spot is only secured once payment has been received and confirmed.</p>
            <p>A confirmation email will be sent to the email address you provide above, followed by your invoice.</p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-charcoal hover:bg-black text-white rounded-none uppercase tracking-widest text-sm"
          >
            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Submit Enrollment Request'}
          </Button>
        </form>
      </div>
    </div>
  );
}
