import React, { useCallback, useEffect, useState } from 'react';
import { Users, BookOpen, Activity, BarChart3, X, Loader2, Database, RefreshCw, BrainCircuit, AlertTriangle, CheckCircle, XCircle, FileQuestion } from 'lucide-react';
import {
    dashboardApi,
    chatApi,
    moodleApi,
    studentApi,
    teacherApi,
    type DashboardAnalytics,
    type MoodleCourse,
    type StudentProfile,
    type StudentAnalytics,
    type PendingQuiz
} from '../api/client';

interface LearningPathWeaknessDetail {
    topic: string;
    average_score: number;
    severity: 'high' | 'medium';
    quizzes: { name: string; score: number }[];
}

interface LearningPath {
    status: string;
    message?: string;
    weaknesses?: string[];
    weakness_details?: LearningPathWeaknessDetail[];
    study_plan?: string;
    recommendations?: string[];
    pinned_recommendations?: string[];
}

interface KnowledgeBaseSource {
    name: string;
    type: string;
    chunks: number;
}

interface KnowledgeBaseData {
    course_id: number;
    document_count: number;
    sources: KnowledgeBaseSource[];
}

interface TeacherDashboardProps {
    initialCourseId?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ initialCourseId }) => {
    const [courseId, setCourseId] = useState(initialCourseId || 101);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [courses, setCourses] = useState<MoodleCourse[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
    const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
    const [isLoadingPath, setIsLoadingPath] = useState(false);
    const [pinnedRecommendations, setPinnedRecommendations] = useState<string[]>([]);
    const [newRecommendation, setNewRecommendation] = useState<string>('');

    // Knowledge Base State
    const [isKbOpen, setIsKbOpen] = useState(false);
    const [kbData, setKbData] = useState<KnowledgeBaseData | null>(null);
    const [isLoadingKb, setIsLoadingKb] = useState(false);
    const [isClearingKb, setIsClearingKb] = useState(false);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileStudent, setProfileStudent] = useState<{ id: number; name: string } | null>(null);
    const [profileForm, setProfileForm] = useState<{ learningStyle: string; strengths: string; weaknesses: string }>({
        learningStyle: 'General',
        strengths: '',
        weaknesses: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Quiz Management State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'quizzes'>('dashboard');
    const [pendingQuizzes, setPendingQuizzes] = useState<PendingQuiz[]>([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [generateTopic, setGenerateTopic] = useState('');

    useEffect(() => {
        if (initialCourseId) {
            setCourseId(initialCourseId);
        } else {
            const fetchCourses = async () => {
                try {
                    const data = await moodleApi.getCourses();
                    setCourses(data);
                    if (data.length > 0 && !data.find(c => c.id === courseId)) {
                        setCourseId(data[0].id);
                    }
                } catch (error) {
                    console.error("Failed to fetch courses", error);
                }
            };
            fetchCourses();
        }
    }, [initialCourseId, courseId]);

    const loadDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await dashboardApi.getAnalytics(courseId);
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const loadPendingQuizzes = useCallback(async () => {
        try {
            setIsLoadingQuizzes(true);
            const data = await teacherApi.getPendingQuizzes(courseId);
            setPendingQuizzes(data);
        } catch (error) {
            console.error("Failed to load pending quizzes", error);
        } finally {
            setIsLoadingQuizzes(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (activeTab === 'quizzes') {
            loadPendingQuizzes();
        }
    }, [activeTab, loadPendingQuizzes]);

    const handleApproveQuiz = async (quizId: string) => {
        try {
            await teacherApi.approveQuiz(courseId, quizId);
            setPendingQuizzes(prev => prev.filter(q => q.id !== quizId));
        } catch {
            alert("Failed to approve quiz");
        }
    };

    const handleRejectQuiz = async (quizId: string) => {
        try {
            await teacherApi.rejectQuiz(courseId, quizId);
            setPendingQuizzes(prev => prev.filter(q => q.id !== quizId));
        } catch {
            alert("Failed to reject quiz");
        }
    };

    const handleGenerateQuizzes = async () => {
        if (!generateTopic) return;
        try {
            setIsLoadingQuizzes(true);
            // Generate 3 candidates at a time
            await teacherApi.generateQuizCandidates(courseId, generateTopic, 3);
            await loadPendingQuizzes();
            setGenerateTopic('');
        } catch {
            alert("Failed to generate quizzes");
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const handleViewPlan = async (studentId: number, studentName: string) => {
        setSelectedStudent({ id: studentId, name: studentName });
        setLearningPath(null);
        setIsLoadingPath(true);
        setPinnedRecommendations([]);
        setNewRecommendation('');

        try {
            const data = await chatApi.getLearningPath(courseId, studentId);
            setLearningPath(data);
            setPinnedRecommendations(data.pinned_recommendations || []);
        } catch (error) {
            console.error("Failed to fetch learning path", error);
        } finally {
            setIsLoadingPath(false);
        }
    };

    const closeModal = () => {
        setSelectedStudent(null);
        setLearningPath(null);
        setPinnedRecommendations([]);
        setNewRecommendation('');
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const data = await dashboardApi.syncAnalytics(courseId);
            setAnalytics(data);
        } catch (error: unknown) {
            console.error("Failed to sync analytics:", error);
            const err = error as { response?: { data?: { detail?: string } }; message?: string };
            const detail = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to sync analytics: ${detail}`);
        } finally {
            setIsSyncing(false);
        }
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

    const handleClearKb = async () => {
        if (!courseId) return;
        const confirmed = window.confirm('Clear all ingested knowledge base content for this course?');
        if (!confirmed) return;
        try {
            setIsClearingKb(true);
            await chatApi.clearKnowledgeBase(courseId);
            setKbData({
                course_id: courseId,
                document_count: 0,
                sources: []
            });
        } catch (error) {
            console.error('Failed to clear knowledge base', error);
            alert('Failed to clear knowledge base.');
        } finally {
            setIsClearingKb(false);
        }
    };

    const handleEditProfile = async (studentId: number, studentName: string) => {
        setProfileStudent({ id: studentId, name: studentName });
        try {
            const profile: StudentProfile = await studentApi.getProfile(studentId);
            setProfileForm({
                learningStyle: profile.learning_style || 'General',
                strengths: (profile.strengths || []).join(', '),
                weaknesses: (profile.weaknesses || []).join(', ')
            });
            setIsProfileModalOpen(true);
        } catch (error) {
            console.error('Failed to load student profile', error);
            alert('Failed to load student profile.');
        }
    };

    const handleSaveProfile = async () => {
        if (!profileStudent) return;
        try {
            setIsSavingProfile(true);
            const strengths = profileForm.strengths
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            const weaknesses = profileForm.weaknesses
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            const updated = await studentApi.updateProfile(profileStudent.id, {
                learning_style: profileForm.learningStyle,
                strengths,
                weaknesses
            });
            setAnalytics(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    students: prev.students.map((s: StudentAnalytics) =>
                        s.id === profileStudent.id
                            ? { ...s, learning_style: updated.learning_style }
                            : s
                    )
                };
            });
            setIsProfileModalOpen(false);
        } catch (error) {
            console.error('Failed to save student profile', error);
            alert('Failed to save student profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleIngest = async () => {
        if (!courseId) return;
        setIsIngesting(true);
        try {
            setIsIngesting(true);
            await chatApi.ingestCourse(courseId);
            alert("Course content (including files) ingested successfully!");
        } catch (error: unknown) {
            console.error("Failed to ingest course", error);
            const err = error as { response?: { data?: { detail?: string } }; message?: string };
            const detail =
                err?.response?.data?.detail ||
                err?.message ||
                "Unknown error";
            alert(`Failed to ingest course content: ${detail}`);
        } finally {
            setIsIngesting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 sm:max-w-6xl sm:mx-auto sm:border-x sm:border-gray-200">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                            <p className="text-sm text-gray-500">Monitor student progress and AI interactions</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
                                isSyncing 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Data'}
                        </button>

                        <button
                            onClick={handleViewKb}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
                        >
                            <BookOpen className="w-4 h-4" />
                            View Knowledge Base
                        </button>

                        <button
                            onClick={handleIngest}
                            disabled={isIngesting}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
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

                <div className="flex gap-4 border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'dashboard' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('quizzes')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'quizzes' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Pending Quizzes
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6">
                {activeTab === 'quizzes' ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">AI Question Generator</h2>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={generateTopic}
                                    onChange={(e) => setGenerateTopic(e.target.value)}
                                    placeholder="Enter a topic (e.g., 'Python Functions', 'Course Introduction')"
                                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                    onClick={handleGenerateQuizzes}
                                    disabled={isLoadingQuizzes || !generateTopic}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoadingQuizzes ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                                    Generate Candidates
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileQuestion className="w-5 h-5 text-gray-500" />
                                Pending Review ({pendingQuizzes.length})
                            </h2>
                            
                            {isLoadingQuizzes && pendingQuizzes.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">Loading quizzes...</div>
                            ) : pendingQuizzes.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-xl border border-gray-200 text-gray-500">
                                    No pending quizzes. Generate some above!
                                </div>
                            ) : (
                                pendingQuizzes.map((quiz) => (
                                    <div key={quiz.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md mb-2 font-medium">
                                                    {quiz.topic}
                                                </span>
                                                <h3 className="text-lg font-medium text-gray-900">{quiz.question}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApproveQuiz(quiz.id)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectQuiz(quiz.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {quiz.options.map((option, idx) => (
                                                <div 
                                                    key={idx}
                                                    className={`p-3 rounded-lg border text-sm ${
                                                        option === quiz.correct_answer
                                                        ? 'bg-green-50 border-green-200 text-green-800 font-medium'
                                                        : 'bg-gray-50 border-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {option}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex gap-2">
                                                <span className="font-semibold text-gray-700">Explanation:</span>
                                                <span className="text-gray-600">{quiz.explanation}</span>
                                            </div>
                                            {quiz.hint && (
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-gray-700">Hint:</span>
                                                    <span className="text-gray-600 italic">{quiz.hint}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                isLoading ? (
                    <div className="text-center py-20 text-gray-500">Loading analytics...</div>
                ) : analytics ? (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Students</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.total_students}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <Activity className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Active Students</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.active_students ?? analytics.students.filter(s => s.avg_score > 0).length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <BrainCircuit className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Class Average</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.average_score}%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">At Risk</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {analytics.students?.filter((s: StudentAnalytics) => {
                                                if (s.risk_level) return s.risk_level === 'at_risk';
                                                return (Number(s.avg_score) || 0) < 50;
                                            }).length || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Weaknesses */}
                        {analytics.top_weaknesses && analytics.top_weaknesses.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    Common Struggle Areas
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analytics.top_weaknesses.map((w, idx) => (
                                        <div key={idx} className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex justify-between items-center">
                                            <span className="font-medium text-orange-800 text-sm truncate" title={w.topic}>{w.topic}</span>
                                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-orange-600 border border-orange-100">
                                                {w.count} students
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Student List */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">Student Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b text-gray-500 text-sm">
                                            <th className="px-6 pb-3">Student Name</th>
                                            <th className="px-6 pb-3">Learning Style</th>
                                            <th className="px-6 pb-3">Avg Score</th>
                                            <th className="px-6 pb-3">Status</th>
                                            <th className="px-6 pb-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {analytics.students?.map((student: StudentAnalytics) => (
                                            <tr key={student.id} className="group hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    {student.name}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${
                                                            (student.learning_style as string) === 'Visual'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : (student.learning_style as string) === 'Auditory'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : (student.learning_style as string) === 'Textual'
                                                                ? 'bg-indigo-100 text-indigo-800'
                                                                : (student.learning_style as string) === 'Kinesthetic'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {String(student.learning_style || 'General')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{student.avg_score}%</div>
                                                    <div className="mt-1 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${Math.max(0, Math.min(100, Number(student.avg_score) || 0))}%` }}
                                                        />
                                                    </div>
                                                    {student.quiz_scores && Object.keys(student.quiz_scores).length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                                                            {/* Separate Moodle and AI scores */}
                                                            {(() => {
                                                                const scores = Object.entries(student.quiz_scores);
                                                                const moodleScores = scores.filter(([k]) => !k.startsWith('[AI]'));
                                                                const aiScores = scores.filter(([k]) => k.startsWith('[AI]'));
                                                                
                                                                // Calculate average for AI quizzes if many
                                                                const aiAvg = aiScores.length > 0 
                                                                    ? aiScores.reduce((acc, [, val]) => acc + Number(val), 0) / aiScores.length 
                                                                    : 0;

                                                                return (
                                                                    <>
                                                                        {moodleScores.map(([quiz, score]) => (
                                                                            <div key={quiz} className="flex justify-between gap-2">
                                                                                <span className="font-medium text-gray-600 truncate max-w-[150px]" title={quiz}>{quiz}:</span>
                                                                                <span>{String(score)}%</span>
                                                                            </div>
                                                                        ))}
                                                                        
                                                                        {aiScores.length > 0 && (
                                                                            <div className="mt-1 pt-1 border-t border-gray-100">
                                                                                <div className="flex justify-between gap-2 text-indigo-600 font-medium">
                                                                                    <span>AI Pop Quizzes ({aiScores.length}):</span>
                                                                                    <span>{Math.round(aiAvg)}% Avg</span>
                                                                                </div>
                                                                                {/* Collapsible detail could go here, but let's keep it simple for now */}
                                                                                <div className="text-[10px] text-gray-400 pl-2 border-l-2 border-indigo-100 mt-0.5">
                                                                                    Last: {aiScores[aiScores.length-1][1]}%
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    {(() => {
                                                        const score = Number(student.avg_score) || 0;
                                                        const risk = student.risk_level;
                                                        const reasons = (student.risk_reasons || []).join(' ');

                                                        let label = "At Risk";
                                                        let classes = "bg-red-50 text-red-700 border-red-200";

                                                        if (risk === 'no_data') {
                                                            label = "No Data";
                                                            classes = "bg-gray-50 text-gray-700 border-gray-200";
                                                        } else if (risk === 'on_track') {
                                                            label = "On Track";
                                                            classes = "bg-green-50 text-green-700 border-green-200";
                                                        } else if (risk === 'needs_support') {
                                                            label = "Needs Support";
                                                            classes = "bg-yellow-50 text-yellow-700 border-yellow-200";
                                                        } else if (risk === 'at_risk') {
                                                            label = "At Risk";
                                                            classes = "bg-red-50 text-red-700 border-red-200";
                                                        } else {
                                                            if (score >= 80) {
                                                                label = "On Track";
                                                                classes = "bg-green-50 text-green-700 border-green-200";
                                                            } else if (score >= 50) {
                                                                label = "Needs Support";
                                                                classes = "bg-yellow-50 text-yellow-700 border-yellow-200";
                                                            }
                                                        }

                                                        return (
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${classes}`}
                                                                title={reasons || undefined}
                                                            >
                                                                {label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <button 
                                                        onClick={() => handleViewPlan(student.id, student.name)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        View Plan
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditProfile(student.id, student.name)}
                                                        className="ml-4 text-sm text-gray-600 hover:text-gray-900"
                                                    >
                                                        Edit Profile
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
                ))}
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

                                    {learningPath.weakness_details && learningPath.weakness_details.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance by Topic</h4>
                                            <div className="space-y-2">
                                                {learningPath.weakness_details.map((w) => (
                                                    <div key={w.topic} className="flex items-start justify-between text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{w.topic}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {w.quizzes.map(q => `${q.name}: ${q.score}%`).join(' • ')}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-semibold text-gray-900">{w.average_score}%</span>
                                                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                w.severity === 'high'
                                                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                            }`}>
                                                                {w.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                                            </span>
                                                        </div>
                                                    </div>
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

                                    {pinnedRecommendations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                Teacher Pinned Recommendations
                                            </h4>
                                            <ul className="space-y-2">
                                                {pinnedRecommendations.map((rec) => (
                                                    <li key={rec} className="flex items-start gap-3 text-sm text-gray-700">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900">{rec}</div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {learningPath.recommendations && learningPath.recommendations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Steps</h4>
                                            <ul className="space-y-2">
                                                {learningPath.recommendations.map((rec: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                            <span>{rec}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                                            onClick={async () => {
                                                                if (!selectedStudent) return;
                                                                const updated = Array.from(new Set([...pinnedRecommendations, rec]));
                                                                setPinnedRecommendations(updated);
                                                                try {
                                                                    await dashboardApi.setLearningPathOverrides(
                                                                        selectedStudent.id,
                                                                        courseId,
                                                                        updated
                                                                    );
                                                                } catch (error) {
                                                                    console.error('Failed to save pinned recommendation', error);
                                                                }
                                                            }}
                                                        >
                                                            Pin
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            Add Teacher Recommendation
                                        </h4>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                value={newRecommendation}
                                                onChange={(e) => setNewRecommendation(e.target.value)}
                                                placeholder="E.g., Schedule a 1:1 review on Topic 1 this week"
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                disabled={!newRecommendation.trim() || !selectedStudent}
                                                onClick={async () => {
                                                    if (!selectedStudent) return;
                                                    const trimmed = newRecommendation.trim();
                                                    if (!trimmed) return;
                                                    const updated = Array.from(new Set([...pinnedRecommendations, trimmed]));
                                                    setPinnedRecommendations(updated);
                                                    setNewRecommendation('');
                                                    try {
                                                        await dashboardApi.setLearningPathOverrides(
                                                            selectedStudent.id,
                                                            courseId,
                                                            updated
                                                        );
                                                    } catch (error) {
                                                        console.error('Failed to save teacher recommendation', error);
                                                    }
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
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
                                                        {kbData.sources.map((source: KnowledgeBaseSource, i: number) => (
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
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                            <button
                                onClick={handleClearKb}
                                disabled={isClearingKb}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    isClearingKb
                                        ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed'
                                        : 'bg-white border-red-300 text-red-600 hover:bg-red-50'
                                }`}
                            >
                                {isClearingKb ? 'Clearing...' : 'Clear Knowledge Base'}
                            </button>
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

            {isProfileModalOpen && profileStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Edit Student Profile</h3>
                                <p className="text-sm text-gray-500">{profileStudent.name}</p>
                            </div>
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Learning Style</label>
                                <select
                                    value={profileForm.learningStyle}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, learningStyle: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="General">General</option>
                                    <option value="Visual">Visual</option>
                                    <option value="Textual">Textual</option>
                                    <option value="Auditory">Auditory</option>
                                    <option value="Kinesthetic">Kinesthetic</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Strengths (comma separated)</label>
                                <input
                                    type="text"
                                    value={profileForm.strengths}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, strengths: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Weaknesses (comma separated)</label>
                                <input
                                    type="text"
                                    value={profileForm.weaknesses}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, weaknesses: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isSavingProfile ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors`}
                            >
                                {isSavingProfile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
