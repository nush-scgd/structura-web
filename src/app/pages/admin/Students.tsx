import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/db';
import type { Profile, Course, AcademyEnrollment, PlatformSettings } from '../../../lib/db';
import { generateId } from '../../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, ShieldAlert, GraduationCap, CheckCircle } from 'lucide-react';

export default function AdminStudents() {
    const [students, setStudents] = useState<Profile[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Profile | null>(null);

    // Form State for Student
    const [formData, setFormData] = useState<Partial<Profile>>({
        fullName: '',
        email: '',
        role: 'student',
        status: 'active'
    });

    // Form State for Assignment
    const [assignData, setAssignData] = useState({
        courseId: '',
        paymentStatus: 'paid',
        enrolmentStatus: 'enrolled'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [pData, cData, eData] = await Promise.all([
            db.getProfiles(),
            db.getCourses(),
            db.getAcademyEnrollments()
        ]);
        setStudents(pData.filter(p => p.role === 'student'));
        setCourses(cData);
        setEnrollments(eData);
        setLoading(false);
    };

    const handleEdit = (student: Profile) => {
        setCurrentStudent(student);
        setFormData(student);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setCurrentStudent(null);
        setFormData({
            fullName: '',
            email: '',
            role: 'student',
            status: 'active'
        });
        setIsDialogOpen(true);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const id = currentStudent?.id || generateId();
            const profile: Profile = {
                id,
                fullName: formData.fullName || '',
                email: formData.email || '',
                role: 'student',
                status: formData.status as 'active' | 'suspended' || 'active',
                createdAt: currentStudent?.createdAt || new Date().toISOString()
            };

            await db.saveProfile(profile);
            toast.success(currentStudent ? 'Student updated' : 'Student created');
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save student');
        }
    };

    const handleSuspend = async (student: Profile) => {
        if (confirm(`Are you sure you want to ${student.status === 'suspended' ? 'activate' : 'suspend'} this student?`)) {
            const updated = { ...student, status: student.status === 'suspended' ? 'active' : 'suspended' } as Profile;
            await db.saveProfile(updated);
            loadData();
            toast.success(`Student ${updated.status}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            await db.deleteProfile(id);
            loadData();
            toast.success('Student deleted');
        }
    };

    const openAssignDialog = (student: Profile) => {
        setCurrentStudent(student);
        setAssignData({ courseId: '', paymentStatus: 'paid', enrolmentStatus: 'enrolled' });
        setIsAssignOpen(true);
    };

    const handleAssignCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStudent || !assignData.courseId) return;

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

            await db.saveAcademyEnrollment(enrollment);
            toast.success('Student enrolled in course');
            setIsAssignOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to enroll student');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-display font-medium text-charcoal">Students</h1>
                <Button onClick={handleCreate} className="bg-charcoal text-white hover:bg-black">
                    <Plus className="w-4 h-4 mr-2" /> Add Student
                </Button>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enrollments</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => {
                            const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
                            return (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{student.fullName}</div>
                                            <div className="text-xs text-gray-400">{student.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={student.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                                            {student.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {studentEnrollments.length > 0 ? (
                                                studentEnrollments.map(e => {
                                                    const c = courses.find(c => c.id === e.courseId);
                                                    return (
                                                        <span key={e.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                                                            {c?.title || 'Unknown Course'} ({e.status})
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No enrollments</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => openAssignDialog(student)} title="Assign Course">
                                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(student)} title="Edit">
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleSuspend(student)} title={student.status === 'suspended' ? 'Activate' : 'Suspend'}>
                                                <ShieldAlert className={`w-4 h-4 ${student.status === 'suspended' ? 'text-green-500' : 'text-orange-500'}`} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id)} title="Delete" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Student Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveStudent} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input 
                                value={formData.fullName} 
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input 
                                value={formData.email} 
                                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                                type="email"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(val) => setFormData({...formData, status: val as any})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit">Save Student</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Course Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Course to {currentStudent?.fullName}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssignCourse} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Course</Label>
                            <Select 
                                value={assignData.courseId} 
                                onValueChange={(val) => setAssignData({...assignData, courseId: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a course..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Status</Label>
                                <Select 
                                    value={assignData.paymentStatus} 
                                    onValueChange={(val) => setAssignData({...assignData, paymentStatus: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="not_required">Not Required</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Enrolment Status</Label>
                                <Select 
                                    value={assignData.enrolmentStatus} 
                                    onValueChange={(val) => setAssignData({...assignData, enrolmentStatus: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="enrolled">Enrolled</SelectItem>
                                        <SelectItem value="requested">Requested</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit">Assign Course</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}