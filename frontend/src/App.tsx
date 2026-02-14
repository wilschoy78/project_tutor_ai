import { useState, useEffect } from 'react'
import { ChatInterface } from './components/ChatInterface'
import { TeacherDashboard } from './components/TeacherDashboard'
import { GraduationCap, LayoutDashboard } from 'lucide-react'

function App() {
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const [context, setContext] = useState({ courseId: 101, studentId: 1 });
  const [roleEnforced, setRoleEnforced] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Check both CamelCase and lowercase to be safe
    const courseId = params.get('courseId') || params.get('courseid');
    const studentId = params.get('studentId') || params.get('studentid');
    const role = params.get('role');
    
    if (courseId) {
        setContext(prev => ({ ...prev, courseId: parseInt(courseId) }));
    }
    if (studentId) {
        setContext(prev => ({ ...prev, studentId: parseInt(studentId) }));
    }
    if (role) {
        if (role === 'teacher') {
            setView('teacher');
            setRoleEnforced(true);
        } else if (role === 'student') {
            setView('student');
            setRoleEnforced(true);
        }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* View Switcher Header - Only show if role is not enforced */}
      {!roleEnforced && (
        <div className="bg-white p-2 shadow-sm border-b border-gray-200 flex justify-center gap-2 sticky top-0 z-50">
            <button 
            onClick={() => setView('student')}
            className={`flex-1 max-w-[200px] px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                view === 'student' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
            >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Student View</span>
            <span className="sm:hidden">Student</span>
            </button>
            <button 
            onClick={() => setView('teacher')}
            className={`flex-1 max-w-[200px] px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                view === 'teacher' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
            >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Teacher Dashboard</span>
            <span className="sm:hidden">Teacher</span>
            </button>
        </div>
      )}

      <div className="flex-1 relative">
        {view === 'student' ? (
          <ChatInterface initialCourseId={context.courseId} initialStudentId={context.studentId} />
        ) : (
          <TeacherDashboard initialCourseId={context.courseId} />
        )}
      </div>
    </div>
  )
}

export default App
