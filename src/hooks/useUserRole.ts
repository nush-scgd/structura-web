import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import type { Profile } from '../lib/db';
import { useAuthStore } from '../lib/auth-store';

export type UserRole = 'admin' | 'student' | 'customer';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const viewAs = useAuthStore((state) => state.viewAs);

  useEffect(() => {
    let mounted = true;

    async function checkRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) {
            setRole(null);
            setActualRole(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const email = session.user.email;
        const isAdminOverride = email === 'admin@structurahair.co.za';
        
        let userProfile = await db.getProfile(session.user.id);

        // Enforce Admin Override
        if (isAdminOverride) {
            if (!userProfile) {
                userProfile = {
                    id: session.user.id,
                    email: email!,
                    fullName: 'Super Admin',
                    role: 'admin',
                    status: 'active',
                    createdAt: new Date().toISOString()
                };
                await db.saveProfile(userProfile);
            } else if (userProfile.role !== 'admin') {
                userProfile.role = 'admin';
                await db.saveProfile(userProfile);
            }
        }

        // If still no profile (and not super admin), check if we should fetch it or create it on login? 
        // Typically signup creates it. If missing, maybe just treat as guest/customer.
        if (!userProfile) {
            // Treat as new customer or handle error?
            // For now, let's just return null role if no profile found, effectively logging them out or treating as guest.
             if (mounted) {
                setRole(null);
                setActualRole(null);
                setProfile(null);
                setLoading(false);
             }
             return;
        }

        const realRole = userProfile.role as UserRole || 'customer';
        
        if (mounted) {
            setProfile(userProfile);
            setActualRole(realRole);

            // Apply "View As" logic
            if (realRole === 'admin' && viewAs) {
                setRole(viewAs);
            } else if (realRole === 'student' && (viewAs === 'student' || viewAs === 'customer')) {
                setRole(viewAs);
            } else {
                setRole(realRole);
            }
            
            setLoading(false);
        }
      } catch (e) {
        console.error("Role check failed", e);
        if (mounted) setLoading(false);
      }
    }

    checkRole();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        checkRole();
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [viewAs]); 

  return { role, loading, actualRole, profile };
}
