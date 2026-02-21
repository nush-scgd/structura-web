import React, { useState, useEffect } from 'react';
import { db, AcademyEnrollment, Certificate, Course } from '../../../lib/db';
import { Button } from '../../components/ui/button';
import { Award, Download, Eye, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StudentCertificates() {
  const [loading, setLoading] = useState(true);
  const [issued, setIssued] = useState<{cert: Certificate, course: Course, enroll: AcademyEnrollment}[]>([]);
  const [pending, setPending] = useState<{enroll: AcademyEnrollment, course: Course}[]>([]);

  useEffect(() => {
    async function loadCertificates() {
      const studentEmail = "student@structura.academy";
      // Mock Student ID
      const studentId = "student_123"; 

      const [enrollments, certificates, courses] = await Promise.all([
        db.getStudentEnrollments(studentEmail),
        db.getCertificates(studentId),
        db.getCourses()
      ]);

      // Process Issued
      const issuedList = certificates.map(cert => {
         const enroll = enrollments.find(e => e.id === cert.enrollmentId);
         const course = courses.find(c => c.id === cert.courseId);
         return { cert, course, enroll };
      }).filter(i => i.course && i.enroll) as any[];

      setIssued(issuedList);

      // Process Pending (Passed but no certificate record)
      const pendingList = enrollments.filter(e => {
         const hasCert = certificates.some(c => c.enrollmentId === e.id);
         return e.passed && !hasCert && !e.certificateIssued;
      }).map(e => {
         const course = courses.find(c => c.id === e.courseId);
         return { enroll: e, course };
      }).filter(p => p.course) as any[];

      setPending(pendingList);
      setLoading(false);
    }
    loadCertificates();
  }, []);

  const handleDownload = (certId: string) => {
      toast.success("Downloading Certificate...");
      // In real app, trigger download of PDF URL
  };

  if (loading) return <div className="p-12 text-center text-gray-400 font-serif animate-pulse">Loading Certificates...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display text-charcoal">My Certificates</h1>
        <p className="text-gray-500 font-serif mt-2">View and download your earned credentials.</p>
      </div>

      <div className="space-y-8">
         {/* Issued Certificates */}
         <section>
            <h2 className="text-xl font-display mb-6 flex items-center gap-2">
               <Award className="w-5 h-5 text-gold" /> Issued Credentials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {issued.length > 0 ? (
                 issued.map(({ cert, course, enroll }) => (
                   <div key={cert.id} className="group relative bg-white border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-500 overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-gold/10 transition-colors" />
                      
                      <div className="relative z-10">
                         <div className="mb-6">
                            <span className="text-[10px] uppercase tracking-widest border border-gold/30 text-gold px-2 py-1 rounded-sm">
                               {cert.type}
                            </span>
                         </div>
                         <h3 className="text-2xl font-display mb-2 group-hover:text-gold transition-colors">{course.title}</h3>
                         <p className="text-sm text-gray-400 mb-6 uppercase tracking-wider">Issued: {format(new Date(cert.issuedAt), 'MMMM d, yyyy')}</p>
                         
                         <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(cert.id)} className="w-full group-hover:bg-charcoal group-hover:text-white transition-colors">
                               <Download className="w-4 h-4 mr-2" /> PDF
                            </Button>
                         </div>
                      </div>
                      
                      {/* ID watermark */}
                      <div className="absolute bottom-4 right-4 text-[8px] text-gray-200 font-mono">
                         ID: {cert.number}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="col-span-full p-12 text-center bg-gray-50/50 border border-dashed border-gray-200">
                    <p className="text-gray-400">No certificates issued yet.</p>
                 </div>
               )}
            </div>
         </section>

         {/* Pending Certificates */}
         {pending.length > 0 && (
             <section className="opacity-70">
                <h2 className="text-xl font-display mb-6 flex items-center gap-2 text-gray-500">
                   <Clock className="w-5 h-5" /> Pending Issuance
                </h2>
                <div className="space-y-4">
                   {pending.map(({ enroll, course }) => (
                      <div key={enroll.id} className="bg-gray-50 border border-gray-100 p-4 flex items-center justify-between">
                         <div>
                            <h4 className="font-medium text-gray-700">{course.title}</h4>
                            <p className="text-xs text-gray-400">Completed on {format(new Date(enroll.enrolledAt), 'MMM d, yyyy')}</p>
                         </div>
                         <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Processing</span>
                      </div>
                   ))}
                </div>
             </section>
         )}
      </div>
    </div>
  );
}
