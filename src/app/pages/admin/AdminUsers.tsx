import React, { useState, useEffect } from 'react';
import { db, Profile, AdminInvite } from '../../../lib/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash, Copy, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { generateId } from '../../../lib/utils';

export default function AdminUsers() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<AdminInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [profiles, allInvites] = await Promise.all([
            db.getProfiles(),
            db.getAdminInvites()
        ]);
        setUsers(profiles);
        setInvites(allInvites.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date()));
        setLoading(false);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const invite = await db.createAdminInvite(inviteEmail);
            const link = `${window.location.origin}/invite/${invite.token}`;
            setGeneratedLink(link);
            toast.success('Invite link generated');
            loadData(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate invite');
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success('Link copied to clipboard');
        setGeneratedLink('');
        setIsInviteOpen(false);
        setInviteEmail('');
    };

    const handleRoleChange = async (user: Profile, newRole: string) => {
        if (user.email === 'admin@structurahair.co.za') {
            toast.error("Cannot change role of Super Admin");
            return;
        }

        const updated = { ...user, role: newRole as any };
        await db.saveProfile(updated);
        setUsers(users.map(u => u.id === user.id ? updated : u));
        toast.success(`Role updated to ${newRole}`);
    };

    const handleStatusToggle = async (user: Profile) => {
        if (user.email === 'admin@structurahair.co.za') {
            toast.error("Cannot suspend Super Admin");
            return;
        }

        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        const updated = { ...user, status: newStatus as any };
        await db.saveProfile(updated);
        setUsers(users.map(u => u.id === user.id ? updated : u));
        toast.success(`User ${newStatus}`);
    };

    if (loading) return <div className="p-8">Loading users...</div>;

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-medium text-charcoal">User Management</h1>
                    <p className="text-sm text-gray-500 font-serif">Manage platform access and roles.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => loadData()} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-charcoal text-white hover:bg-black">
                                <Plus className="w-4 h-4 mr-2" /> Invite Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite New Administrator</DialogTitle>
                            </DialogHeader>
                            {!generatedLink ? (
                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input 
                                            type="email" 
                                            value={inviteEmail} 
                                            onChange={e => setInviteEmail(e.target.value)} 
                                            required 
                                            placeholder="admin@structurahair.co.za"
                                        />
                                        <p className="text-xs text-gray-500">
                                            An invite link will be generated for this email.
                                        </p>
                                    </div>
                                    <Button type="submit" className="w-full">Generate Invite Link</Button>
                                </form>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="bg-green-50 text-green-700 p-4 rounded text-sm mb-4">
                                        Invite link ready! Share this URL securely.
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={generatedLink} className="font-mono text-xs bg-gray-50" />
                                        <Button size="icon" onClick={copyLink}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-400">Link expires in 7 days.</p>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Active Invites */}
            {invites.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Pending Invites
                    </h3>
                    <div className="space-y-2">
                        {invites.map(invite => (
                            <div key={invite.id} className="flex justify-between items-center text-sm bg-white/50 p-2 rounded">
                                <span className="font-medium text-yellow-900">{invite.email}</span>
                                <span className="text-xs text-yellow-700">Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>User</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                            const isSuperAdmin = user.email === 'admin@structurahair.co.za';
                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {user.fullName}
                                                {isSuperAdmin && <ShieldCheck className="w-3 h-3 text-gold" title="Super Admin" />}
                                            </div>
                                            <div className="text-xs text-gray-400">{user.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={user.role} 
                                            onValueChange={(val) => handleRoleChange(user, val)}
                                            disabled={isSuperAdmin}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-xs uppercase tracking-wider">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="student">Student</SelectItem>
                                                <SelectItem value="customer">Customer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className={user.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                                            {user.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleStatusToggle(user)}
                                            disabled={isSuperAdmin}
                                            className={user.status === 'suspended' ? 'text-green-600' : 'text-orange-500'}
                                        >
                                            {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
