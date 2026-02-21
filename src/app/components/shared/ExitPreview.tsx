import React from 'react';
import { useUserRole } from '../../../hooks/useUserRole';
import { useAuthStore } from '../../../lib/auth-store';
import { LogOut } from 'lucide-react';

export function ExitPreview() {
    const { actualRole, role } = useUserRole();
    const { setViewAs } = useAuthStore();

    if (actualRole !== 'admin') return null;
    if (role === 'admin') return null;

    const handleExit = () => {
        setViewAs(null);
        window.location.href = '/admin/dashboard';
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
                onClick={handleExit}
                className="bg-charcoal text-white px-5 py-3 shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-gold transition-all hover:scale-105 border border-white/10"
            >
                <LogOut className="w-4 h-4" />
                Exit Preview
            </button>
        </div>
    );
}
