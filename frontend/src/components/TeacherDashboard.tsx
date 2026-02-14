import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Activity, BarChart3, X, Loader2, Database, RefreshCw } from 'lucide-react';
import { dashboardApi, chatApi, moodleApi, type DashboardAnalytics, type MoodleCourse } from '../api/client';

interface TeacherDashboardProps {
    initialCourseId?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ initialCourseId }) => {
    const [courseId, setCourseId] = useState(initialCourseId || 101);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [courses, setCourses] = useState<MoodleCourse[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<{id: number, name: string} | null>(null);
    const [learningPath, setLearningPath] = useState<any | null>(null);
    const [isLoadingPath, setIsLoadingPath] = useState(false);

    // Knowledge Base State
    const [isKbOpen, setIsKbOpen] = useState(false);
    const [kbData, setKbData] = useState<any | null>(null);
    const [isLoadingKb, setIsLoadingKb] = useState(false);

    useEffect(() => {
        if (initialCourseId) {
            setCourseId(initialCourseId);
        } else {
            // Fetch available courses if not provided via props
            const fetchCourses = async () => {
                try {
                    const data = await moodleApi.getCourses();
                    setCourses(data);
                    // Default to first course if available and current courseId is not in list (optional logic)
                    if (data.length > 0 && !data.find(c => c.id === courseId)) {
                        setCourseId(data[0].id);
                    }
                } catch (error) {
                    console.error("Failed to fetch courses", error);
                }
            };
            fetchCourses();
        }
    }, [initialCourseId]);

    useEffect(() => {
        loadDashboard();
    }, [courseId]);

    const handleViewPlan = async (studentId: number, studentName: string) => {
        setSelectedStudent({ id: studentId, name: studentName });
        setLearningPath(null);
        setIsLoadingPath(true);

        try {
            const data = await chatApi.getLearningPath(courseId, studentId);
            setLearningPath(data);
        } catch (error) {
            console.error("Failed to fetch learning path", error);
        } finally {
            setIsLoadingPath(false);
        }
    };

    const closeModal = () => {
        setSelectedStudent(null);
        setLearningPath(null);
    };

    const handleViewKb = async () => {
        setIsKbOpen(true);
        setIsLoadingKb(true);
        try {
            const data = await chatApi.getKnowledgeBase(courseId);
            setKbData(data);
        } catch (error) {
            console.error("Failed to load knowledge base", error);
        } finally {
            setIsLoadingKb(false);
        }
    };

    const closeKbModal = () => {
        setIsKbOpen(false);
        setKbData(null);
    };

    const loadDashboard = async () => {
        try {
            setIsLoading(true);
            const data = await dashboardApi.getAnalytics(courseId);
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIngest = async () => {
        if (!courseId) return;
        setIsIngesting(true);
        try {
            await chatApi.ingestCourse(courseId);
            alert("Course content (including files) ingested successfully!");
        } catch (error) {
            console.error("Failed to ingest course", error);
            alert("Failed to ingest course content.");
        } finally {
            setIsIngesting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-6xl mx-auto bg-gray-50 border-x border-gray-200">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                            <p className="text-sm text-gray-500">Monitor student progress and AI interactions</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleViewKb}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <BookOpen className="w-4 h-4" />
                            View Knowledge Base
                        </button>

                        <button
                            onClick={handleIngest}
                            disabled={isIngesting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isIngesting 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {isIngesting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Database className="w-4 h-4" />
                            )}
                            {isIngesting ? 'Ingesting...' : 'Ingest Course'}
                        </button>

                        {!initialCourseId && (
                            <select 
                                value={courseId}
                                onChange={(e) => setCourseId(Number(e.target.value))}
                                className="p-2 border rounded-md text-sm bg-white shadow-sm"
                            >
                                {courses.length > 0 ? (
                                    courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.fullname} (ID: {course.id})
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value={101}>Intro to AI (Course 101)</option>
                                        <option value={102}>Advanced Python (Course 102)</option>
                                    </>
                                )}
                            </select>
                        )}
                        
                        {initialCourseId && (
                             <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                <BookOpen className="w-4 h-4 text-gray-500" />
                                <span>Course {courseId}</span>
                             </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="text-center py-20 text-gray-500">Loading analytics...</div>
                ) : analytics ? (
                    <div className="space-y-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Users className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Students</p>
                                        <p className="text-2xl font-bold text-gray-900">{analytics.total_students}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <Activity className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Class Average Score</p>
                                        <p className="text-2xl font-bold text-gray-900">{analytics.average_score}%</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 rounded-lg">
                                        <BookOpen className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Active Course</p>
                                        <p className="text-lg font-bold text-gray-900">ID: {analytics.course_id}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student List */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">Student Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b text-gray-500 text-sm">
                                            <th className="pb-3">Student Name</th>
                                            <th className="pb-3">Learning Style</th>
                                            <th className="pb-3">Avg Score</th>
                                            <th className="pb-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {analytics.students?.map((student: any) => (
                                            <tr key={student.id} className="group hover:bg-gray-50">
                                                <td className="py-3 font-medium">{student.name}</td>
                                                <td className="py-3 text-sm text-gray-600">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        (student.learning_style as string) === 'Visual' ? 'bg-blue-100 text-blue-800' :
                                                        (student.learning_style as string) === 'Auditory' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {String(student.learning_style)}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-sm">
                                                    {student.avg_score}%
                                                    {student.quiz_scores && Object.keys(student.quiz_scores).length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {Object.entries(student.quiz_scores).map(([quiz, score]) => (
                                                                <div key={quiz}>{quiz}: {String(score)}%</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    <button 
                                                        onClick={() => handleViewPlan(student.id, student.name)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        View Plan
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">No data available</div>
                )}
            </div>

            {/* Learning Path Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Personalized Learning Path</h3>
                                <p className="text-sm text-gray-500">For {selectedStudent.name}</p>
                            </div>
                            <button 
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {isLoadingPath ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    <p>Generating personalized plan...</p>
                                </div>
                            ) : learningPath ? (
                                <div className="space-y-6">
                                    {learningPath.status === 'start' && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <h4 className="font-semibold text-blue-900 mb-2">👋 Welcome!</h4>
                                            <p className="text-blue-800 text-sm">{learningPath.message}</p>
                                        </div>
                                    )}
                                    
                                    {learningPath.status === 'on_track' && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <h4 className="font-semibold text-green-900 mb-2">🌟 Great Progress!</h4>
                                            <p className="text-green-800 text-sm">{learningPath.message}</p>
                                        </div>
                                    )}

                                    {learningPath.weaknesses && learningPath.weaknesses.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identified Weaknesses</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {learningPath.weaknesses.map((w: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {learningPath.study_plan && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Study Plan</h4>
                                            <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap font-sans">
                                                {learningPath.study_plan}
                                            </div>
                                        </div>
                                    )}

                                    {learningPath.recommendations && learningPath.recommendations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Steps</h4>
                                            <ul className="space-y-2">
                                                {learningPath.recommendations.map((rec: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Failed to load learning path.
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Knowledge Base Modal */}
            {isKbOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Course Knowledge Base</h3>
                                <p className="text-sm text-gray-500">Ingested content available for AI</p>
                            </div>
                            <button 
                                onClick={closeKbModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {isLoadingKb ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    <p>Loading knowledge base...</p>
                                </div>
                            ) : kbData ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <Database className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Documents</p>
                                            <p className="text-2xl font-bold text-gray-900">{kbData.document_count} Chunks</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sources</h4>
                                        {kbData.sources && kbData.sources.length > 0 ? (
                                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {kbData.sources.map((source: any, i: number) => (
                                                            <tr key={i} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{source.name}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{source.type}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 text-right">{source.chunks}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                No content found. Try ingesting the course.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Failed to load knowledge base.
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button 
                                onClick={closeKbModal}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
