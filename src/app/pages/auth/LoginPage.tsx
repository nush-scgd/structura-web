import React from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = React.useState<'customer' | 'student' | 'admin'>('customer');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // In a real app, we'd verify if the user actually has the role they selected.
      // For now, we trust the selection to direct them to the right portal.
      
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/account');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-ivory p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link to="/" className="text-4xl font-display font-semibold tracking-tighter block mb-4 text-charcoal">STRUCTURA</Link>
          <p className="text-gray-500 font-serif italic">Login to your account</p>
        </div>

        {/* Role Selector */}
        <div className="flex justify-center space-x-8 mb-10">
          {(['customer', 'student', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`pb-2 text-xs uppercase tracking-[0.2em] transition-all duration-300 ${
                role === r 
                  ? 'border-b border-gold text-charcoal font-medium' 
                  : 'border-b border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="bg-white p-10 shadow-xl border-t-2 border-gold/30">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm border border-red-100 font-serif">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="luxury-input"
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
               <div className="flex justify-between mb-2">
                <label className="block text-xs uppercase tracking-widest text-gray-500">Password</label>
                <Link to="/forgot-password" className="text-xs text-gold hover:text-charcoal transition-colors">Forgot?</Link>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="luxury-input"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full py-6 text-sm tracking-widest" isLoading={loading}>
              SIGN IN
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500 font-serif">
            Don't have an account? <Link to="/signup" className="text-charcoal border-b border-gray-300 hover:border-gold transition-colors pb-0.5">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
