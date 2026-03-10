import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { db, AdminInvite } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function InviteSignupPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<AdminInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkInvite() {
        if (!token) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }
        const inv = await db.getAdminInvite(token);
        if (!inv) {
            setError('Invite not found');
        } else if (inv.usedAt) {
            setError('This invite has already been used');
        } else if (new Date(inv.expiresAt) < new Date()) {
            setError('This invite has expired');
        } else {
            setInvite(inv);
        }
        setLoading(false);
    }
    checkInvite();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!invite) return;
      
      if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
      }
      
      setSubmitting(true);
      try {
          // 1. Sign Up
          const { data, error: authError } = await supabase.auth.signUp({
              email: invite.email,
              password: password,
              options: {
                  data: { full_name: fullName }
              }
          });

          if (authError) {
              // If user already exists, maybe we should try to sign in?
              // For security, standard behavior is usually "User already registered".
              // But if they were invited, maybe they should login to accept?
              // The prompt says "creates auth user". I'll assume new user.
              throw authError;
          }

          if (data.user) {
              // 2. Create Admin Profile
              // Force role 'admin'
              const profile = {
                  id: data.user.id,
                  email: invite.email,
                  fullName: fullName,
                  role: 'admin' as const,
                  status: 'active' as const,
                  createdAt: new Date().toISOString()
              };
              await db.saveProfile(profile);

              // 3. Mark Invite Used
              await db.markAdminInviteUsed(invite.token);

              toast.success('Admin account created successfully');
              navigate('/admin/dashboard');
          }
      } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Failed to create account');
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory"><Loader2 className="animate-spin text-gold" /></div>;

  if (error) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-6">
              <div className="bg-white p-8 border border-red-100 rounded-lg shadow-sm max-w-md w-full text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h1 className="text-xl font-display text-charcoal mb-2">Invalid Invite</h1>
                  <p className="text-gray-500 mb-6">{error}</p>
                  <Link to="/">
                      <Button variant="outline">Return Home</Button>
                  </Link>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-6">
        <div className="max-w-md w-full bg-white p-8 border border-gray-100 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gold" />
            
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 text-gold mb-4">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-display text-charcoal mb-2">Admin Access</h1>
                <p className="text-gray-500 text-sm">
                    You have been invited to join Structura as an Administrator.
                </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={invite?.email} disabled className="bg-gray-50 text-gray-500" />
                    <p className="text-xs text-gray-400">Email is locked to the invitation</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                        id="name" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        required 
                        placeholder="John Doe"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input 
                        id="confirm" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        required 
                    />
                </div>

                <Button type="submit" className="w-full bg-charcoal text-white hover:bg-black h-12 uppercase tracking-widest text-sm" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create Admin Account'}
                </Button>
            </form>
        </div>
    </div>
  );
}
