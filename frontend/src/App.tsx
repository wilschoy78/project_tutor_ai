import { useState } from 'react'
import { ChatInterface } from './components/ChatInterface'
import { TeacherDashboard } from './components/TeacherDashboard'
import { GraduationCap, LayoutDashboard } from 'lucide-react'

function App() {
  const [view, setView] = useState<'student' | 'teacher'>(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    if (role === 'teacher') {
      return 'teacher';
    }
    return 'student';
  });
  const [context] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const courseIdParam = params.get('courseId') || params.get('courseid');
    const studentIdParam = params.get('studentId') || params.get('studentid');
    return {
      courseId: courseIdParam ? parseInt(courseIdParam) : 101,
      studentId: studentIdParam ? parseInt(studentIdParam) : 1,
    };
  });
  const [roleEnforced] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    return role === 'teacher' || role === 'student';
  });

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
