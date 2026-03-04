import React, { useState, useEffect } from 'react';
import { db, AcademyEnrollment, Course, CourseSession } from '../../../../lib/db';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { toast } from 'sonner';
import { Check, X, Award, Eye, Mail, Download, Printer } from 'lucide-react';
import { Label } from '../../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../../ui/dialog";
import { cn } from '../../../../lib/utils';

export function AssessmentManager() {
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [filterCourse, setFilterCourse] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eData, cData, sData] = await Promise.all([
      db.getAcademyEnrollments(),
      db.getCourses(),
      db.getSessions()
    ]);
    // Filter to confirmed or completed only
    setEnrollments(eData.filter(e => e.status !== 'dropped' && e.status !== 'pending'));
    setCourses(cData);
    setSessions(sData);
  };

  const handleGrade = async (enrollment: AcademyEnrollment, passed: boolean, grade?: string) => {
    const updated = {
      ...enrollment,
      passed,
      grade: grade || enrollment.grade,
      status: passed ? 'completed' : 'confirmed' as const // Mark completed if passed
    };
    await db.saveAcademyEnrollment(updated);
    await loadData();
    toast.success(`Student ${passed ? 'passed' : 'failed'}`);
  };

  const markCertificateSent = async (enrollment: AcademyEnrollment) => {
    const updated = {
      ...enrollment,
      certificateIssued: true,
      certificateIssuedAt: new Date().toISOString()
    };
    await db.saveAcademyEnrollment(updated);
    await loadData();
  };

  const filtered = filterCourse === 'all'
    ? enrollments
    : enrollments.filter(e => e.courseId === filterCourse);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-lg font-display text-charcoal">Assessments & Certificates</h2>
        <div className="w-64">
           <Select onValueChange={setFilterCourse} defaultValue="all">
             <SelectTrigger>
               <SelectValue placeholder="Filter by Course" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Courses</SelectItem>
               {courses.map(c => (
                   <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Course</th>
              <th className="p-4">Result</th>
              <th className="p-4">Certificate</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((enrollment) => {
               const course = courses.find(c => c.id === enrollment.courseId);
               return (
                 <tr key={enrollment.id} className="hover:bg-gray-50/50">
                   <td className="p-4 font-medium">{enrollment.studentName}</td>
                   <td className="p-4">{course?.title}</td>
                   <td className="p-4">
                     {enrollment.passed === true ? (
                       <span className="inline-flex items-center text-green-600 font-medium">
                         <Check className="w-4 h-4 mr-1" /> Passed
                       </span>
                     ) : enrollment.passed === false ? (
                       <span className="inline-flex items-center text-red-600 font-medium">
                         <X className="w-4 h-4 mr-1" /> Failed
                       </span>
                     ) : (
                       <span className="text-gray-400">Pending</span>
                     )}
                   </td>
                   <td className="p-4">
                      {enrollment.certificateIssued ? (
                        <div className="flex items-center text-gold">
                           <Award className="w-4 h-4 mr-1" /> Issued
                           <span className="text-xs text-gray-400 ml-2">
                             {new Date(enrollment.certificateIssuedAt!).toLocaleDateString()}
                           </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                   </td>
                   <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                         <GradingDialog 
                            student={enrollment} 
                            courseName={course?.title || ''} 
                            onSave={handleGrade} 
                         />
                         
                         {enrollment.passed && course && (
                            <CertificateFlowDialog 
                                enrollment={enrollment}
                                course={course}
                                onSent={markCertificateSent}
                            />
                         )}
                      </div>
                   </td>
                 </tr>
               );
            })}
             {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">No active students to assess.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradingDialog({ student, courseName, onSave }: { student: AcademyEnrollment, courseName: string, onSave: (s: AcademyEnrollment, passed: boolean, grade?: string) => Promise<void> }) {
    const [grade, setGrade] = useState(student.grade || '');
    const [passed, setPassed] = useState(student.passed || false);
    const [open, setOpen] = useState(false);

    const handleSave = async () => {
        await onSave(student, passed, grade);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">Grade</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Grade Student</DialogTitle>
                    <DialogDescription>
                        Enter results for {student.studentName} in {courseName}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <Label>Passed?</Label>
                        <Switch checked={passed} onCheckedChange={setPassed} />
                    </div>
                    <div className="space-y-2">
                        <Label>Grade / Score (Optional)</Label>
                        <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 95%, A, Distinction" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} className="bg-charcoal text-white">Save Result</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CertificateFlowDialog({ 
    enrollment, 
    course, 
    onSent 
}: { 
    enrollment: AcademyEnrollment, 
    course: Course,
    onSent: (e: AcademyEnrollment) => Promise<void>
}) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'preview' | 'email'>('preview');
    
    // Email State
    const [subject, setSubject] = useState(`Your Certificate: ${course.title}`);
    const [body, setBody] = useState(`Dear ${enrollment.studentName},

Congratulations on successfully completing ${course.title}!

Please find your official certificate attached.

Warm regards,
Structura Academy`);

    const handleSend = async () => {
        // Mock sending
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1500)),
            {
                loading: 'Sending certificate...',
                success: 'Certificate sent successfully!',
                error: 'Failed to send'
            }
        );
        await onSent(enrollment);
        setOpen(false);
        setMode('preview'); // Reset
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm"
                    className={enrollment.certificateIssued ? "text-green-600" : "text-gray-500"}
                >
                    <Award className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className={mode === 'preview' ? "max-w-4xl" : "max-w-xl"}>
                
                {mode === 'preview' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-display">
                                Certificate Preview
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-sans font-normal uppercase tracking-wider">
                                    {course.certificationType}
                                </span>
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="py-4 bg-gray-100 p-4 rounded-md overflow-hidden flex justify-center">
                             {/* Certificate Preview Visual */}
                             <div className="bg-[#F7F5F2] w-[800px] aspect-[1.414/1] relative p-12 text-center border-8 border-double border-charcoal/10 shadow-lg text-charcoal flex flex-col justify-between" id="certificate-preview">
                                
                                {/* Corner Accents */}
                                <div className="absolute top-4 left-4 w-16 h-16 border-t border-l border-gold" />
                                <div className="absolute top-4 right-4 w-16 h-16 border-t border-r border-gold" />
                                <div className="absolute bottom-4 left-4 w-16 h-16 border-b border-l border-gold" />
                                <div className="absolute bottom-4 right-4 w-16 h-16 border-b border-r border-gold" />

                                <div className="space-y-2 mt-8">
                                    <div className="text-gold uppercase tracking-[0.3em] text-sm font-semibold">Structura Academy</div>
                                    <h1 className="text-4xl font-display uppercase tracking-widest text-charcoal">Certificate of {course.certificationType === 'Diploma' ? 'Diploma' : 'Completion'}</h1>
                                </div>

                                <div className="space-y-6 my-auto">
                                    <p className="text-gray-500 italic font-serif text-lg">This is to certify that</p>
                                    <h2 className="text-5xl font-display text-charcoal">{enrollment.studentName}</h2>
                                    <p className="text-gray-500 italic font-serif text-lg">has successfully completed the course</p>
                                    <h3 className="text-3xl font-display text-gold">{course.title}</h3>
                                    
                                    {course.isAccredited && course.accreditingBody && (
                                        <div className="pt-4">
                                            <span className="inline-block px-4 py-1 border border-charcoal/20 text-xs uppercase tracking-widest">
                                                Accredited by {course.accreditingBody}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-8 items-end mt-8">
                                    <div className="text-center">
                                         <div className="border-t border-charcoal/20 pt-2">
                                            <p className="font-display text-lg">Monique Structura</p>
                                            <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Director of Education</p>
                                         </div>
                                    </div>
                                    <div className="text-center pb-2">
                                        <div className="w-16 h-16 mx-auto border border-gold rounded-full flex items-center justify-center">
                                            <Award className="w-8 h-8 text-gold" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                         <div className="border-t border-charcoal/20 pt-2">
                                            <p className="font-serif text-lg">{new Date().toLocaleDateString()}</p>
                                            <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Date Issued</p>
                                         </div>
                                    </div>
                                </div>
                                
                                <div className="absolute bottom-2 right-4 text-[8px] text-gray-300 uppercase tracking-widest font-sans">
                                    ID: {enrollment.id.slice(0, 8).toUpperCase()}
                                </div>

                             </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => toast.info('Printing...')}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                            <Button variant="outline" onClick={() => toast.info('Downloading PDF...')}><Download className="w-4 h-4 mr-2" /> Download PDF</Button>
                            <Button className="bg-charcoal text-white" onClick={() => setMode('email')}>
                                <Mail className="w-4 h-4 mr-2" /> Send Certificate
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Send Certificate</DialogTitle>
                            <DialogDescription>
                                Compose the email to be sent to {enrollment.studentEmail}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Recipient</Label>
                                <Input disabled value={enrollment.studentEmail} />
                            </div>
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea 
                                    rows={8} 
                                    value={body} 
                                    onChange={(e) => setBody(e.target.value)}
                                    className="font-sans" 
                                />
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 flex items-center gap-3">
                                <div className="bg-red-100 text-red-600 p-2 rounded">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Certificate_{enrollment.studentName.replace(/\s+/g, '_')}.pdf</p>
                                    <p className="text-xs text-gray-500">2.4 MB • PDF Document</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setMode('preview')}>Back</Button>
                            <Button onClick={handleSend} className="bg-charcoal text-white">Send Email</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
