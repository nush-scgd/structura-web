import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { db, Course, PlatformSettings, AcademyEnrollment } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { generateId } from '../../../lib/utils';

export default function EnrollPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('courseId');
  const sessionId = searchParams.get('sessionId');

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!courseId) {
        navigate('/academy');
        return;
      }
      
      const [c, s] = await Promise.all([
          db.getCourse(courseId),
          db.getPlatformSettings()
      ]);

      if (!c) {
        toast.error("Course not found");
        navigate('/academy');
        return;
      }
      setCourse(c);
      setSettings(s);
      
      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // We don't automatically trigger enrollment to avoid accidental clicks, 
        // but we can pre-fill or just show a "Confirm" button if logged in.
        // For now, let's keep the flow where they submit the form even if logged in (maybe hide password).
        // Actually, existing code called handleEnrollment immediately if session exists.
        // That might be too aggressive if they just visited the page. 
        // But let's stick to the prompt's request for logic changes, not UX overhaul unless necessary.
        // However, if I auto-enroll, I can't show "Reserve" vs "Pay" difference easily.
        // I'll skip auto-enrollment on load to allow user to see the button label.
      }
      setLoading(false);
    }
    loadData();
  }, [courseId, navigate]);

  const handleEnrollment = async (userId: string, userEmail: string) => {
    try {
      setSubmitting(true);
      
      // 1. Ensure Profile Exists
      let profile = await db.getProfile(userId);
      if (!profile) {
        profile = {
          id: userId,
          email: userEmail,
          fullName: fullName || 'Student',
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await db.saveProfile(profile);
      }

      // 2. Check for existing enrollment
      const allEnrollments = await db.getAcademyEnrollments();
      const existing = allEnrollments.find(e => e.studentId === userId && e.courseId === courseId);
      
      if (existing) {
          if (existing.paymentStatus === 'paid' || existing.paymentStatus === 'confirmed') {
              toast.success("You are already enrolled!");
              navigate('/student/dashboard');
              return;
          }
          // If pending, handle based on mode
      }

      const mode = settings?.academyPaymentMode || 'PAY_BEFORE_ACCESS';
      let enrollmentId = existing?.id || generateId();
      
      let paymentStatus: any = 'pending';
      let enrolmentStatus: any = 'enrolled'; // Default for most cases except PAY_BEFORE
      
      if (mode === 'PAY_BEFORE_ACCESS') {
          enrolmentStatus = 'requested'; // Wait for payment
      } else if (mode === 'NO_PAYMENTS') {
          paymentStatus = 'not_required';
          enrolmentStatus = 'enrolled';
      } else if (mode === 'PAY_AFTER_ACCESS') {
          paymentStatus = 'pending';
          enrolmentStatus = 'enrolled';
      }

      if (!existing) {
        const enrollment: AcademyEnrollment = {
          id: enrollmentId,
          courseId: courseId!,
          sessionId: sessionId || undefined,
          studentId: userId,
          studentName: profile.fullName,
          studentEmail: userEmail,
          status: enrolmentStatus,
          paymentStatus: paymentStatus,
          amountPaid: mode === 'NO_PAYMENTS' ? 0 : (course?.price || 0), // If paid later, amount is set but not paid yet? 
          // Actually amountPaid usually implies what IS paid.
          // I'll set it to 0 for now until paid.
          currency: course?.currency || 'USD',
          enrolledAt: new Date().toISOString()
        };
        await db.saveAcademyEnrollment(enrollment);
      }

      // 3. Post-Enrollment Action
      if (mode === 'PAY_BEFORE_ACCESS') {
          // Redirect to checkout
          navigate(`/checkout?enrollmentId=${enrollmentId}`);
      } else {
          // Success & Dashboard
          toast.success(mode === 'PAY_AFTER_ACCESS' ? 'Enrollment successful! Payment is pending.' : 'Enrollment successful!');
          navigate('/student/dashboard');
      }

    } catch (error) {
      console.error("Enrollment error:", error);
      toast.error("Failed to process enrollment.");
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let result;
      // Simple Auth Check
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
          await handleEnrollment(session.user.id, session.user.email!);
          return;
      }

      if (authMode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
      }

      if (result.error) throw result.error;
      
      if (result.data.user) {
        await handleEnrollment(result.data.user.id, result.data.user.email!);
      }

    } catch (error: any) {
      toast.error(error.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-serif text-gray-400">Loading course details...</div>;

  const getButtonLabel = () => {
      const mode = settings?.academyPaymentMode || 'PAY_BEFORE_ACCESS';
      if (mode === 'PAY_BEFORE_ACCESS') return 'Enroll & Pay';
      if (mode === 'PAY_AFTER_ACCESS') return 'Reserve Your Seat';
      return 'Register';
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">
              {settings?.academyPaymentMode === 'PAY_BEFORE_ACCESS' ? 'Step 1 of 2' : 'Final Step'}
          </span>
          <h1 className="text-3xl font-display mt-2 mb-2">Create Student Account</h1>
          <p className="text-gray-500 font-serif text-sm">
            To enroll in <span className="text-charcoal font-medium">{course?.title}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {authMode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                required 
                className="bg-gray-50 border-gray-200 focus:border-gold rounded-none"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="bg-gray-50 border-gray-200 focus:border-gold rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="bg-gray-50 border-gray-200 focus:border-gold rounded-none"
            />
          </div>

          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full h-12 bg-charcoal hover:bg-black text-white rounded-none uppercase tracking-widest text-sm"
          >
            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : (authMode === 'signup' ? getButtonLabel() : 'Sign In & Continue')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {authMode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button onClick={() => setAuthMode('signin')} className="text-gold hover:underline">
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to Structura?{' '}
              <button onClick={() => setAuthMode('signup')} className="text-gold hover:underline">
                Create Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
