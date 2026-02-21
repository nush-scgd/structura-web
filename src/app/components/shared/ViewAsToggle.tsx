import React from 'react';
import { useUserRole } from '../../../hooks/useUserRole';
import { useAuthStore } from '../../../lib/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Eye } from 'lucide-react';

export function ViewAsToggle() {
    const { actualRole } = useUserRole();
    const { viewAs, setViewAs } = useAuthStore();

    if (actualRole !== 'admin') return null;

    const handleChange = (val: string) => {
        setViewAs(val as any);
        // Force reload/redirect to ensure guards pick up the change and route correctly
        if (val === 'admin') window.location.href = '/admin/dashboard';
        if (val === 'student') window.location.href = '/student/dashboard';
        if (val === 'customer') window.location.href = '/shop';
    };

    const currentView = viewAs || actualRole;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">
            <Eye className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400 uppercase tracking-widest text-[10px] hidden sm:inline">View:</span>
            <Select value={currentView} onValueChange={handleChange}>
                <SelectTrigger className="h-6 text-xs bg-transparent border-none shadow-none focus:ring-0 w-auto min-w-[80px] p-0 text-charcoal font-medium uppercase tracking-wider">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {actualRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                    {(actualRole === 'admin' || actualRole === 'student') && <SelectItem value="student">Student</SelectItem>}
                    <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
