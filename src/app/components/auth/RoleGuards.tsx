import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserRole } from '../../../hooks/useUserRole';
import { Loader2 } from 'lucide-react';

export function AdminGuard() {
    const { role, loading, actualRole, profile } = useUserRole();
    const location = useLocation();

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!profile || profile.status === 'suspended') {
        return <div className="h-screen flex items-center justify-center text-red-600 font-display">Account Suspended</div>;
    }

    // Strict Role Check (View As)
    if (role !== 'admin') {
        // Redirect based on current View Role
        if (role === 'student') return <Navigate to="/student/dashboard" replace />;
        return <Navigate to="/shop" replace />;
    }

    return <Outlet />;
}

export function StudentGuard() {
    const { role, loading, profile } = useUserRole();
    const location = useLocation();

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!profile || profile.status === 'suspended') {
        return <div className="h-screen flex items-center justify-center text-red-600 font-display">Account Suspended</div>;
    }

    if (role !== 'student' && role !== 'admin') {
        return <Navigate to="/shop" replace />;
    }

    return <Outlet />;
}

export function CustomerGuard() {
    const { role, loading, profile } = useUserRole();
    
    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (profile?.status === 'suspended') {
        return <div className="h-screen flex items-center justify-center text-red-600 font-display">Account Suspended</div>;
    }

    if (!profile) return <Navigate to="/login" replace />;

    return <Outlet />;
}
