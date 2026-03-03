import React, { useState } from 'react';
import { CourseManager } from '../../components/admin/academy/CourseManager';
import { SessionManager } from '../../components/admin/academy/SessionManager';
import { InstructorManager } from '../../components/admin/academy/InstructorManager';
import { EnrollmentManager } from '../../components/admin/academy/EnrollmentManager';
import { AssessmentManager } from '../../components/admin/academy/AssessmentManager';
import { cn } from '../../../lib/utils';

type Tab = 'courses' | 'sessions' | 'instructors' | 'enrollments' | 'assessments';

export default function AdminAcademy() {
  const [activeTab, setActiveTab] = useState<Tab>('courses');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'courses', label: 'Courses' },
    { id: 'sessions', label: 'Sessions & Intakes' },
    { id: 'instructors', label: 'Instructors' },
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'assessments', label: 'Assessments' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-display font-medium text-charcoal">Academy Management</h1>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'courses' && <CourseManager />}
        {activeTab === 'sessions' && <SessionManager />}
        {activeTab === 'instructors' && <InstructorManager />}
        {activeTab === 'enrollments' && <EnrollmentManager />}
        {activeTab === 'assessments' && <AssessmentManager />}
      </div>
    </div>
  );
}
