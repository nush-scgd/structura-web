import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../lib/db';
import type { Profile, Course, AcademyEnrollment } from '../../../lib/db';
import { generateId } from '../../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, ShieldAlert, GraduationCap, Mail, Key, FileText } from 'lucide-react';

// Extended StudentRecord type
type InviteStatus = 'not_sent' | 'sent' | 'accepted' | 'expired';
type AdminStatus = 'waiting_list' | 'invited' | 'invoice_sent' | 'payment_pending' | 'partial_payment' | 'payments_complete' | 'enrolled' | 'cancelled' | 'refunded';

interface StudentRecord extends Profile {
    phoneNumber?: string;
    idNumber?: string;
    dateOfBirth?: string;
    address?: string;
    highestEducation?: string;
    schoolName?: string;
    notes?: string;
    inviteStatus: InviteStatus;
    adminStatus: AdminStatus;
    archivedAt: string | null;
    archivedReason: string;
}

export default function AdminStudents() {
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<StudentRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AdminStatus | ''>('');
    const [showArchived, setShowArchived] = useState(false);

    // Form State for Student
    const [formData, setFormData] = useState<Partial<StudentRecord>>({
        fullName: '',
        email: '',
        phoneNumber: '',
        idNumber: '',
        dateOfBirth: '',
        address: '',
        highestEducation: '',
        schoolName: '',
        notes: '',
        role: 'student',
        status: 'active',
        inviteStatus: 'not_sent',
        adminStatus: 'waiting_list'
    });

    // Form State for Assignment
    const [assignData, setAssignData] = useState({
        courseId: '',
        paymentStatus: 'pending' as any,
        enrolmentStatus: 'enrolled' as any
    });

    // Helper functions
    const hasDbMethod = (methodName: string): boolean => {
        return typeof (db as any)[methodName] === 'function';
    };

    const getSafeArray = <T,>(arr: any): T[] => {
        return Array.isArray(arr) ? arr : [];
    };

    const getSafeString = (val: any): string => {
        return typeof val === 'string' ? val : '';
    };

    const calculateAge = (dateOfBirth?: string): number | undefined => {
        if (!dateOfBirth) return undefined;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return isNaN(age) ? undefined : age;
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load profiles
            let pData: Profile[] = [];
            if (hasDbMethod('getProfiles')) {
                pData = await (db as any).getProfiles();
            } else if (hasDbMethod('listProfiles')) {
                pData = await (db as any).listProfiles();
            }
            pData = getSafeArray<Profile>(pData);

            // Load courses
            let cData: Course[] = [];
            if (hasDbMethod('getCourses')) {
                cData = await (db as any).getCourses();
            }
            cData = getSafeArray<Course>(cData);

            // Load enrollments
            let eData: AcademyEnrollment[] = [];
            if (hasDbMethod('getAcademyEnrollments')) {
                eData = await (db as any).getAcademyEnrollments();
            }
            eData = getSafeArray<AcademyEnrollment>(eData);

            // Normalize to StudentRecord
            const normalized: StudentRecord[] = pData
                .filter(p => p.role === 'student')
                .map(p => ({
                    ...p,
                    phoneNumber: p.phoneNumber ?? (p as any).phone ?? '',
                    idNumber: (p as any).idNumber ?? '',
                    dateOfBirth: (p as any).dateOfBirth ?? '',
                    address: (p as any).address ?? '',
                    highestEducation: (p as any).highestEducation ?? '',
                    schoolName: (p as any).schoolName ?? '',
                    notes: (p as any).notes ?? '',
                    inviteStatus: (p as any).inviteStatus ?? 'not_sent',
                    adminStatus: (p as any).adminStatus ?? 'waiting_list',
                    archivedAt: (p as any).archivedAt ?? null,
                    archivedReason: (p as any).archivedReason ?? ''
                }));

            setStudents(normalized);
            setCourses(cData);
            setEnrollments(eData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load student data');
            setStudents([]);
            setCourses([]);
            setEnrollments([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            // Filter by archived status
            const isArchived = student.archivedAt !== null;
            if (!showArchived && isArchived) return false;
            if (showArchived && !isArchived) return false;

            // Filter by admin status
            if (statusFilter && student.adminStatus !== statusFilter) return false;

            // Filter by search term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    student.fullName?.toLowerCase().includes(term) ||
                    student.email?.toLowerCase().includes(term) ||
                    student.phoneNumber?.toLowerCase().includes(term) ||
                    student.idNumber?.toLowerCase().includes(term)
                );
            }

            return true;
        });
    }, [students, searchTerm, statusFilter, showArchived]);

    const handleEdit = (student: StudentRecord) => {
        setCurrentStudent(student);
        setFormData({
            ...student,
            fullName: student.fullName || '',
            email: student.email || '',
            phoneNumber: student.phoneNumber || '',
            idNumber: student.idNumber || '',
            dateOfBirth: student.dateOfBirth || '',
            address: student.address || '',
            highestEducation: student.highestEducation || '',
            schoolName: student.schoolName || '',
            notes: student.notes || '',
            inviteStatus: student.inviteStatus,
            adminStatus: student.adminStatus,
            status: student.status,
            role: student.role
        });
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setCurrentStudent(null);
        setFormData({
            fullName: '',
            email: '',
            phoneNumber: '',
            idNumber: '',
            dateOfBirth: '',
            address: '',
            highestEducation: '',
            schoolName: '',
            notes: '',
            role: 'student',
            status: 'active',
            inviteStatus: 'not_sent',
            adminStatus: 'waiting_list'
        });
        setIsDialogOpen(true);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!hasDbMethod('saveProfile')) {
            toast.error('Student save functionality is not available');
            return;
        }

        try {
            const id = currentStudent?.id || generateId();
            const student: StudentRecord = {
                id,
                fullName: getSafeString(formData.fullName),
                email: getSafeString(formData.email).toLowerCase(),
                phoneNumber: getSafeString(formData.phoneNumber),
                idNumber: getSafeString(formData.idNumber),
                dateOfBirth: getSafeString(formData.dateOfBirth),
                address: getSafeString(formData.address),
                highestEducation: getSafeString(formData.highestEducation),
                schoolName: getSafeString(formData.schoolName),
                notes: getSafeString(formData.notes),
                role: 'student',
                status: (formData.status as 'active' | 'suspended') || 'active',
                inviteStatus: (formData.inviteStatus as InviteStatus) || 'not_sent',
                adminStatus: (formData.adminStatus as AdminStatus) || 'waiting_list',
                archivedAt: currentStudent?.archivedAt ?? null,
                archivedReason: currentStudent?.archivedReason ?? '',
                createdAt: currentStudent?.createdAt || new Date().toISOString()
            };

            await (db as any).saveProfile(student);
            toast.success(currentStudent ? 'Student updated' : 'Student created');
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save student');
        }
    };

    const handleSuspend = async (student: StudentRecord) => {
        if (!hasDbMethod('saveProfile')) {
            toast.error('Unable to update student status');
            return;
        }

        const newStatus = student.status === 'suspended' ? 'active' : 'suspended';
        if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this student?`)) {
            return;
        }

        try {
            const updated: StudentRecord = { ...student, status: newStatus as 'active' | 'suspended' };
            await (db as any).saveProfile(updated);
            toast.success(`Student ${newStatus}`);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update student status');
        }
    };

    const handleArchive = async (student: StudentRecord) => {
        if (!hasDbMethod('saveProfile')) {
            toast.error('Archive functionality is not available');
            return;
        }

        if (!confirm('Are you sure you want to archive this student?')) {
            return;
        }

        try {
            const archived: StudentRecord = {
                ...student,
                status: 'suspended',
                archivedAt: new Date().toISOString(),
                archivedReason: 'Archived from student manager'
            };
            await (db as any).saveProfile(archived);
            toast.success('Student archived');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to archive student');
        }
    };

    const handleSendInvite = async (student: StudentRecord) => {
        try {
            let inviteSent = false;

            if (hasDbMethod('inviteStudent')) {
                await (db as any).inviteStudent(student.id);
                inviteSent = true;
            } else if (hasDbMethod('sendStudentInvite')) {
                await (db as any).sendStudentInvite(student.id, student.email);
                inviteSent = true;
            }

            if (!inviteSent) {
                toast.info('Invite flow is not wired yet');
                return;
            }

            // Update invite status if saveProfile is available
            if (hasDbMethod('saveProfile')) {
                const updated: StudentRecord = { ...student, inviteStatus: 'sent' };
                await (db as any).saveProfile(updated);
            }

            toast.success('Invite sent to student');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to send invite');
        }
    };

    const handleResetPassword = async (student: StudentRecord) => {
        try {
            if (hasDbMethod('sendPasswordReset')) {
                await (db as any).sendPasswordReset(student.email);
                toast.success('Password reset email sent');
            } else {
                toast.info('Password reset flow is not wired yet');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to send password reset');
        }
    };

    const handleEmailInvoice = async (student: StudentRecord) => {
        try {
            if (hasDbMethod('sendStudentInvoice')) {
                await (db as any).sendStudentInvoice(student.id, student.email);
                toast.success('Invoice email sent');
            } else {
                toast.info('Invoice email flow is not wired yet');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to send invoice');
        }
    };

    const openAssignDialog = (student: StudentRecord) => {
        setCurrentStudent(student);
        setAssignData({ courseId: '', paymentStatus: 'pending', enrolmentStatus: 'enrolled' });
        setIsAssignOpen(true);
    };

    const handleAssignCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStudent || !assignData.courseId) return;

        if (!hasDbMethod('saveAcademyEnrollment')) {
            toast.error('Course assignment is not available');
            return;
        }

        try {
            const course = courses.find(c => c.id === assignData.courseId);
            const enrollment: AcademyEnrollment = {
                id: generateId(),
                courseId: assignData.courseId,
                studentId: currentStudent.id,
                studentName: currentStudent.fullName,
                studentEmail: currentStudent.email,
                status: assignData.enrolmentStatus as any,
                paymentStatus: assignData.paymentStatus as any,
                amountPaid: assignData.paymentStatus === 'paid' ? (course?.price || 0) : 0,
                currency: course?.currency || 'USD',
                enrolledAt: new Date().toISOString()
            };

            await (db as any).saveAcademyEnrollment(enrollment);

            // Update student admin status based on payment
            if (hasDbMethod('saveProfile')) {
                const newAdminStatus: AdminStatus = assignData.paymentStatus === 'paid' ? 'payments_complete' : 'invoice_sent';
                const updated: StudentRecord = { ...currentStudent, adminStatus: newAdminStatus };
                await (db as any).saveProfile(updated);
            }

            toast.success('Student enrolled in course');
            setIsAssignOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to enroll student');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading students...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-charcoal mb-1">Student Manager</h1>
                <p className="text-sm text-gray-600">Manage academy students, enrollments, and communication</p>
            </div>

            {/* Filter & Search Panel */}
            <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Search Students</Label>
                        <Input
                            placeholder="Name, email, phone, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Admin Status</Label>
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as AdminStatus | '')}>
                            <SelectTrigger className="text-sm">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Statuses</SelectItem>
                                <SelectItem value="waiting_list">Waiting List</SelectItem>
                                <SelectItem value="invited">Invited</SelectItem>
                                <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                                <SelectItem value="payment_pending">Payment Pending</SelectItem>
                                <SelectItem value="partial_payment">Partial Payment</SelectItem>
                                <SelectItem value="payments_complete">Payments Complete</SelectItem>
                                <SelectItem value="enrolled">Enrolled</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button
                            variant={showArchived ? 'default' : 'outline'}
                            onClick={() => setShowArchived(!showArchived)}
                            className="flex-1"
                            size="sm"
                        >
                            {showArchived ? 'Showing Archived' : 'Show Archived'}
                        </Button>
                        <Button onClick={handleCreate} className="bg-charcoal text-white hover:bg-black" size="sm">
                            <Plus className="w-4 h-4 mr-1" /> New
                        </Button>
                    </div>
                </div>
                {filteredStudents.length > 0 && (
                    <p className="text-xs text-gray-600">
                        Showing {filteredStudents.length} of {students.length} students
                    </p>
                )}
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>{students.length === 0 ? 'No students yet' : 'No students match your filters'}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="text-xs font-semibold">Student</TableHead>
                                <TableHead className="text-xs font-semibold">Account</TableHead>
                                <TableHead className="text-xs font-semibold">Admin Status</TableHead>
                                <TableHead className="text-xs font-semibold">Enrollments</TableHead>
                                <TableHead className="text-xs font-semibold">Details</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student) => {
                                const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
                                const age = calculateAge(student.dateOfBirth);
                                const isArchived = student.archivedAt !== null;

                                return (
                                    <TableRow key={student.id} className={isArchived ? 'bg-gray-50/50' : ''}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-sm">{student.fullName}</div>
                                                <div className="text-xs text-gray-500">{student.email}</div>
                                                {student.phoneNumber && (
                                                    <div className="text-xs text-gray-500">{student.phoneNumber}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={student.status === 'active' ? 'default' : 'secondary'}
                                                    className={
                                                        student.status === 'active'
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                                                    }
                                                >
                                                    {student.status}
                                                </Badge>
                                                {student.inviteStatus !== 'not_sent' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {student.inviteStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                {student.adminStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {studentEnrollments.length > 0 ? (
                                                    studentEnrollments.map(e => {
                                                        const c = courses.find(c => c.id === e.courseId);
                                                        return (
                                                            <span
                                                                key={e.id}
                                                                className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200"
                                                            >
                                                                {c?.title || 'Course'} • {e.status}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">None</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                {student.idNumber && <div className="text-gray-600">ID: {student.idNumber}</div>}
                                                {age && <div className="text-gray-600">Age: {age}</div>}
                                                {student.schoolName && <div className="text-gray-600">{student.schoolName}</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(student)}
                                                    title="Edit"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit2 className="w-4 h-4 text-gray-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openAssignDialog(student)}
                                                    title="Assign Course"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <GraduationCap className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSendInvite(student)}
                                                    title="Send Invite"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Mail className="w-4 h-4 text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleResetPassword(student)}
                                                    title="Send Password Reset"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Key className="w-4 h-4 text-indigo-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEmailInvoice(student)}
                                                    title="Email Invoice"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <FileText className="w-4 h-4 text-amber-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSuspend(student)}
                                                    title={student.status === 'suspended' ? 'Activate' : 'Suspend'}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ShieldAlert
                                                        className={`w-4 h-4 ${
                                                            student.status === 'suspended' ? 'text-green-500' : 'text-orange-500'
                                                        }`}
                                                    />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleArchive(student)}
                                                    title="Archive"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Create/Edit Student Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveStudent} className="space-y-4">
                        {/* Basic Information */}
                        <div className="space-y-3 pb-3 border-b">
                            <h3 className="font-semibold text-sm text-charcoal">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Full Name *</Label>
                                    <Input
                                        value={formData.fullName || ''}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Email Address *</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        type="email"
                                        required
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Phone Number</Label>
                                    <Input
                                        value={formData.phoneNumber || ''}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">ID Number</Label>
                                    <Input
                                        value={formData.idNumber || ''}
                                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                        placeholder="Student ID"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-3 pb-3 border-b">
                            <h3 className="font-semibold text-sm text-charcoal">Personal Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Date of Birth</Label>
                                    <Input
                                        value={formData.dateOfBirth || ''}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        type="date"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Address</Label>
                                    <Input
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Street address"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Education */}
                        <div className="space-y-3 pb-3 border-b">
                            <h3 className="font-semibold text-sm text-charcoal">Education</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Highest Education</Label>
                                    <Select
                                        value={formData.highestEducation || ''}
                                        onValueChange={(val) => setFormData({ ...formData, highestEducation: val })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="Select level..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high_school">High School</SelectItem>
                                            <SelectItem value="diploma">Diploma</SelectItem>
                                            <SelectItem value="associate">Associate</SelectItem>
                                            <SelectItem value="bachelor">Bachelor's</SelectItem>
                                            <SelectItem value="master">Master's</SelectItem>
                                            <SelectItem value="phd">PhD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">School / Institution</Label>
                                    <Input
                                        value={formData.schoolName || ''}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        placeholder="School name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-3 pb-3 border-b">
                            <h3 className="font-semibold text-sm text-charcoal">Status</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Account Status</Label>
                                    <Select
                                        value={formData.status || 'active'}
                                        onValueChange={(val) => setFormData({ ...formData, status: val as any })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Admin Status</Label>
                                    <Select
                                        value={formData.adminStatus || 'waiting_list'}
                                        onValueChange={(val) => setFormData({ ...formData, adminStatus: val as AdminStatus })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="waiting_list">Waiting List</SelectItem>
                                            <SelectItem value="invited">Invited</SelectItem>
                                            <SelectItem value="invoice_sent">Invoice Sent</SelectItem>
                                            <SelectItem value="payment_pending">Payment Pending</SelectItem>
                                            <SelectItem value="partial_payment">Partial Payment</SelectItem>
                                            <SelectItem value="payments_complete">Payments Complete</SelectItem>
                                            <SelectItem value="enrolled">Enrolled</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="refunded">Refunded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Invite Status</Label>
                                    <Select
                                        value={formData.inviteStatus || 'not_sent'}
                                        onValueChange={(val) => setFormData({ ...formData, inviteStatus: val as InviteStatus })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not_sent">Not Sent</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                            <SelectItem value="accepted">Accepted</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Internal Notes</Label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add any internal notes about this student..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/20"
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-charcoal text-white hover:bg-black">
                                Save Student
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Course Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Assign Course to {currentStudent?.fullName}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssignCourse} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Select Course *</Label>
                            <Select
                                value={assignData.courseId}
                                onValueChange={(val) => setAssignData({ ...assignData, courseId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a course..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.length === 0 ? (
                                        <SelectItem value="" disabled>
                                            No courses available
                                        </SelectItem>
                                    ) : (
                                        courses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 pb-3 border-b">
                            <h3 className="font-semibold text-sm">Course Status</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Academic Status</Label>
                                    <Select
                                        value={assignData.enrolmentStatus}
                                        onValueChange={(val) => setAssignData({ ...assignData, enrolmentStatus: val })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enrolled">Enrolled</SelectItem>
                                            <SelectItem value="requested">Requested</SelectItem>
                                            <SelectItem value="attended">Attended</SelectItem>
                                            <SelectItem value="assignment_completed">Assignment Completed</SelectItem>
                                            <SelectItem value="assignment_passed">Assignment Passed</SelectItem>
                                            <SelectItem value="late_submission">Late Submission</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Payment Status</Label>
                                    <Select
                                        value={assignData.paymentStatus}
                                        onValueChange={(val) => setAssignData({ ...assignData, paymentStatus: val })}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="not_required">Not Required</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="partial_payment">Partial Payment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-charcoal text-white hover:bg-black"
                                disabled={!assignData.courseId}
                            >
                                Assign Course
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}