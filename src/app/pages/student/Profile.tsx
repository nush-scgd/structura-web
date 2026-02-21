import React, { useState, useEffect } from 'react';
import { db, Profile } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Phone, Save, Loader2 } from 'lucide-react';

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Mock User ID - in real app would come from auth context
  const userId = "student_123";

  useEffect(() => {
    async function loadProfile() {
      // Try to fetch existing profile
      let data = await db.getProfile(userId);
      
      // If no profile exists (first time), create a mock one for the demo
      if (!data) {
        data = {
            id: userId,
            fullName: "Student Name",
            email: "student@structura.academy",
            phone: "+1 (555) 123-4567",
            role: 'student',
            createdAt: new Date().toISOString()
        };
        // Save it so next time it exists
        await db.saveProfile(data);
      }
      
      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      await db.saveProfile(profile);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400 font-serif animate-pulse">Loading Profile...</div>;
  if (!profile) return <div className="p-12 text-center text-red-500">Error loading profile.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display text-charcoal">My Profile</h1>
        <p className="text-gray-500 font-serif mt-2">Manage your personal information and contact details.</p>
      </div>

      <div className="bg-white border border-gray-100 p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-charcoal text-white flex items-center justify-center font-display text-2xl">
                    {profile.fullName.charAt(0)}
                </div>
                <div>
                    <h2 className="text-xl font-display text-charcoal">{profile.fullName}</h2>
                    <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                            id="fullName" 
                            className="pl-10" 
                            value={profile.fullName} 
                            onChange={e => setProfile({...profile, fullName: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                            id="email" 
                            type="email" 
                            className="pl-10 bg-gray-50" 
                            value={profile.email} 
                            readOnly 
                            disabled
                        />
                    </div>
                    <p className="text-[10px] text-gray-400">Email cannot be changed.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                            id="phone" 
                            className="pl-10" 
                            value={profile.phone || ''} 
                            onChange={e => setProfile({...profile, phone: e.target.value})}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-charcoal text-white min-w-[140px]">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
